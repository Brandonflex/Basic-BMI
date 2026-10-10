/*
 * BMI = weight (kg) / height (m)^2
 * Imperial inputs (lb, ft + in) are converted to kg and m first, so there is
 * a single formula. Categories follow the WHO adult classification
 * (https://www.who.int/data/gho/data/themes/topics/topic-details/GHO/body-mass-index).
 * Like most calculators (e.g. CDC), the BMI is rounded to one decimal and the
 * category is taken from that displayed value.
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

// Round half up to one decimal. The tiny offset absorbs floating-point error
// so exact ties round up (48 kg at 160 cm is exactly 18.75 and must show 18.8,
// not 18.7). Real float error is ~1e-14, far below the offset.
function round1(x) {
    return Math.round(x * 10 + 1e-9) / 10;
}

// Expects a BMI already rounded to one decimal, so the label always matches
// the number the user sees (24.96 displays as 25.0 and is "Overweight").
// `detail` is the WHO sub-grade where one exists.
function categorize(bmi) {
    if (bmi < 16) return { id: "under", label: "Underweight", detail: "Severe thinness" };
    if (bmi < 17) return { id: "under", label: "Underweight", detail: "Moderate thinness" };
    if (bmi < 18.5) return { id: "under", label: "Underweight", detail: "Mild thinness" };
    if (bmi < 25) return { id: "healthy", label: "Healthy weight", detail: "" };
    if (bmi < 30) return { id: "over", label: "Overweight", detail: "" };
    if (bmi < 35) return { id: "obese", label: "Obese", detail: "Class I" };
    if (bmi < 40) return { id: "obese", label: "Obese", detail: "Class II" };
    return { id: "obese", label: "Obese", detail: "Class III" };
}

const isBlank = (raw) => String(raw ?? "").trim() === "";

// Parses a number from a raw input string. Returns { value } or { error }.
// Plain decimals only: rejects "1e3", "0x10", "Infinity", "-5".
const DECIMAL = /^(\d+\.?\d*|\.\d+)$/;

function parseNumber(raw, label) {
    const text = String(raw).trim();
    if (!DECIMAL.test(text)) {
        return { error: `${label} must be a positive number.` };
    }
    return { value: Number(text) };
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

// Weight range that keeps BMI within the healthy band (18.5 to 24.9) at the
// given height, in the user's unit. Rounded inwards so every weight inside
// the range is guaranteed to display as healthy.
function healthyRange(heightM, system) {
    const factor = system === "imperial" ? 1 / LB_TO_KG : 1;
    const digits = system === "imperial" ? 0 : 1;
    const scale = 10 ** digits;
    const lowest = 18.5 * heightM * heightM * factor;
    const highest = 24.9 * heightM * heightM * factor;
    return {
        min: Math.ceil(lowest * scale - 1e-9) / scale,
        max: Math.floor(highest * scale + 1e-9) / scale,
        unit: UNITS[system].weightUnit,
        digits,
    };
}

// Pure entry point: raw input strings in, { bmi, category, range } or { errors } out.
function computeResult({ weight, height, inches = "", system }) {
    const units = UNITS[system];
    const w = parseWeight(weight, units);
    const h = parseHeight(height, inches, system);

    if (w.error || h.error) {
        return { errors: { weight: w.error, height: h.error } };
    }

    const heightM = units.toMeters(h.value);
    const bmi = round1(calculateBmi(units.toKg(w.value), heightM));
    return { bmi, category: categorize(bmi), range: healthyRange(heightM, system) };
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

    function showResult({ bmi, category, range }) {
        $("bmi-output").textContent = bmi.toFixed(1);
        $("message").textContent = category.label;
        $("detail").textContent = category.detail ? `\u00b7 ${category.detail}` : "";
        $("range").textContent =
            `Healthy weight for your height: ${range.min.toFixed(range.digits)}` +
            `\u2013${range.max.toFixed(range.digits)} ${range.unit}`;
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
        if (result.errors) {
            // A number input reports "" for text it cannot parse (e.g. "1e"),
            // which would otherwise read as "empty".
            const unparsable = { weight: fields.weight.input, height: fields.height.input };
            for (const [name, input] of Object.entries(unparsable)) {
                const bad = input.validity.badInput ||
                    (name === "height" && inchesInput.validity.badInput);
                if (bad) result.errors[name] = "Enter a valid number.";
            }
            showErrors(result.errors);
        }
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
    module.exports = { calculateBmi, categorize, computeResult, round1 };
}
