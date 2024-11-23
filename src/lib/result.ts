import { TaggedError } from './error';

/**
 * Represents a type that can either be a successful result (Ok) or an error
 * result (Err).
 *
 * @template T The type of the successful value.
 * @template E The type of the error.
 */
export type Result<T, E> = Ok<T> | Err<E>;

export const Result = {
  /**
   * Creates an Ok Result.
   *
   * @template T The type of the value.
   *
   * @param {T} value The value to encapsulate in the Ok Result.
   *
   * @returns {Ok<T>} An Ok Result containing the value.
   */
  ok<T>(value: T): Ok<T> {
    return new Ok(value);
  },

  /**
   * Creates an Error Result.
   *
   * @template E The type of the error.
   *
   * @param {E} value The error to encapsulate in the Error Result.
   *
   * @returns {Err<E>} An Error Result containing the error.
   */
  err<E>(value: E): Err<E> {
    return new Err(value);
  },

  /**
   * Attempts to execute a function and captures any errors that occur,
   * returning a `Result` type.
   *
   * @template T - The type of the successful result.
   *
   * @param {() => T | Promise<T>} fn - The function to execute. It can return a
   * value or a promise that resolves to a value.
   *
   * @returns {Result<T, TryCatchError> | Promise<Result<T, TryCatchError>>}
   * A `Result` containing either the successful result or an error.
   */
  try<T>(fn: () => T | Promise<T>): Result<T, TryCatchError> | Promise<Result<T, TryCatchError>> {
    try {
      const result = fn();

      if (result instanceof Promise) {
        return result.then(Result.ok);
      }

      return Result.ok(result);
    } catch (error) {
      return Result.err(new TryCatchError({ cause: error }));
    }
  },
};

export class UnwrapError extends TaggedError {
  readonly _tag = 'UnwrapError' as const;
}

export class TryCatchError extends TaggedError {
  readonly _tag = 'TryCatchError' as const;

  constructor(options: ErrorOptions & { cause: unknown }) {
    super('TryCatchError', options);
  }
}

/**
 * A type representing a matcher with handlers for `ok` and `err` cases.
 *
 * @template T - The type of the value in the `ok` case.
 * @template E - The type of the value in the `err` case.
 * @template U - The type of the result after applying the matcher.
 */
export type ResultMatcher<T, E, U> = Readonly<{
  /**
   * A function to handle the `ok` case.
   *
   * @param {T} value - The value to be handled in the `ok` case.
   * @returns {U} The result after handling the `ok` value.
   */
  ok: (value: T) => U;

  /**
   * A function to handle the `err` case.
   *
   * @param {E} value - The value to be handled in the `err` case.
   * @returns {U} The result after handling the `err` value.
   */
  err: (value: E) => U;
}>;

/**
 * Represents a successful result.
 *
 * @template T - The type of the successful value.
 */
class Ok<T> {
  /**
   * A constant tag to identify this instance as "ok".
   */
  readonly _tag = 'ok' as const;

  /**
   * Creates an instance of Ok.
   *
   * @param {T} value - The successful value.
   */
  constructor(private readonly value: T) {}

  /**
   * Checks if the result is an `Ok`.
   *
   * @returns {boolean} True if the result is an `Ok`.
   */
  isOk(): this is Ok<T> {
    return true;
  }

  /**
   * Checks if the result is an `Err`.
   *
   * @returns {boolean} False since this is an `Ok`.
   */
  isErr(): this is Err<unknown> {
    return false;
  }

  /**
   * Maps the value contained in the `Ok` using the provided function.
   *
   * @template U - The type of the value after applying the function.
   *
   * @param {(value: T) => U} fn - The function to apply to the value.
   *
   * @returns {Ok<U>} A new `Ok` instance containing the result of the function.
   */
  map<U>(fn: (value: T) => U): Ok<U> {
    return Result.ok(fn(this.value));
  }

  /**
   * Maps the error value if the result is an `Err`, otherwise returns the
   * current `Ok` instance.
   *
   * @template E - The type of the original error value.
   *
   * @template F - The type of the error value after applying the function.
   *
   * @param {(value: E) => F} _fn - The function to apply to the error value
   * (ignored).
   *
   * @returns {Ok<T>} The current `Ok` instance.
   */
  mapError<F>(_fn: (value: never) => F): Ok<T> {
    return this;
  }

  /**
   * Applies the provided function to the value contained in the `Ok`, chaining
   * the results.
   *
   * @template U - The type of the value in the result of the function.
   *
   * @template E - The type of the error in the result of the function.
   *
   * @param {(value: T) => Result<U, E>} fn - The function applied to the value.
   *
   * @returns {Result<U, E>} The result of applying the function.
   */
  andThen<U, E>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  /**
   * Matches the result using the provided matcher.
   *
   * @template U - The type of the result after applying the matcher.
   *
   * @param {ResultMatcher<T, never, U>} matcher - The matcher to apply.
   *
   * @returns {U} The result of the matcher.
   */
  match<U>(matcher: ResultMatcher<T, never, U>): U {
    return matcher.ok(this.value);
  }

  /**
   * Unwraps the value contained in the `Result`, throwing an error with the
   * provided message if the value is an `Err`.
   *
   * @param {string} [_message] - The message for the error (optional).
   *
   * @throws {Error} An error indicating that the result is `Err`.
   */
  unwrap(_message?: string): T {
    return this.value;
  }

  /**
   * Unwraps the value contained in `Ok` or returns the provided default value.
   *
   * @template U - The type of the default value.
   *
   * @param {U} _or - The default value (ignored).
   *
   * @returns {T} The contained value.
   */
  unwrapOr<U>(_or: U): T {
    return this.value;
  }

  /**
   * Unwraps the error value contained in `Err`, throwing an error since this is
   * an `Ok`.
   *
   * @throws {Error} An error indicating that the result is `Ok`.
   */
  unwrapError(): never {
    throw new UnwrapError(`Result is ok: ${this.value}`);
  }
}

/**
 * Represents an erroneous result.
 *
 * @template E - The type of the error value.
 */
class Err<E> {
  /**
   * A constant tag to identify this instance as "err".
   */
  readonly _tag = 'err' as const;

  /**
   * Creates an instance of Err.
   *
   * @param {E} value - The error value.
   */
  constructor(private readonly value: E) {}

  /**
   * Checks if the result is an `Ok`.
   *
   * @returns {boolean} False since this is an `Err`.
   */
  isOk(): this is Ok<unknown> {
    return false;
  }

  /**
   * Checks if the result is an `Err`.
   *
   * @returns {boolean} True if the result is an `Err`.
   */
  isErr(): this is Err<E> {
    return true;
  }

  /**
   * Maps the value contained in the `Err`, returning the current `Err`
   * instance.
   *
   * @template U - The type of the value after applying the function.
   *
   * @param {(value: never) => U} _fn - The function to apply to the value
   * (ignored).
   *
   * @returns {Err<E>} The current `Err` instance.
   */
  map<U>(_fn: (value: never) => U): Err<E> {
    return this;
  }

  /**
   * Maps the error value using the provided function.
   *
   * @template F - The type of the error value after applying the function.
   *
   * @param {(value: E) => F} fn - The function to apply to the error value.
   *
   * @returns {Err<F>} A new `Err` instance containing the result of the
   * function.
   */
  mapError<F>(fn: (value: E) => F): Err<F> {
    return Result.err(fn(this.value));
  }

  /**
   * Applies the provided function to the value contained in the `Err`,
   * returning the current `Err` instance.
   *
   * @template U - The type of the value in the result of the function.
   *
   * @template F - The type of the error in the result of the function.
   *
   * @param {(value: never) => Result<U, F>} _fn - The function to apply to the
   * value (ignored).
   *
   * @returns {Err<E>} The current `Err` instance.
   */
  andThen<U, F>(_fn: (value: never) => Result<U, F>): Err<E> {
    return this;
  }

  /**
   * Matches the result using the provided matcher.
   *
   * @template U - The type of the result after applying the matcher.
   *
   * @param {ResultMatcher<never, E, U>} matcher - The matcher to apply.
   *
   * @returns {U} The result of the matcher.
   */
  match<U>(matcher: ResultMatcher<never, E, U>): U {
    return matcher.err(this.value);
  }

  /**
   * Unwraps the value contained in the `Result`, throwing an error with the
   * provided message if the value is an `Err`.
   *
   * @param {string} [message] - The message for the error (optional).
   *
   * @throws {Error} An error indicating that the result is `Err`.
   */
  unwrap(message?: string): never {
    throw new UnwrapError(message ?? `Result is error: ${this.value}`);
  }

  /**
   * Unwraps the value contained in the `Err` or returns the provided default
   * value.
   *
   * @template U - The type of the default value.
   *
   * @param {U} or - The default value.
   *
   * @returns {U} The provided default value.
   */
  unwrapOr<U>(or: U): U {
    return or;
  }

  /**
   * Unwraps the error value contained in the `Err`.
   *
   * @returns {E} The contained error value.
   */
  unwrapError(): E {
    return this.value;
  }
}
