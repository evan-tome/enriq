/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["./tests/setup.ts"],
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  maxWorkers: 1,
};
