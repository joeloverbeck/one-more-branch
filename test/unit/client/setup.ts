const originalConsoleError = console.error;

beforeEach(() => {
  // Suppress console.error output during client tests.
  // app.js catch blocks log errors that pollute test output.
  // Uses direct assignment (not jest.spyOn) so jest.restoreAllMocks()
  // in individual test afterEach blocks doesn't undo this.
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});
