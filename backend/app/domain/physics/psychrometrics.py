"""Psychrometric helpers for low-grade waste-heat drying.

These are standard empirical correlations, not fitted plant data. Everything is
expressed in SI-adjacent units: kPa, kJ/kg, degrees Celsius, wet-basis fraction.
"""

from __future__ import annotations

from math import exp

ATMOSPHERIC_PRESSURE_KPA = 101.325

# Magnus coefficients for saturation vapour pressure over water.
_MAGNUS_A = 0.61094
_MAGNUS_B = 17.625
_MAGNUS_C = 243.04

# Empirical moisture sorption exponent: equilibrium moisture rises with humidity.
_SORPTION_EXPONENT = 0.7


def latent_heat_vaporization_kj_per_kg(temperature_c: float) -> float:
    """Latent heat of vaporisation of water at a given temperature."""
    return 2501.0 - 2.361 * temperature_c


def saturation_vapour_pressure_kpa(temperature_c: float) -> float:
    """Saturation vapour pressure over liquid water (Magnus form)."""
    return _MAGNUS_A * exp(
        _MAGNUS_B * temperature_c / (temperature_c + _MAGNUS_C)
    )


def humidity_ratio_kg_per_kg(
    temperature_c: float, relative_humidity: float
) -> float:
    """Mass of water vapour per mass of dry air."""
    vapour_pressure = relative_humidity * saturation_vapour_pressure_kpa(
        temperature_c
    )
    if vapour_pressure >= ATMOSPHERIC_PRESSURE_KPA:
        raise ValueError('Relative humidity produces saturated vapour pressure.')
    return (
        0.622
        * vapour_pressure
        / (ATMOSPHERIC_PRESSURE_KPA - vapour_pressure)
    )


def equilibrium_moisture_wb(
    base_equilibrium_wb: float, relative_humidity: float
) -> float:
    """Equilibrium moisture on a wet basis for humid air.

    A higher humidity raises the equilibrium moisture, which slows drying. The
    relationship is a documented empirical form, not a material measurement.
    """
    if not 0.0 <= relative_humidity <= 1.0:
        raise ValueError('Relative humidity must be within 0..1.')
    return base_equilibrium_wb * (1.0 - relative_humidity) ** _SORPTION_EXPONENT


def drying_potential(relative_humidity: float) -> float:
    """Dimensionless drying driving-force factor for humid air (0..1)."""
    if not 0.0 <= relative_humidity <= 1.0:
        raise ValueError('Relative humidity must be within 0..1.')
    return max(0.0, 1.0 - relative_humidity)
