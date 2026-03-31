/**
 * Predefined test data for system tests
 * Using realistic but varied responses to test the interview flow
 */

export const TEST_USERS = {
  newUser: {
    email: 'systest-newuser@livingvectors.test',
    password: 'TestPassword123!',
    name: 'System Tester',
    phoneNumber: '+1-555-0123',
  },
  existingUser: {
    email: 'systest-existing@livingvectors.test',
    password: 'TestPassword123!',
    name: 'Existing Tester',
    phoneNumber: '+1-555-0456',
  },
};

/**
 * Predefined interview responses
 * These simulate a user completing the career interview
 */
export const INTERVIEW_RESPONSES = {
  techCareerPath: {
    // Question: "What aspects of technology excite you the most?"
    response1: 'Building scalable systems and solving complex problems with code',
    // Question: "Describe your ideal work environment"
    response2: 'Collaborative team with focus on continuous learning and innovation',
    // Question: "What type of problems do you enjoy solving?"
    response3: 'Backend systems, databases, and performance optimization',
    // Question: "What are your career goals for the next 3 years?"
    response4: 'Lead a team of engineers and architect large-scale systems',
    // Question: "What skills do you want to develop?"
    response5: 'Machine learning, distributed systems, and team leadership',
  },
  designCareerPath: {
    response1: 'Creating beautiful, user-centered interfaces and experiences',
    response2: 'Fast-paced startup environment with design autonomy',
    response3: 'Design systems, accessibility, and user research',
    response4: 'Become a design lead and shape product strategy',
    response5: 'Advanced UX research, design systems, and prototyping',
  },
  productCareerPath: {
    response1: 'Understanding user needs and building solutions that matter',
    response2: 'Data-driven culture with cross-functional collaboration',
    response3: 'Market problems, customer discovery, and business strategy',
    response4: 'Head of Product at an innovative company',
    response5: 'Analytics, business acumen, and strategic thinking',
  },
};

/**
 * Profile update test data
 */
export const PROFILE_DATA = {
  validUpdate: {
    name: 'Updated System Test User',
    phoneNumber: '+1-555-0789',
  },
  partialUpdate: {
    name: 'Only Name Changed',
  },
  invalidPhoneNumber: {
    phoneNumber: 'not-a-phone-number',
    expectedError: 'Invalid phone number format',
  },
};

/**
 * Expected job recommendations criteria
 * Used to validate that recommendations match user profile
 */
export const JOB_RECOMMENDATION_VALIDATIONS = {
  minResults: 1,
  maxResults: 50,
  requiredFields: ['title', 'company', 'matchScore', 'description'],
};
