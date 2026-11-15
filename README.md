# btc-cent-forecast-01 Entry

A robust, deterministic Bitcoin price forecaster for `btc-cent-forecast-01` competition on `make.fun`.

## Approach & Ridge Model
- **Core Model:** Ridge regression on log-returns ($\lambda = 1$), fitted on 528 rolling origins across the 6 practice cases.
- **Features (`x0` through `x6`):**
  - $x_0 = 1$ (intercept)
  - $x_1 = \ln(p_t / p_{t-15})$ (15-min log return)
  - $x_2 = \ln(p_t / p_{t-60})$ (60-min log return)
  - $x_3 = \ln(p_t / p_{t-240})$ (240-min log return)
  - $x_4 = \ln(p_t / p_{t-1440})$ (1440-min / 24h log return)
  - $x_5 = \ln(p_t / \text{median}_{1440})$ (deviation from 24h median)
  - $x_6 = 1000 \times \sigma_{240}$ (volatility: standard deviation of 1-minute log returns over the last 240 minutes)
- **Weights ($W$):** `[-0.00388, -0.00074, -0.00382, -0.00787, -0.01690, -0.00795, 0.00342]`
- **Prediction:** $\text{forecast} = \text{price5}\left(p_t \times \exp\left(\sum W_i x_i\right)\right)$.
- **Precision & Grid:** Clamped, bounded, and rounded to 5 decimal places (`price5`).
- **Determinism:** Pure Node.js (v22+) standard library, causal, offline, zero randomness, yielding byte-identical outputs across repeated runs.

## Validation & Results
- **Fit Metrics:** Leave-one-case-out MAE **41,790 cents** vs persistence **43,822 cents**.
- **Practice MAE (`p00`..`p04`):** **34,103.57 cents** (vs persistence **47,054.66 cents**).
- **Runtime:** ~200ms for all 6 cases combined (well under the 8-second per-case limit).
