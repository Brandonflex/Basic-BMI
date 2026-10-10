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
- WHO adult categories: under 18.5 underweight, 18.5–24.9 healthy, 25–29.9 overweight, 30+ obese. Categories are based on the BMI as displayed (one decimal).
- Inputs are validated per field (required, positive, plausible range), with inline messages.

## Tests

```
cd "BMI calculator prototype"
node bmi.test.js
```

BMI is a screening measure for adults, not a diagnosis.
