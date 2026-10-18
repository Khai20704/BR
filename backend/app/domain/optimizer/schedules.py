"""Candidate schedule generation.

Candidates are deliberately few, explainable and deterministic: each one is a
small set of constant-temperature phases that a plant operator could actually
follow. No machine learning and no randomness are involved.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..models import Constraints, Material, SchedulePhase, ThermalProfile


@dataclass(frozen=True, slots=True)
class CandidateSchedule:
    """A named, operator-readable schedule proposal."""

    name: str
    phases: tuple[SchedulePhase, ...]
    rationale: str


def _window_minutes(profile: ThermalProfile, constraints: Constraints) -> int:
    """Usable window length, bounded by the thermal profile and constraints.

    A schedule is integrated from minute zero, and the engine holds the first
    sample's temperature for any minute before that sample. The usable window is
    therefore the minute of the last sample, not the span between the first and
    the last one: trimming the start of a profile (as replanning does) must not
    shorten the horizon a plan may use.
    """
    if not profile.samples:
        raise ValueError('A thermal profile needs at least one sample.')
    horizon = profile.samples[-1].minute
    if horizon <= 0:
        horizon = constraints.max_duration_minutes
    return max(0, min(horizon, constraints.max_duration_minutes))


def usable_temperature_c(
    profile: ThermalProfile, constraints: Constraints, material: Material
) -> float:
    """Highest temperature the source, the constraint set and the material allow."""
    source_max = max(sample.temperature_c for sample in profile.samples)
    return min(
        source_max,
        constraints.max_temperature_c,
        material.max_safe_temperature_c,
    )


def candidate_schedules(
    profile: ThermalProfile,
    constraints: Constraints,
    material: Material,
) -> tuple[CandidateSchedule, ...]:
    """A small deterministic candidate set covering the plausible strategies."""
    window = _window_minutes(profile, constraints)
    if window <= 0:
        return ()

    hottest = usable_temperature_c(profile, constraints, material)
    coolest = max(constraints.min_temperature_c, hottest - 10.0)
    midpoint = (hottest + coolest) / 2.0

    return (
        CandidateSchedule(
            name='Heat-following',
            phases=(SchedulePhase(temperature_c=hottest, duration_minutes=window),),
            rationale=(
                'Hold the highest usable source temperature for the whole '
                'window, letting the profile clip the setpoint when heat falls.'
            ),
        ),
        CandidateSchedule(
            name='Staged warm-up',
            phases=(
                SchedulePhase(
                    temperature_c=midpoint,
                    duration_minutes=max(1, window // 2),
                ),
                SchedulePhase(
                    temperature_c=hottest,
                    duration_minutes=max(1, window - window // 2),
                ),
            ),
            rationale=(
                'Start cooler to protect the material, then use the hottest '
                'available interval to finish the batch.'
            ),
        ),
        CandidateSchedule(
            name='Conservative',
            phases=(
                SchedulePhase(temperature_c=coolest, duration_minutes=window),
            ),
            rationale=(
                'Hold the lowest usable temperature for the whole window to '
                'minimise thermal stress and peak power.'
            ),
        ),
        CandidateSchedule(
            name='Short window',
            phases=(
                SchedulePhase(
                    temperature_c=hottest,
                    duration_minutes=max(1, int(window * 0.6)),
                ),
            ),
            rationale=(
                'Stop earlier at the highest usable temperature, saving heat '
                'if the target is reached before the window closes.'
            ),
        ),
    )
