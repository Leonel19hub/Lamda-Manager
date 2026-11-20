/**
 * Result pattern for pure functional error handling (Either/Result)
 * Zero external dependencies, 100% strict TypeScript
 */

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export type Result<T, E = ValidationError> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export const ok = <T>(data: T): Result<T, never> => ({
  success: true,
  data,
});

export const fail = <E = ValidationError>(error: E): Result<never, E> => ({
  success: false,
  error,
});

export const isOk = <T, E>(result: Result<T, E>): result is { success: true; data: T } =>
  result.success;

export const isFail = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  !result.success;
