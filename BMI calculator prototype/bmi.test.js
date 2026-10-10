// Run with: node bmi.test.js
const assert = require("node:assert/strict");
const { computeResult, categorize } = require("./bmi.js");

const metric = (weight, height) => computeResult({ weight, height, system: "metric" });
const imperial = (weight, height, inches) => computeResult({ weight, height, inches, system: "imperial" });

// Metric
assert.equal(metric("70", "175").bmi, 22.9);
assert.equal(metric("70", "175").category.id, "healthy");

// Imperial matches the classic lb/in formula (x703): 150 lb, 5 ft 5 in -> 25.0
assert.equal(imperial("150", "5", "5").bmi, 25.0);
assert.equal(imperial("150", "5", "").bmi, 29.3); // inches optional

// Category boundaries (on the displayed, one-decimal value)
assert.equal(categorize(18.4).id, "under");
assert.equal(categorize(18.5).id, "healthy");
assert.equal(categorize(24.9).id, "healthy");
assert.equal(categorize(25.0).id, "over");
assert.equal(categorize(29.9).id, "over");
assert.equal(categorize(30.0).id, "obese");

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

// Both errors are reported together
const both = metric("", "");
assert.ok(both.errors.weight && both.errors.height);

console.log("All tests passed");
