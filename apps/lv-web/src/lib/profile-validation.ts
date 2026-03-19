export const PROFILE_FIELD_LIMITS = {
  firstName: 50,
  lastName: 50,
  displayName: 100,
  phone: 20,
  bio: 500,
} as const;

const PHONE_ALLOWED_CHARS_REGEX = /^[+\-()0-9]+$/;

export const normalizePhoneInput = (value: string) => {
  return value.replace(/[^+\-()0-9]/g, '').slice(0, PROFILE_FIELD_LIMITS.phone);
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
  return PHONE_ALLOWED_CHARS_REGEX.test(value);
};
