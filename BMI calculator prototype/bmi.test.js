// Run with: node bmi.test.js
const assert = require("node:assert/strict");
const { computeResult, categorize, round1 } = require("./bmi.js");

const metric = (weight, height) => computeResult({ weight, height, system: "metric" });
const imperial = (weight, height, inches) => computeResult({ weight, height, inches, system: "imperial" });

// Metric
assert.equal(metric("70", "175").bmi, 22.9);
assert.equal(metric("70", "175").category.id, "healthy");

// Imperial matches the classic lb/in formula (x703): 150 lb, 5 ft 5 in -> 25.0
assert.equal(imperial("150", "5", "5").bmi, 25.0);
assert.equal(imperial("150", "5", "").bmi, 29.3); // inches optional

// Hand-checked reference values (kg/m^2, rounded half up to one decimal)
assert.equal(metric("45", "170").bmi, 15.6);
assert.equal(metric("50", "160").bmi, 19.5);
assert.equal(metric("100", "180").bmi, 30.9);
// Imperial uses exact unit definitions, not the rounded 703 factor (true value
// 703.0696), so a few results differ by 0.1 from the 703-based CDC chart:
// 150 lb @ 5'9" is 22.151 (CDC 703 formula gives 22.149 -> 22.1).
assert.equal(imperial("150", "5", "9").bmi, 22.2);
assert.equal(imperial("180", "5", "10").bmi, 25.8);
assert.equal(imperial("200", "6", "0").bmi, 27.1);

// Exact ties must round up despite floating-point error (regression):
// 48 kg / 1.60 m = exactly 18.75, which previously displayed as 18.7.
assert.equal(metric("48", "160").bmi, 18.8);
assert.equal(round1(24.95), 25.0);
assert.equal(round1(18.45), 18.5);
assert.equal(round1(29.949999999999996), 30.0); // float noise on a true 29.95 tie
assert.equal(round1(29.9499), 29.9); // genuinely below the tie stays down

// Category boundaries (on the displayed, one-decimal value)
assert.equal(categorize(18.4).id, "under");
assert.equal(categorize(18.5).id, "healthy");
assert.equal(categorize(24.9).id, "healthy");
assert.equal(categorize(25.0).id, "over");
assert.equal(categorize(29.9).id, "over");
assert.equal(categorize(30.0).id, "obese");

// WHO sub-grades
assert.equal(categorize(15.9).detail, "Severe thinness");
assert.equal(categorize(16.0).detail, "Moderate thinness");
assert.equal(categorize(17.0).detail, "Mild thinness");
assert.equal(categorize(18.5).detail, "");
assert.equal(categorize(27).detail, "");
assert.equal(categorize(34.9).detail, "Class I");
assert.equal(categorize(35.0).detail, "Class II");
assert.equal(categorize(40.0).detail, "Class III");

// No gap between 24.9 and 25: 72.13 kg at 170 cm is 24.96, displays as 25.0
const edge = metric("72.13", "170");
assert.equal(edge.bmi, 25.0);
assert.equal(edge.category.id, "over");

// Validation: each case reports an error on the expected field
const invalid = [
    [metric("", "170"), "weight"],
    [metric("70", ""), "height"],
    [metric("0", "170"), "weight"],
    [metric("-5", "170"), "weight"],
    [metric("abc", "170"), "weight"],
    [metric("70", "1.75"), "height"], // metres instead of cm
    [metric("7000", "170"), "weight"],
    [imperial("150", "", ""), "height"],
    [imperial("150", "5", "12"), "height"],
    [imperial("150", "5", "-1"), "height"],
    [imperial("150", "50", "0"), "height"],
];
for (const [result, field] of invalid) {
    assert.ok(result.errors?.[field], `expected an error on ${field}`);
}

// Only plain decimals are accepted
for (const bad of ["1e2", "0x50", "Infinity", "+70", "7 0", "70kg", "--5"]) {
    assert.ok(metric(bad, "170").errors?.weight, `should reject "${bad}"`);
}
assert.equal(metric(" 70.5 ", "170").bmi, 24.4);
assert.equal(metric(".5e0".replace("e0", ""), "170").errors.weight.includes("between"), true); // 0.5 kg is out of range, not unparsable

// Healthy range: every weight inside it is classed healthy, and the shown
// bounds are inside the 18.5-24.9 band for both unit systems.
for (let cm = 135; cm <= 250; cm += 1) { // below this the range dips under the 20 kg input minimum
    const { range } = metric("70", String(cm));
    for (const w of [range.min, range.max]) {
        assert.equal(metric(String(w), String(cm)).category.id, "healthy", `${w} kg @ ${cm} cm`);
    }
}
for (let ft = 4; ft <= 8; ft++) for (let inch = 0; inch < 12; inch++) {
    if (ft === 4 && inch < 6) continue; // range would dip under the 44 lb input minimum
    const { range } = imperial("150", String(ft), String(inch));
    for (const w of [range.min, range.max]) {
        assert.equal(imperial(String(w), String(ft), String(inch)).category.id, "healthy", `${w} lb @ ${ft}'${inch}"`);
    }
}
assert.deepEqual(metric("70", "175").range, { min: 56.7, max: 76.2, unit: "kg", digits: 1 });
assert.deepEqual(imperial("150", "5", "9").range, { min: 126, max: 168, unit: "lb", digits: 0 });

// Both errors are reported together
const both = metric("", "");
assert.ok(both.errors.weight && both.errors.height);

console.log("All tests passed");
