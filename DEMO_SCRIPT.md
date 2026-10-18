# Br: 2-3 minute demonstration

Prepare: use the verified local HTTP mode or verified public URLs; keep the same
browser tab and navigate via the sidebar so session inputs persist. Allow a cold
start before recording. Never show credentials or the cloud secret screen.

**0:00-0:20 - Overview.** "Br explores whether low-grade AC waste heat can dry
spent coffee grounds. These are synthetic inputs and model predictions, not
measured savings." Show the available thermal window.

**0:20-0:45 - Site and Batch Setup.** In the Thermal scenario form set 42 C and
2 kW; select Review draft. Site name/equipment metadata is optional and local.
In Batch Setup enter 12 kg, 62% initial moisture, 25% target, 8 hours; Review draft.
Show the backend mass balance. These values are reproducible demo inputs, not
hardcoded engine results. Explain that source/batch settings reset on reload.

**0:45-1:05 - Thermal Profile and Thermal Digital Twin.** Show the scenario's
source curve, then the Python-computed moisture trajectory. "The deterministic
engine computes the drying duty; Gemini does not supply engineering numbers."

**1:05-1:40 - AI Planning.** Open once and wait for narration. Show schedule,
independent validation checks, provider, verification badge and tool timeline.
"Gemini calls a Python tool to inspect engine results before explaining them."
Only say live verified if LIVE_GEMINI_VERIFIED and a successful tool are present.
If unavailable, show the honest deterministic fallback; do not replace the trace.
A validated prediction is not proof of experimental calibration or plant safety.

**1:40-2:05 - Adaptive Replanning.** Set source temperature to 35 C and select
Replan. Compare the computed 42 C baseline with the new result. "Python reruns
optimization; the outcome can become infeasible. This MVP starts at minute zero
and does not infer measured batch progress." Read the actual displayed values.

**2:05-2:30 - Benchmark.** Show all three strategies on the same active batch and
configured 42 C source. The replan slider is a separate what-if; it does not alter
the shared source. To benchmark 35 C, change Site Setup and reopen Benchmark.
Discuss tradeoffs only when the results support them; do not claim proven savings.

**2:30-2:45 - Close.** "Br combines waste-heat reuse, Gemini tool calling and
independent model validation. Next steps are sensor integration and experimental
calibration. There is no sensor stream, persisted production history or hardware
control in this MVP."
