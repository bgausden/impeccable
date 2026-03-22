import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';

function makeRecorder(implementation = () => {}) {
  const fn = (...args) => {
    fn.calls.push(args);
    return fn.implementation(...args);
  };

  fn.calls = [];
  fn.implementation = implementation;
  return fn;
}

function matchesExpected(actual, expected) {
  if (expected?.__matcher === 'stringContaining') {
    return typeof actual === 'string' && actual.includes(expected.value);
  }

  try {
    assert.deepStrictEqual(actual, expected);
    return true;
  } catch {
    return false;
  }
}

function createExpect(actual, isNegated = false) {
  const run = (assertion) => {
    if (isNegated) {
      try {
        assertion();
      } catch {
        return;
      }
      throw new assert.AssertionError({ message: 'Expected negated assertion to fail' });
    }

    assertion();
  };

  return {
    get not() {
      return createExpect(actual, !isNegated);
    },
    toBe(expected) {
      run(() => assert.strictEqual(actual, expected));
    },
    toEqual(expected) {
      run(() => assert.deepStrictEqual(actual, expected));
    },
    toContain(expected) {
      run(() => {
        if (typeof actual === 'string') {
          assert.ok(actual.includes(expected));
          return;
        }
        assert.ok(Array.isArray(actual) && actual.includes(expected));
      });
    },
    toBeArray() {
      run(() => assert.ok(Array.isArray(actual)));
    },
    toHaveLength(expected) {
      run(() => assert.strictEqual(actual.length, expected));
    },
    toBeUndefined() {
      run(() => assert.strictEqual(actual, undefined));
    },
    toThrow(expected) {
      run(() => assert.throws(actual, expected));
    },
    toHaveBeenCalledWith(...expectedArgs) {
      run(() => {
        assert.ok(actual && Array.isArray(actual.calls), 'Value is not a mock function');
        const matched = actual.calls.some((callArgs) =>
          callArgs.length === expectedArgs.length &&
          callArgs.every((value, index) => matchesExpected(value, expectedArgs[index]))
        );
        assert.ok(matched, `Expected mock to be called with ${JSON.stringify(expectedArgs)}`);
      });
    },
  };
}

export function expect(actual) {
  return createExpect(actual);
}

expect.stringContaining = (value) => ({ __matcher: 'stringContaining', value });

export function mock(implementation = () => {}) {
  return makeRecorder(implementation);
}

export function spyOn(target, property) {
  const original = target[property];
  const recorder = makeRecorder((...args) => original.apply(target, args));

  target[property] = recorder;

  recorder.mockImplementation = (implementation) => {
    recorder.implementation = implementation;
    return recorder;
  };

  recorder.mockReturnValue = (value) => {
    recorder.implementation = () => value;
    return recorder;
  };

  recorder.mockRestore = () => {
    target[property] = original;
  };

  return recorder;
}

export { afterEach, beforeEach, describe, test };
