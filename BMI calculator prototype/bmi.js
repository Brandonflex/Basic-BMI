/*
 * BMI = weight (kg) / height (m)^2
 * Imperial inputs (lb, in) are converted to kg and m first, so there is a
 * single formula. Categories follow the WHO adult classification.
 */

const LB_TO_KG = 0.45359237;
const IN_TO_M = 0.0254;

const UNITS = {
    metric: {
        weightLabel: "kg",
        heightLabel: "cm",
        toKg: (w) => w,
        toMeters: (h) => h / 100,
        // Plausible human ranges, used to catch typos (e.g. height in metres).
        weightRange: [20, 500],
        heightRange: [50, 275],
    },
    imperial: {
        weightLabel: "lb",
        heightLabel: "in",
        toKg: (w) => w * LB_TO_KG,
        toMeters: (h) => h * IN_TO_M,
        weightRange: [44, 1100],
        heightRange: [20, 108],
    },
};

// Scale shown in the result bar.
const SCALE_MIN = 15;
const SCALE_MAX = 40;

function calculateBmi(weightKg, heightM) {
    return weightKg / (heightM * heightM);
}

// Expects a BMI already rounded to one decimal, so the label always matches
// the number the user sees (e.g. 24.96 displays as 25.0 and is "Overweight").
function categorize(bmi) {
    if (bmi < 18.5) return { id: "under", label: "Underweight" };
    if (bmi < 25) return { id: "healthy", label: "Healthy weight" };
    if (bmi < 30) return { id: "over", label: "Overweight" };
    return { id: "obese", label: "Obese" };
}

// Returns { value } or { error } for a raw input string.
function parseField(raw, name, unitLabel, [min, max]) {
    const text = String(raw).trim();
    if (text === "") return { error: `Enter your ${name}.` };
    const value = Number(text);
    if (!Number.isFinite(value) || value <= 0) {
        return { error: `${capitalize(name)} must be a positive number.` };
    }
    if (value < min || value > max) {
        return { error: `${capitalize(name)} should be between ${min} and ${max} ${unitLabel}.` };
    }
    return { value };
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Pure entry point: raw strings in, result or error out.
function computeResult(weightRaw, heightRaw, unitSystem) {
    const units = UNITS[unitSystem];
    const weight = parseField(weightRaw, "weight", units.weightLabel, units.weightRange);
    const height = parseField(heightRaw, "height", units.heightLabel, units.heightRange);

    if (weight.error || height.error) {
        return { errors: { weight: weight.error, height: height.error } };
    }

    const raw = calculateBmi(units.toKg(weight.value), units.toMeters(height.value));
    const bmi = Math.round(raw * 10) / 10;
    return { bmi, category: categorize(bmi) };
}

/* ---------- DOM ---------- */

function initUi() {
    const form = document.getElementById("bmi-form");
    const weightInput = document.getElementById("weight");
    const heightInput = document.getElementById("height");
    const errorBox = document.getElementById("error");
    const resultBox = document.getElementById("result");
    const output = document.getElementById("bmi-output");
    const message = document.getElementById("message");
    const marker = document.getElementById("marker");

    const currentUnits = () => form.elements.units.value;

    function clearError() {
        errorBox.hidden = true;
        errorBox.textContent = "";
        weightInput.removeAttribute("aria-invalid");
        heightInput.removeAttribute("aria-invalid");
    }

    function hideResult() {
        resultBox.hidden = true;
        resultBox.removeAttribute("data-category");
    }

    function showErrors({ weight, height }) {
        hideResult();
        errorBox.textContent = [weight, height].filter(Boolean).join(" ");
        errorBox.hidden = false;
        if (weight) weightInput.setAttribute("aria-invalid", "true");
        if (height) heightInput.setAttribute("aria-invalid", "true");
        (weight ? weightInput : heightInput).focus();
    }

    function showResult({ bmi, category }) {
        output.textContent = bmi.toFixed(1);
        message.textContent = category.label;
        resultBox.dataset.category = category.id;

        const clamped = Math.min(Math.max(bmi, SCALE_MIN), SCALE_MAX);
        marker.style.left = `${((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%`;
        resultBox.hidden = false;
    }

    function updateUnitLabels() {
        const units = UNITS[currentUnits()];
        document.querySelector('[data-unit="weight"]').textContent = units.weightLabel;
        document.querySelector('[data-unit="height"]').textContent = units.heightLabel;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearError();
        const result = computeResult(weightInput.value, heightInput.value, currentUnits());
        if (result.errors) showErrors(result.errors);
        else showResult(result);
    });

    form.addEventListener("reset", () => {
        clearError();
        hideResult();
        // Reset restores the default (metric) radio after this event fires.
        setTimeout(updateUnitLabels, 0);
        weightInput.focus();
    });

    // Values typed in one system are meaningless in the other, so start fresh.
    form.elements.units.forEach((radio) =>
        radio.addEventListener("change", () => {
            weightInput.value = "";
            heightInput.value = "";
            clearError();
            hideResult();
            updateUnitLabels();
        })
    );

    updateUnitLabels();
}

if (typeof document !== "undefined") {
    initUi();
}

if (typeof module !== "undefined") {
    module.exports = { calculateBmi, categorize, computeResult };
}
