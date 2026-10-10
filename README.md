# Basic BMI

A small, dependency-free BMI calculator (HTML, CSS, vanilla JS).

## Run

Open `BMI calculator prototype/index.html` in a browser, or serve the folder:

```
cd "BMI calculator prototype"
python3 serve.py
```

## Structure

| File | Purpose |
| --- | --- |
| `index.html` | Form (metric/imperial toggle, weight, height) and result area |
| `bmi.css` | Styling, including light/dark theme |
| `bmi.js` | Calculation, validation and categories (pure functions) plus DOM wiring |
| `bmi.test.js` | Node tests for the pure logic |
| `serve.py` | Optional local server (no caching) |

## Behaviour

- Metric (kg, cm) or imperial (lb, ft + in). Both are converted to kg and metres and use `kg / m²`.
- The BMI is rounded half up to one decimal, and the category is taken from that displayed value, so the label always matches the number. Exact ties are handled correctly (48 kg at 160 cm is exactly 18.75 and shows 18.8).
- WHO adult categories: under 18.5 underweight (thinness grades below 18.5), 18.5–24.9 healthy, 25–29.9 overweight, 30+ obese (classes I–III from 30, 35 and 40).
- The result also shows the healthy weight range for the entered height, rounded inwards so every weight in the range is classed healthy.
- Inputs are validated per field (required, plain positive decimals, plausible range), with inline messages.

### Imperial accuracy note

Imperial values use exact unit definitions (1 lb = 0.45359237 kg, 1 in = 0.0254 m), not the common `× 703` shortcut, which is a rounded form of 703.0696. Because of that, about 4% of imperial results differ by 0.1 from a 703-based chart (for example 150 lb at 5'9" is 22.2 here and 22.1 on the CDC chart). In testing across 11,196 imperial inputs, no category changed.

## Tests

```
cd "BMI calculator prototype"
node bmi.test.js
```

The tests include a hand-checked reference table, floating-point tie cases and healthy-range invariants. The logic was also cross-checked against an exact-arithmetic reference (Python `fractions`) over about 32,000 metric and imperial inputs with no mismatches.

BMI is a screening measure for adults, not a diagnosis.
