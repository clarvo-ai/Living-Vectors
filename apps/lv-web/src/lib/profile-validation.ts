export const PROFILE_FIELD_LIMITS = {
  firstName: 50,
  lastName: 50,
  displayName: 100,
  phone: 20,
  bio: 500,
} as const;

const PHONE_ALLOWED_CHARS_REGEX = /^(\+)?[\d\-()]+$/;

export const normalizePhoneInput = (value: string) => {
  const startsWithPlus = value.trimStart().startsWith('+');

  // Remove all + signs and other non-allowed characters
  const withoutPlus = value.replace(/\+/g, '').replace(/[^\-()0-9]/g, '');

  // Only add + back if it was at the beginning of the original input
  const normalized = startsWithPlus ? '+' + withoutPlus : withoutPlus;

  // Remove leading -, (, ) characters: only + and digits are allowed at the start
  const trimmedStart = normalized.replace(/^[\-()]+/, '');

  // Truncate to the limit
  return trimmedStart.slice(0, PROFILE_FIELD_LIMITS.phone);
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
