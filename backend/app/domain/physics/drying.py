"""Thin-layer drying integration over a waste-heat window.

The model is a lumped, single-layer Newton cooling analogue in dry-basis
moisture with an Arrhenius temperature dependence:

    dX/dt = -k(T) * (X - Xe(RH)),      k(T) = k_ref * exp(-Ea/R * (1/T - 1/Tref))

Drying is additionally limited by the heat actually available in each interval:
if the requested evaporation power exceeds the supplied heat, the step is
scaled back. Nothing here forecasts weather, pressure drop or airflow.
"""

from __future__ import annotations

from math import exp

from ..models import (
    Batch,
    Constraints,
    DryingPoint,
    Material,
    SchedulePhase,
    SimulationResult,
    ThermalProfile,
    ThermalSample,
)
from .mass_balance import (
    compute_mass_balance,
    moisture_lookup,
    wet_to_dry_basis,
)
from .psychrometrics import equilibrium_moisture_wb, latent_heat_vaporization_kj_per_kg

MODEL_VERSION = 'thin-layer-1.0'
REFERENCE_TEMPERATURE_K = 333.15
GAS_CONSTANT_J_PER_MOLK = 8.314
LATENT_UTILISATION = 0.55
SENSIBLE_FRACTION_OF_LATENT = 0.08
WATER_SPECIFIC_HEAT_J_PER_KGK = 4186.0
J_PER_KWH = 3_600_000.0


def rate_constant_per_hour(material: Material, temperature_c: float) -> float:
    """Arrhenius-corrected drying rate constant at a material temperature."""
    temperature_k = temperature_c + 273.15
    if temperature_k <= 0.0:
        raise ValueError('Temperature must be above absolute zero.')
    exponent = -material.activation_energy_j_per_mol / GAS_CONSTANT_J_PER_MOLK * (
        1.0 / temperature_k - 1.0 / REFERENCE_TEMPERATURE_K
    )
    return material.reference_rate_per_hour * exp(exponent)


def sample_at(profile: ThermalProfile, minute: int) -> ThermalSample:
    """The thermal window interval that covers a given minute."""
    if not profile.samples:
        raise ValueError('A thermal profile needs at least one sample.')
    chosen = profile.samples[0]
    for sample in profile.samples:
        if sample.minute <= minute:
            chosen = sample
        else:
            break
    return chosen


def schedule_temperature_c(
    phases: tuple[SchedulePhase, ...], minute: int
) -> float | None:
    """Setpoint for a minute, or None once the schedule has finished."""
    elapsed = 0
    for phase in phases:
        elapsed += phase.duration_minutes
        if minute < elapsed:
            return phase.temperature_c
    return None


def simulate(
    profile: ThermalProfile,
    batch: Batch,
    constraints: Constraints,
    phases: tuple[SchedulePhase, ...],
    step_minutes: int = 5,
    sample_interval_minutes: int = 60,
) -> SimulationResult:
    """Integrate a schedule against a thermal window and a batch."""
    if step_minutes <= 0:
        raise ValueError('Step size must be positive.')

    material = batch.material
    balance = compute_mass_balance(
        batch, material, constraints.max_temperature_c
    )
    dry_solids_kg = balance.dry_solids_kg
    current_dry_basis = wet_to_dry_basis(batch.initial_moisture_wb)
    target_dry_basis = wet_to_dry_basis(batch.target_moisture_wb)
    equilibrium_wb = equilibrium_moisture_wb(
        material.equilibrium_moisture_wb, constraints.max_relative_humidity
    )
    equilibrium_dry_basis = wet_to_dry_basis(min(equilibrium_wb, 0.9))

    points: list[DryingPoint] = []
    notes: list[str] = []
    water_removed_kg = 0.0
    energy_kwh = 0.0
    minute = 0
    previous_temperature_c = profile.samples[0].temperature_c
    heat_limited_steps = 0

    while minute < constraints.max_duration_minutes:
        setpoint = schedule_temperature_c(phases, minute)
        if setpoint is None:
            break

        sample = sample_at(profile, minute)
        temperature_c = min(
            setpoint,
            sample.temperature_c,
            constraints.max_temperature_c,
            material.max_safe_temperature_c,
        )
        if temperature_c < constraints.min_temperature_c:
            notes.append(
                'Available heat fell below the minimum usable temperature at '
                f'minute {minute}; drying stopped.'
            )
            break

        humidity = min(
            max(sample.relative_humidity, constraints.min_relative_humidity),
            constraints.max_relative_humidity,
        )
        step_hours = step_minutes / 60.0
        rate = rate_constant_per_hour(material, temperature_c)
        driving_force = max(0.0, current_dry_basis - equilibrium_dry_basis)
        delta_dry_basis = rate * driving_force * step_hours
        step_water_kg = delta_dry_basis * dry_solids_kg
        water_density = moisture_lookup(batch, material, water_removed_kg + step_water_kg)

        latent_kwh = step_water_kg * latent_heat_vaporization_kj_per_kg(
            temperature_c
        ) / 3600.0 / LATENT_UTILISATION
        sensible_kwh = (
            (
                dry_solids_kg * material.specific_heat_j_per_kgk
                + (batch.mass_kg - dry_solids_kg - water_removed_kg)
                * WATER_SPECIFIC_HEAT_J_PER_KGK
            )
            * abs(temperature_c - previous_temperature_c)
            / J_PER_KWH
        ) * SENSIBLE_FRACTION_OF_LATENT
        requested_kwh = latent_kwh + sensible_kwh
        requested_power_kw = requested_kwh / step_hours

        if requested_power_kw > sample.available_heat_kw:
            if requested_power_kw > 0.0:
                scale = sample.available_heat_kw / requested_power_kw
            else:
                scale = 0.0
            step_water_kg *= scale
            latent_kwh *= scale
            sensible_kwh *= scale
            heat_limited_steps += 1

        water_removed_kg += step_water_kg
        energy_kwh += latent_kwh + sensible_kwh
        current_dry_basis = max(
            equilibrium_dry_basis,
            current_dry_basis - step_water_kg / dry_solids_kg,
        )
        previous_temperature_c = temperature_c
        minute += step_minutes

        moisture_wb = moisture_lookup(batch, material, water_removed_kg)
        if (
            minute % sample_interval_minutes == 0
            or moisture_wb <= batch.target_moisture_wb
        ):
            points.append(
                DryingPoint(
                    minute=minute,
                    moisture_wb=moisture_wb,
                    temperature_c=temperature_c,
                    water_removed_kg=water_removed_kg,
                    energy_kwh=energy_kwh,
                )
            )
        if moisture_wb <= batch.target_moisture_wb:
            notes.append(
                f'Target moisture reached at minute {minute}.'
            )
            break
        if current_dry_basis <= target_dry_basis and water_density > 0:
            notes.append(f'Target moisture reached at minute {minute}.')
            break

    final_moisture_wb = moisture_lookup(batch, material, water_removed_kg)
    if heat_limited_steps:
        notes.append(
            'Heat availability limited evaporation in '
            f'{heat_limited_steps} of the integrated steps.'
        )
    if final_moisture_wb > batch.target_moisture_wb:
        notes.append(
            'Target moisture was not reached within the operating window.'
        )

    return SimulationResult(
        points=tuple(points),
        final_moisture_wb=final_moisture_wb,
        duration_minutes=minute,
        water_removed_kg=water_removed_kg,
        energy_kwh=energy_kwh,
        minimum_energy_kwh=balance.minimum_energy_kwh,
        model_version=MODEL_VERSION,
        notes=tuple(notes),
    )
