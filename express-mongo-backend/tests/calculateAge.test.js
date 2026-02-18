const { calculateAge } = require("../utils/calculateAge");

test("calculateAge retourne un nombre pour une date valide", () => {
  expect(Number.isInteger(calculateAge("2000-01-01"))).toBe(true);
});

test("calculateAge retourne NaN pour une date invalide", () => {
  expect(Number.isNaN(calculateAge("date-invalide"))).toBe(true);
});
