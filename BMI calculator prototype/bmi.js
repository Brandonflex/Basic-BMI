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

// Slider ranges per unit system. Typed values outside a range are still
// valid input (the slider just parks at its end).
const SLIDERS = {
    metric: {
        weight: { min: 30, max: 200, step: 0.5 },
        height: { min: 120, max: 220, step: 1 },
    },
    imperial: {
        weight: { min: 66, max: 440, step: 1 },
        height: { min: 48, max: 87, step: 1 }, // total inches
    },
};

const ERROR_DELAY_MS = 800; // idle time before showing an error while typing
const STATUS_DELAY_MS = 700; // idle time before screen readers are updated
const COUNT_MS = 600;

function initUi() {
    const $ = (id) => document.getElementById(id);
    const form = $("bmi-form");
    const fields = {
        weight: { input: $("weight"), slider: $("weight-slider"), error: $("weight-error") },
        height: { input: $("height"), slider: $("height-slider"), error: $("height-error") },
    };
    const inchesInput = $("inches");
    const inchesWrap = $("inches-wrap");
    const readout = $("result");
    const output = $("bmi-output");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const currentSystem = () => form.elements.units.value;
    const isBlank = (input) => input.value.trim() === "" && !input.validity.badInput;

    /* --- sliders --- */

    function markTouched(slider, touched = true) {
        if (touched) slider.dataset.touched = "";
        else delete slider.dataset.touched;
    }

    function setFill(slider) {
        const { min, max, value } = slider;
        const pct = ((value - min) / (max - min)) * 100;
        slider.style.setProperty("--fill", `${Math.min(Math.max(pct, 0), 100)}%`);
    }

    function configureSliders() {
        const config = SLIDERS[currentSystem()];
        for (const name of ["weight", "height"]) {
            const slider = fields[name].slider;
            Object.assign(slider, config[name]);
            slider.value = (config[name].min + config[name].max) / 2;
            markTouched(slider, false);
            setFill(slider);
        }
    }

    // Moves the sliders to match what is typed (when it is a number).
    function syncSlidersFromInputs() {
        const weight = Number(fields.weight.input.value);
        if (!isBlank(fields.weight.input) && Number.isFinite(weight)) {
            fields.weight.slider.value = weight;
            markTouched(fields.weight.slider);
        }
        const height = Number(fields.height.input.value);
        const inches = Number(inchesInput.value);
        if (!isBlank(fields.height.input) || !isBlank(inchesInput)) {
            const total = currentSystem() === "imperial" ? (height || 0) * 12 + (inches || 0) : height;
            if (Number.isFinite(total)) {
                fields.height.slider.value = total;
                markTouched(fields.height.slider);
            }
        }
        setFill(fields.weight.slider);
        setFill(fields.height.slider);
    }

    /* --- errors --- */

    let errorTimer = 0;

    function clearErrors() {
        clearTimeout(errorTimer);
        for (const { input, error } of Object.values(fields)) {
            error.hidden = true;
            error.textContent = "";
            input.removeAttribute("aria-invalid");
        }
        inchesInput.removeAttribute("aria-invalid");
    }

    // Shows errors only for fields the user has put something into, unless
    // `includeEmpty` (pressing Enter) asks for the "enter your..." prompts too.
    function showErrors(errors, includeEmpty) {
        clearErrors();
        let first = null;
        for (const [name, message] of Object.entries(errors)) {
            if (!message) continue;
            const touched = !isBlank(fields[name].input) ||
                (name === "height" && !isBlank(inchesInput));
            if (!touched && !includeEmpty) continue;
            const { input, error } = fields[name];
            error.textContent = message;
            error.hidden = false;
            input.setAttribute("aria-invalid", "true");
            if (name === "height" && currentSystem() === "imperial") {
                inchesInput.setAttribute("aria-invalid", "true");
            }
            first = first || input;
        }
        return first;
    }

    /* --- readout --- */

    let shownBmi = null; // value currently displayed in the big numeral
    let frame = 0;
    let statusTimer = 0;
    let hasResult = false;

    function showNumber(target) {
        cancelAnimationFrame(frame);
        if (reducedMotion.matches || shownBmi === target) {
            shownBmi = target;
            output.textContent = target.toFixed(1);
            return;
        }
        const from = shownBmi ?? SCALE_MIN;
        const start = performance.now();
        const step = (now) => {
            const t = Math.min((now - start) / COUNT_MS, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            output.textContent = (from + (target - from) * eased).toFixed(1);
            if (t < 1) frame = requestAnimationFrame(step);
            else shownBmi = target;
        };
        shownBmi = target;
        frame = requestAnimationFrame(step);
    }

    function showResult({ bmi, category, range }) {
        hasResult = true;
        readout.dataset.state = "ready";
        readout.dataset.category = category.id;
        $("message").textContent = category.label;
        $("detail").textContent = category.detail;
        const lo = range.min.toFixed(range.digits);
        const hi = range.max.toFixed(range.digits);
        $("range").textContent = `Healthy for your height: ${lo}\u2013${hi} ${range.unit}`;

        const clamped = Math.min(Math.max(bmi, SCALE_MIN), SCALE_MAX);
        $("marker").style.bottom = `${((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%`;
        showNumber(bmi);

        clearTimeout(statusTimer);
        statusTimer = setTimeout(() => {
            const grade = category.detail ? `, ${category.detail}` : "";
            $("sr-status").textContent =
                `Your BMI is ${bmi.toFixed(1)}. ${category.label}${grade}. ` +
                `Healthy weight for your height is ${lo} to ${hi} ${range.unit}.`;
        }, STATUS_DELAY_MS);
    }

    // Input is incomplete or invalid. A result that was showing is dimmed
    // rather than removed, so typing "175" digit by digit does not flicker.
    function showIncomplete(anyInput) {
        clearTimeout(statusTimer);
        $("sr-status").textContent = "";
        if (hasResult && anyInput) {
            readout.dataset.state = "stale";
            $("message").textContent = "Check your entries";
            $("detail").textContent = "";
            $("range").textContent = "";
            return;
        }
        resetReadout();
    }

    function resetReadout() {
        cancelAnimationFrame(frame);
        hasResult = false;
        shownBmi = null;
        readout.dataset.state = "empty";
        delete readout.dataset.category;
        output.textContent = "00.0";
        $("message").textContent = "Enter your weight and height";
        $("detail").textContent = "";
        $("range").textContent = "";
        $("sr-status").textContent = "";
    }

    /* --- wiring --- */

    // A number input reports "" for text it cannot parse (such as "1e"), so
    // pass a marker the validator rejects instead of letting it read as empty.
    const raw = (input) => (input.validity.badInput ? "?" : input.value);

    function compute() {
        return computeResult({
            weight: raw(fields.weight.input),
            height: raw(fields.height.input),
            inches: raw(inchesInput),
            system: currentSystem(),
        });
    }

    function update() {
        clearErrors();
        const result = compute();
        const anyInput = ![fields.weight.input, fields.height.input, inchesInput]
            .every(isBlank);
        if (!result.errors) {
            showResult(result);
            return;
        }
        showIncomplete(anyInput);
        // Wait for the user to pause before calling an unfinished number wrong.
        errorTimer = setTimeout(() => showErrors(result.errors, false), ERROR_DELAY_MS);
    }

    function applySystem() {
        const system = currentSystem();
        const units = UNITS[system];
        document.querySelector('[data-unit="weight"]').textContent = units.weightUnit;
        document.querySelector('[data-unit="height"]').textContent = units.heightUnit;
        inchesWrap.hidden = system !== "imperial";
        configureSliders();
    }

    const trim = (n) => String(Math.round(n * 10) / 10);

    fields.weight.slider.addEventListener("input", () => {
        fields.weight.input.value = trim(Number(fields.weight.slider.value));
        markTouched(fields.weight.slider);
        setFill(fields.weight.slider);
        update();
    });

    fields.height.slider.addEventListener("input", () => {
        const value = Number(fields.height.slider.value);
        markTouched(fields.height.slider);
        if (currentSystem() === "imperial") {
            fields.height.input.value = Math.floor(value / 12);
            inchesInput.value = value % 12;
        } else {
            fields.height.input.value = value;
        }
        setFill(fields.height.slider);
        update();
    });

    for (const input of [fields.weight.input, fields.height.input, inchesInput]) {
        input.addEventListener("input", () => {
            syncSlidersFromInputs();
            update();
        });
        // Leaving a field is a clear signal the user is done with it.
        input.addEventListener("change", () => {
            const result = compute();
            if (result.errors) showErrors(result.errors, false);
        });
    }

    // A form with several fields and no submit button does not submit on Enter
    // by itself, so ask it to.
    form.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && event.target.tagName === "INPUT" &&
            event.target.type === "number") {
            event.preventDefault();
            form.requestSubmit();
        }
    });

    // Enter key: show every problem, including missing fields.
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const result = compute();
        if (!result.errors) return;
        const first = showErrors(result.errors, true);
        if (first) first.focus();
    });

    form.addEventListener("reset", () => {
        clearErrors();
        resetReadout();
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
            resetReadout();
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
