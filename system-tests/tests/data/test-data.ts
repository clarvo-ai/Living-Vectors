/**
 * Profile update test data
 */
export const PROFILE_DATA = {
  validUpdate: {
    name: 'Updated System Test User',
    phoneNumber: '+15550789',
  },
  partialUpdate: {
    name: 'Only Name Changed',
  },
  invalidPhoneNumber: {
    phoneNumber: 'not-a-phone-number',
    expectedError: 'Invalid phone number format',
  },
};
