module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/Agent-Runtime/tests'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.agent-runtime.json' }],
  },
  moduleNameMapper: {
    '^@agent-runtime$': '<rootDir>/packages/Agent-Runtime/src/index.ts',
    '^@agent-runtime/(.*)$': '<rootDir>/packages/Agent-Runtime/src/$1',
  },
};
