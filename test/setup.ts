// Global test setup
// Suppress console.error during tests to reduce noise
// These are expected errors that we're testing for

const originalError = console.error;

beforeAll(() => {
  // Mock console.error to suppress output during tests
  console.error = () => {
    // Intentionally empty to suppress error output
  };
});

afterAll(() => {
  console.error = originalError;
});
