/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["./tests/setup.ts"],
  testMatch: ["<rootDir>/tests/**/*.test.ts", "!<rootDir>/tests/migration.smoke.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "migration.smoke.test.ts"],
  maxWorkers: 1,
};
