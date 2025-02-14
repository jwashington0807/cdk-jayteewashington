import { Config } from '@jest/types';

const baseTestDirectory = '<rootDir>/test/';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    `${baseTestDirectory}/**/*test.ts`
  ]
}

export default config;
