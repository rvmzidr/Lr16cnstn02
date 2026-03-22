function toBigInt(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return BigInt(value);
}

function toNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return Number(value);
}

module.exports = {
  toBigInt,
  toNumber,
};
