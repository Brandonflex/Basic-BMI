// Run with: node bmi.test.js
const assert = require("node:assert/strict");
const { computeResult, categorize } = require("./bmi.js");

// Metric
assert.equal(computeResult("70", "175", "metric").bmi, 22.9);
assert.equal(computeResult("70", "175", "metric").category.id, "healthy");

// Imperial matches the classic 703 formula: 150 lb, 65 in -> 25.0
assert.equal(computeResult("150", "65", "imperial").bmi, 25.0);

// Category boundaries (on the displayed, one-decimal value)
assert.equal(categorize(18.4).id, "under");
assert.equal(categorize(18.5).id, "healthy");
assert.equal(categorize(24.9).id, "healthy");
assert.equal(categorize(25.0).id, "over");
assert.equal(categorize(29.9).id, "over");
assert.equal(categorize(30.0).id, "obese");

// No gap between 24.9 and 25: 72.13 kg at 170 cm is 24.96, displays as 25.0
const edge = computeResult("72.13", "170", "metric");
assert.equal(edge.bmi, 25.0);
assert.equal(edge.category.id, "over");

// Validation
for (const [w, h] of [["", "170"], ["70", ""], ["0", "170"], ["-5", "170"], ["abc", "170"], ["70", "1.75"], ["7000", "170"]]) {
    assert.ok(computeResult(w, h, "metric").errors, `expected error for ${w}/${h}`);
}

console.log("All tests passed");
