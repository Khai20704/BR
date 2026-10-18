"""Water and solids conservation for a single drying batch.

The identity enforced here is the backbone of the whole engine: dry solids are
conserved, water removed equals initial water minus final water, and the final
wet mass follows from those two quantities alone.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..models import Batch, Material
from .psychrometrics import latent_heat_vaporization_kj_per_kg

_J_PER_KWH = 3_600_000.0
_J_PER_KJ = 1_000.0


@dataclass(frozen=True, slots=True)
class MassBalance:
    """Closed-form water bookkeeping for one batch at one temperature."""

    dry_solids_kg: float
    initial_water_kg: float
    final_water_kg: float
    initial_mass_kg: float
    final_mass_kg: float
    water_to_remove_kg: float
    minimum_energy_kwh: float


def wet_to_dry_basis(moisture_wb: float) -> float:
    """Convert a wet-basis fraction to a dry-basis ratio (kg water/kg solids)."""
    if not 0.0 <= moisture_wb < 1.0:
        raise ValueError('Wet-basis moisture must satisfy 0 <= M < 1.')
    return moisture_wb / (1.0 - moisture_wb)


def dry_to_wet_basis(moisture_db: float) -> float:
    """Convert a dry-basis ratio to a wet-basis fraction."""
    if moisture_db < 0.0:
        raise ValueError('Dry-basis moisture cannot be negative.')
    return moisture_db / (1.0 + moisture_db)


def validate_batch(batch: Batch) -> None:
    """Reject inputs that cannot describe a physical drying duty."""
    if batch.mass_kg <= 0.0:
        raise ValueError('Batch mass must be greater than zero.')
    if not 0.0 < batch.initial_moisture_wb < 1.0:
        raise ValueError('Initial moisture must be within 0..1 wet basis.')
    if not 0.0 < batch.target_moisture_wb < 1.0:
        raise ValueError('Target moisture must be within 0..1 wet basis.')
    if batch.target_moisture_wb >= batch.initial_moisture_wb:
        raise ValueError('Target moisture must be below the initial moisture.')


def compute_mass_balance(
    batch: Batch, material: Material, temperature_c: float
) -> MassBalance:
    """Water removed and the thermodynamic energy floor for one batch."""
    validate_batch(batch)

    dry_solids_kg = batch.mass_kg * (1.0 - batch.initial_moisture_wb)
    initial_water_kg = batch.mass_kg - dry_solids_kg
    final_water_kg = dry_solids_kg * wet_to_dry_basis(batch.target_moisture_wb)
    water_to_remove_kg = initial_water_kg - final_water_kg

    if water_to_remove_kg < 0.0:
        raise ValueError('Target moisture implies water gain, not drying.')

    latent_energy_j = water_to_remove_kg * (
        latent_heat_vaporization_kj_per_kg(temperature_c) * _J_PER_KJ
    )
    minimum_energy_kwh = latent_energy_j / _J_PER_KWH

    return MassBalance(
        dry_solids_kg=dry_solids_kg,
        initial_water_kg=initial_water_kg,
        final_water_kg=final_water_kg,
        initial_mass_kg=batch.mass_kg,
        final_mass_kg=dry_solids_kg + final_water_kg,
        water_to_remove_kg=water_to_remove_kg,
        minimum_energy_kwh=minimum_energy_kwh,
    )


def moisture_lookup(
    batch: Batch, material: Material, water_removed_kg: float
) -> float:
    """Wet-basis moisture after removing a given mass of water."""
    dry_solids_kg = batch.mass_kg * (1.0 - batch.initial_moisture_wb)
    remaining_water_kg = (
        batch.mass_kg - dry_solids_kg - water_removed_kg
    )
    current_mass_kg = dry_solids_kg + remaining_water_kg
    if current_mass_kg <= 0.0:
        raise ValueError('Water removal exceeds the available batch mass.')
    return remaining_water_kg / current_mass_kg
