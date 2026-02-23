function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, ""); // remove spaces
}

module.exports = normalizeName;
