/// <reference types="jest" />

/* eslint-disable no-var */
declare global {
  var describe: jest.Describe
  var it: jest.It
  var expect: jest.Expect
  var beforeEach: jest.Lifecycle
  var afterEach: jest.Lifecycle
  var beforeAll: jest.Lifecycle
  var afterAll: jest.Lifecycle
  var jest: typeof import('jest')
  var test: jest.It
}
/* eslint-enable no-var */

export {}
