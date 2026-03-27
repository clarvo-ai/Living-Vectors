export const PROFILE_FIELD_LIMITS = {
  firstName: 50,
  lastName: 50,
  displayName: 100,
  phone: 20,
  bio: 500,
} as const;

export const PHONE_MIN_DIGITS = 6;

const PHONE_ALLOWED_CHARS_REGEX = /^\+?\d+$/;

export const normalizePhoneInput = (value: string) => {
  return value.trim().slice(0, PROFILE_FIELD_LIMITS.phone);
};

export const normalizePhoneForDisplay = (value: string | null | undefined) => {
  if (!value) return '';
  return normalizePhoneInput(value);
};

export const normalizePhoneForStorage = (value: string | null | undefined) => {
  if (!value) return null;

  const normalizedPhone = normalizePhoneInput(value);
  return normalizedPhone === '' ? null : normalizedPhone;
};

export const isPhoneCharactersValid = (value: string | null | undefined) => {
  if (!value) return true;

  // Check format is valid
  if (!PHONE_ALLOWED_CHARS_REGEX.test(value)) return false;

  // Phone number must contain at least one digit
  return /\d/.test(value);
};

export const isPhoneMinLengthValid = (value: string | null | undefined) => {
  if (!value) return true;

  const digitCount = (value.match(/\d/g) || []).length;
  return digitCount >= PHONE_MIN_DIGITS;
};
