const { calculateAge } = require("../utils/calculateAge");

function validateAdult(req, res, next) {
  const { dateDeNaissance } = req.body;

  if (!dateDeNaissance) {
    return res.status(400).json({ message: "dateDeNaissance is required." });
  }

  const age = calculateAge(dateDeNaissance);

  if (Number.isNaN(age)) {
    return res.status(400).json({ message: "dateDeNaissance is invalid." });
  }

  if (age < 18) {
    return res.status(400).json({ message: "Provider must be at least 18 years old." });
  }

  req.calculatedAge = age;
  return next();
}

module.exports = validateAdult;
