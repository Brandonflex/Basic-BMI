/*
 * BMI = weight (kg) / height (m)^2
 * Imperial inputs (lb, ft + in) are converted to kg and m first, so there is
 * a single formula. Categories follow the WHO adult classification.
 */

const LB_TO_KG = 0.45359237;
const IN_TO_M = 0.0254;

// Ranges are plausible human limits, used to catch typos such as a height
// entered in metres.
const UNITS = {
    metric: {
        weightUnit: "kg",
        heightUnit: "cm",
        weightRange: [20, 500],
        heightRange: [50, 275],
        toKg: (w) => w,
        toMeters: (cm) => cm / 100,
    },
    imperial: {
        weightUnit: "lb",
        heightUnit: "ft",
        weightRange: [44, 1100],
        heightRange: [20, 108], // total inches
        toKg: (w) => w * LB_TO_KG,
        toMeters: (inches) => inches * IN_TO_M,
    },
};

// Range of the bar shown in the result.
const SCALE_MIN = 15;
const SCALE_MAX = 40;

function calculateBmi(weightKg, heightM) {
    return weightKg / (heightM * heightM);
}

// Expects a BMI already rounded to one decimal, so the label always matches
// the number the user sees (24.96 displays as 25.0 and is "Overweight").
function categorize(bmi) {
    if (bmi < 18.5) return { id: "under", label: "Underweight" };
    if (bmi < 25) return { id: "healthy", label: "Healthy weight" };
    if (bmi < 30) return { id: "over", label: "Overweight" };
    return { id: "obese", label: "Obese" };
}

const isBlank = (raw) => String(raw ?? "").trim() === "";

// Parses a number from a raw input string. Returns { value } or { error }.
function parseNumber(raw, label) {
    const value = Number(String(raw).trim());
    if (!Number.isFinite(value) || value < 0) {
        return { error: `${label} must be a positive number.` };
    }
    return { value };
}

function checkRange(value, [min, max], label, unit) {
    if (value < min || value > max) {
        return { error: `${label} should be between ${min} and ${max} ${unit}.` };
    }
    return { value };
}

function parseWeight(raw, units) {
    if (isBlank(raw)) return { error: "Enter your weight." };
    const n = parseNumber(raw, "Weight");
    if (n.error) return n;
    return checkRange(n.value, units.weightRange, "Weight", units.weightUnit);
}

// Metric: one value in cm. Imperial: feet plus optional inches, returned as
// total inches.
function parseHeight(raw, inchesRaw, system) {
    const units = UNITS[system];

    if (system === "metric") {
        if (isBlank(raw)) return { error: "Enter your height." };
        const n = parseNumber(raw, "Height");
        if (n.error) return n;
        return checkRange(n.value, units.heightRange, "Height", "cm");
    }

    if (isBlank(raw) && isBlank(inchesRaw)) return { error: "Enter your height." };
    const feet = isBlank(raw) ? { value: 0 } : parseNumber(raw, "Feet");
    if (feet.error) return feet;
    const inches = isBlank(inchesRaw) ? { value: 0 } : parseNumber(inchesRaw, "Inches");
    if (inches.error) return inches;
    if (inches.value >= 12) return { error: "Inches must be less than 12." };

    const total = feet.value * 12 + inches.value;
    return checkRange(total, units.heightRange, "Height", "inches in total");
}

// Pure entry point: raw input strings in, { bmi, category } or { errors } out.
function computeResult({ weight, height, inches = "", system }) {
    const units = UNITS[system];
    const w = parseWeight(weight, units);
    const h = parseHeight(height, inches, system);

    if (w.error || h.error) {
        return { errors: { weight: w.error, height: h.error } };
    }

    const raw = calculateBmi(units.toKg(w.value), units.toMeters(h.value));
    const bmi = Math.round(raw * 10) / 10;
    return { bmi, category: categorize(bmi) };
}

/* ---------- DOM ---------- */

function initUi() {
    const $ = (id) => document.getElementById(id);
    const form = $("bmi-form");
    const fields = {
        weight: { input: $("weight"), error: $("weight-error") },
        height: { input: $("height"), error: $("height-error") },
    };
    const inchesInput = $("inches");
    const inchesWrap = $("inches-wrap");
    const resultBox = $("result");

    const currentSystem = () => form.elements.units.value;

    function clearErrors() {
        for (const { input, error } of Object.values(fields)) {
            error.hidden = true;
            error.textContent = "";
            input.removeAttribute("aria-invalid");
        }
        inchesInput.removeAttribute("aria-invalid");
    }

    function hideResult() {
        resultBox.hidden = true;
        delete resultBox.dataset.category;
    }

    function showErrors(errors) {
        hideResult();
        let first = null;
        for (const [name, message] of Object.entries(errors)) {
            if (!message) continue;
            const { input, error } = fields[name];
            error.textContent = message;
            error.hidden = false;
            input.setAttribute("aria-invalid", "true");
            if (name === "height" && currentSystem() === "imperial") {
                inchesInput.setAttribute("aria-invalid", "true");
            }
            first = first || input;
        }
        if (first) first.focus();
    }

    function showResult({ bmi, category }) {
        $("bmi-output").textContent = bmi.toFixed(1);
        $("message").textContent = category.label;
        resultBox.dataset.category = category.id;

        const clamped = Math.min(Math.max(bmi, SCALE_MIN), SCALE_MAX);
        $("marker").style.left = `${((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%`;
        resultBox.hidden = false;
    }

    function applySystem() {
        const system = currentSystem();
        const units = UNITS[system];
        document.querySelector('[data-unit="weight"]').textContent = units.weightUnit;
        document.querySelector('[data-unit="height"]').textContent = units.heightUnit;
        inchesWrap.hidden = system !== "imperial";
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearErrors();
        const result = computeResult({
            weight: fields.weight.input.value,
            height: fields.height.input.value,
            inches: inchesInput.value,
            system: currentSystem(),
        });
        if (result.errors) showErrors(result.errors);
        else showResult(result);
    });

    form.addEventListener("reset", () => {
        clearErrors();
        hideResult();
        // The browser restores the default (metric) radio after this event.
        setTimeout(() => {
            applySystem();
            fields.weight.input.focus();
        }, 0);
    });

    // Numbers typed in one system are meaningless in the other, so start fresh.
    for (const radio of form.elements.units) {
        radio.addEventListener("change", () => {
            for (const { input } of Object.values(fields)) input.value = "";
            inchesInput.value = "";
            clearErrors();
            hideResult();
            applySystem();
        });
    }

    applySystem();
}

if (typeof document !== "undefined") {
    initUi();
}

if (typeof module !== "undefined") {
    module.exports = { calculateBmi, categorize, computeResult };
}
