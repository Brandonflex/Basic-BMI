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
| `index.html` | Inputs (unit switch, weight and height with sliders) and the readout with its gauge |
| `bmi.css` | Styling: split layout, ruler gauge, light/dark theme, reduced-motion support |
| `bmi.js` | Calculation, validation and categories (pure functions) plus DOM wiring |
| `bmi.test.js` | Node tests for the pure logic |
| `serve.py` | Optional local server (no caching) |

## Behaviour

- Live: the reading updates as you type or drag a slider. The gauge marker slides, the number counts to its new value and the readout tints to the category colour. Enter shows any missing-field prompts.
- Incomplete input dims the last reading ("Check your entries") instead of clearing it, and errors only appear once you pause or leave the field, so typing `175` does not flash an error at `1`.
- Accessible: sliders are keyboard-operable, errors are tied to fields, the animated number is hidden from screen readers and a debounced status line announces the result, and `prefers-reduced-motion` disables the animation.

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
