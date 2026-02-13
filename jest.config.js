/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/packages", "<rootDir>/tests"],
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],
  collectCoverageFrom: ["packages/*/src/**/*.ts", "!**/*.d.ts", "!**/node_modules/**"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    "^@relay/core$": "<rootDir>/packages/core/src",
    "^@relay/core/(.*)$": "<rootDir>/packages/core/src/$1",
  },
};
