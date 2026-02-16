function calculateAge(dateInput) {
  const birthDate = new Date(dateInput);

  if (Number.isNaN(birthDate.getTime())) {
    return Number.NaN;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDiff = today.getMonth() - birthDate.getMonth();
  const hasBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age;
}

module.exports = { calculateAge };
