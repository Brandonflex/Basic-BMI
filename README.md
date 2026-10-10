# Basic BMI

A small, dependency-free BMI calculator (HTML, CSS, vanilla JS).

## Run

Open `BMI calculator prototype/bmi.html` in a browser. No build step.

## Structure

| File | Purpose |
| --- | --- |
| `bmi.html` | Form (metric/imperial toggle, weight, height) and result area |
| `bmi.css` | Styling, including light/dark theme |
| `bmi.js` | Calculation, validation and categories (pure functions) plus DOM wiring |
| `bmi.test.js` | Node tests for the pure logic |

## Behaviour

- Metric (kg, cm) or imperial (lb, in). Both are converted to kg and metres and use `kg / m²`.
- WHO adult categories: under 18.5 underweight, 18.5–24.9 healthy, 25–29.9 overweight, 30+ obese. Categories are based on the BMI as displayed (one decimal).
- Inputs are validated (required, positive, plausible range).

## Tests

```
cd "BMI calculator prototype"
node bmi.test.js
```

BMI is a screening measure for adults, not a diagnosis.
