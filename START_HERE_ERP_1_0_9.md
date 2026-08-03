# Samara Care ERP 1.0.9 — Intelligent Report Clinical Status Fix

## What was corrected

- Blank or zero-only vital rows are ignored.
- A legacy pain score of 0 alone does not count as a vital observation.
- Temperature entries are normalised: 70–115 is treated as Fahrenheit and converted to Celsius; 25–45 is treated as Celsius.
- Pulse 98 and SpO2 96 are classified as normal unless another genuine measurement is abnormal.
- Intelligent Reports recalculate status from actual values and do not trust stored alert labels.
- Abnormal-vitals output now shows temperature and respiration, so the reason for any alert is visible.

No SQL or Edge Function update is required.
