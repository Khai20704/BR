"""Default scenario data used by the workspace UI.

These are explicit, documented starting values for the spent-coffee-grounds
workspace. They are inputs, not measurements: a deployment must replace them
with site data before any engineering decision is made.
"""

from __future__ import annotations

from ..domain.models import (
    Batch,
    Constraints,
    Material,
    ThermalProfile,
    ThermalSample,
)

DEFAULT_MATERIAL = Material(
    material_id='spent-coffee-grounds',
    name='Spent coffee grounds',
    reference_rate_per_hour=0.60,
    activation_energy_j_per_mol=35_000.0,
    equilibrium_moisture_wb=0.06,
    max_safe_temperature_c=70.0,
    specific_heat_j_per_kgk=1_600.0,
)

DEFAULT_BATCH = Batch(
    batch_id='demo-batch',
    material=DEFAULT_MATERIAL,
    mass_kg=12.0,
    initial_moisture_wb=0.62,
    target_moisture_wb=0.25,
)

DEFAULT_CONSTRAINTS = Constraints(
    max_duration_minutes=480,
    min_temperature_c=30.0,
    max_temperature_c=60.0,
)

# One interval per hour across a working day of condenser waste heat.
_HOURLY_WINDOW: tuple[tuple[int, float, float, float], ...] = (
    (0, 34.0, 1.2, 0.58),
    (60, 38.0, 1.8, 0.56),
    (120, 43.0, 2.4, 0.53),
    (180, 46.0, 2.7, 0.51),
    (240, 44.0, 2.5, 0.50),
    (300, 48.0, 3.1, 0.48),
    (360, 45.0, 2.8, 0.47),
    (420, 42.0, 2.2, 0.49),
    (480, 39.0, 1.7, 0.52),
)


def default_thermal_profile() -> ThermalProfile:
    """The illustrative waste-heat window used by the workspace."""
    return ThermalProfile(
        source_id='ac-condenser-1',
        name='AC condenser waste heat',
        samples=tuple(
            ThermalSample(
                minute=minute,
                temperature_c=temperature_c,
                available_heat_kw=heat_kw,
                relative_humidity=humidity,
            )
            for minute, temperature_c, heat_kw, humidity in _HOURLY_WINDOW
        ),
    )


def default_scenario() -> tuple[Batch, ThermalProfile, Constraints]:
    """Batch, thermal window and constraints for the demo workspace."""
    return DEFAULT_BATCH, default_thermal_profile(), DEFAULT_CONSTRAINTS
