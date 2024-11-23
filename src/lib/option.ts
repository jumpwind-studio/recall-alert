import { UnwrapError } from './result';

/**
 * Represents an option type that can either be Some or None.
 *
 * @template T The type of the contained value.
 */
export type Option<T> = Some<NonNullable<T>> | None;

export const Option = {
  /**
   * Creates a Some Option.
   *
   * @template T The type of the value.
   *
   * @param {T} value The value to encapsulate in the Some Option.
   *
   * @returns {Some<T>} A Some Option containing the value.
   */
  some<T>(value: NonNullable<T>): Some<NonNullable<T>> {
    return new Some(value) as Some<NonNullable<T>>;
  },

  /**
   * Creates a None Option.
   *
   * @returns {None} A None Option.
   */
  none(): None {
    return new None();
  },

  /**
   * Creates an Option from a nullable value.
   *
   * @template T - The type of the value.
   *
   * @param {T} value - The value to create an Option from. If the value is null
   * or undefined, it returns None. Otherwise, it returns Some.
   *
   * @returns {Option<T>} An Option containing the value if it is not null or
   * undefined, otherwise None.
   */
  fromNullable<T>(value: T): Option<NonNullable<T>> {
    if (value) {
      return Option.some(value);
    }

    return Option.none();
  },
};

/**
 * A type representing a matcher with handlers for `ok` and `err` cases.
 *
 * @template T - The type of the value in the `ok` case.
 * @template U - The type of the result after applying the matcher.
 */
export type OptionMatcher<T, U> = Readonly<{
  /**
   * A function to handle the `some` case.
   *
   * @param {NonNullable<T>} value - The value to be handled in the `some` case.
   * @returns {U} The result after handling the `some` value.
   */
  some: (value: NonNullable<T>) => U;

  /**
   * A function to handle the `none` case.
   *
   * @param {E} value - The value to be handled in the `none` case.
   * @returns {U} The result after handling the `none` value.
   */
  none: () => U;
}>;

/**
 * Represents the Some variant of an Option.
 *
 * @template T - The type of the contained value.
 */
class Some<T> {
  /**
   * A constant tag to identify this instance as "some".
   */
  readonly _tag = 'some' as const;

  /**
   * Creates an instance of Some.
   *
   * @param {T} value - The contained value.
   */
  constructor(private readonly value: NonNullable<T>) {}

  /**
   * Checks if the option is Some.
   *
   * @returns {boolean} True if the option is Some.
   */
  isSome(): this is Some<T> {
    return true;
  }

  /**
   * Checks if the option is None.
   *
   * @returns {boolean} False since this is Some.
   */
  isNone(): this is None {
    return false;
  }

  /**
   * Maps the value contained in Some using the provided function.
   *
   * @template U - The type of the value after applying the function.
   *
   * @param {(value: T) => U} fn - The function to apply to the value.
   *
   * @returns {Some<U>} A new Some instance containing the result of the function.
   */
  map<U>(fn: (value: T) => NonNullable<U>): Some<U> {
    return Option.some(fn(this.value));
  }

  /**
   * Applies the provided function to the value contained in Some, chaining the
   * results.
   *
   * @template U - The type of the value in the result of the function.
   *
   * @param {(value: T) => Option<NonNullable<U>>} fn - The function applied to
   * the value.
   *
   * @returns {Option<U>} The result of applying the function.
   */
  andThen<U>(fn: (value: T) => Option<NonNullable<U>>): Option<U> {
    return fn(this.value);
  }

  /**
   * Matches the option using the provided matcher.
   *
   * @template U - The type of the result after applying the matcher.
   *
   * @param {OptionMatcher<T,  U>} matcher - The matcher to apply.
   *
   * @returns {U} The result of the matcher.
   */
  match<U>(matcher: OptionMatcher<T, U>): U {
    return matcher.some(this.value);
  }

  /**
   * Unwraps the value contained in the `Option`, throwing an error with the
   * provided message if the value is `None`.
   *
   * @param {string} [_message] - The message for the error (optional).
   *
   * @returns {T} The contained value.
   */
  unwrap(_message?: string): T {
    return this.value;
  }

  /**
   * Unwraps the value contained in Some or returns the provided default value.
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
}

/**
 * Represents the None variant of an Option.
 */
class None {
  /**
   * A constant tag to identify this instance as "none".
   */
  readonly _tag = 'none' as const;

  /**
   * Checks if the option is Some.
   *
   * @returns {boolean} False since this is None.
   */
  isSome(): this is Some<unknown> {
    return false;
  }

  /**
   * Checks if the option is None.
   *
   * @returns {boolean} True if the option is None.
   */
  isNone(): this is None {
    return true;
  }

  /**
   * Maps the value contained in None, returning the current None instance.
   *
   * @template U - The type of the value after applying the function.
   *
   * @param {(value: never) => U} _fn - The function to apply to the value (ignored).
   *
   * @returns {None} The current None instance.
   */
  map<U>(_fn: (value: never) => U): None {
    return this;
  }

  /**
   * Applies the provided function to the value contained in None, returning the current None instance.
   *
   * @template U - The type of the value in the result of the function.
   *
   * @param {(value: never) => Option<U>} _fn - The function to apply to the value (ignored).
   *
   * @returns {None} The current None instance.
   */
  andThen<U>(_fn: (value: never) => Option<U>): None {
    return this;
  }

  /**
   * Matches the option using the provided matcher.
   *
   * @template U - The type of the result after applying the matcher.
   *
   * @param {OptionMatcher<never, void, U>} matcher - The matcher to apply.
   *
   * @returns {U} The result of the matcher.
   */
  match<U>(matcher: OptionMatcher<never, U>): U {
    return matcher.none();
  }

  /**
   * Unwraps the value contained in the `Option`, throwing an error with the
   * provided message if the value is `None`.
   *
   * @param {string} [message] - The message for the error (optional).
   *
   * @returns {T} The contained value.
   */
  unwrap(message?: string): never {
    throw new UnwrapError(message ?? 'Option is none');
  }

  /**
   * Unwraps the value contained in None or returns the provided default value.
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
}
