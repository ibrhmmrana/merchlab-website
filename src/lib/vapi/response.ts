/**
 * Standardized response helpers for Vapi API endpoints
 */

export interface VapiSuccessResponse<T> {
  ok: true;
  data: T;
  spoken_summary: string;
}

export interface VapiErrorResponse {
  ok: false;
  error: string;
  hint: string;
}

export type VapiResponse<T> = VapiSuccessResponse<T> | VapiErrorResponse;

/**
 * Create a success response with spoken summary
 */
export function successResponse<T>(
  data: T,
  spoken_summary: string
): VapiSuccessResponse<T> {
  return {
    ok: true,
    data,
    spoken_summary,
  };
}

/**
 * Create an error response with hint
 */
export function errorResponse(
  error: string,
  hint: string
): VapiErrorResponse {
  return {
    ok: false,
    error,
    hint,
  };
}
