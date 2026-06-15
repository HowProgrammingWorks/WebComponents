const clampInteger = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.trunc(number);
};

const clampNumber = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number;
};

const toString = (value) => {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeStrings = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map(toString).filter((item) => item.length > 0);
};

export { clampInteger, clampNumber, toString, normalizeStrings };
