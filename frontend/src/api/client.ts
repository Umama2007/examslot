const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  data: unknown;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.fieldErrors = {};

    // Parse 422 Unprocessable Entity field errors (Pydantic validation)
    if (status === 422 && data && typeof data === 'object') {
      const d = data as { detail?: unknown };
      if (Array.isArray(d.detail)) {
        for (const err of d.detail) {
          if (err.loc && err.msg) {
            const field = (err.loc as string[]).slice(-1)[0] ?? 'field';
            this.fieldErrors[field] = err.msg;
          }
        }
      }
    }
  }
}

/**
 * Maps HTTP status codes and error shapes to user-friendly messages.
 */
function parseErrorMessage(status: number, data: unknown): string {
  if (data && typeof data === 'object') {
    const d = data as { detail?: unknown; message?: string };

    // Flat string detail
    if (typeof d.detail === 'string') return d.detail;

    // Object detail with message field (e.g. 409 conflict)
    if (d.detail && typeof d.detail === 'object') {
      const detail = d.detail as { message?: string };
      if (detail.message) return detail.message;
    }

    // Array of validation errors
    if (Array.isArray(d.detail)) {
      return d.detail.map((e: { msg?: string }) => e.msg ?? String(e)).join('; ');
    }

    if (d.message) return d.message;
  }

  switch (status) {
    case 400: return 'Bad request.';
    case 401: return 'You are not logged in. Please sign in.';
    case 403: return 'You do not have permission to do that.';
    case 404: return 'Resource not found.';
    case 409: return 'Conflict: this action cannot be completed.';
    case 422: return 'Validation error. Check the form fields.';
    case 423: return 'This resource is locked and cannot be changed.';
    case 429: return 'Too many requests. Please wait a moment.';
    case 500: return 'Server error. Please try again later.';
    default:  return `Request failed (${status}).`;
  }
}

export async function fetchClient<T>(
  endpoint: string,
  options: RequestInit = {},
  _retryCount = 0
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers ?? {});

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = localStorage.getItem('access_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const config: RequestInit = { ...options, headers, credentials: 'include' };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (networkErr) {
    // Network failure — surface as ApiError so UI can show retry
    throw new ApiError(0, 'Network error. Check your connection.', networkErr);
  }

  // 401 → try silent refresh once
  if (response.status === 401 && _retryCount === 0) {
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const { access_token } = (await refreshRes.json()) as { access_token: string };
        localStorage.setItem('access_token', access_token);
        // Retry original request once
        return fetchClient<T>(endpoint, options, 1);
      }
    } catch {
      // Refresh failed — fall through to throw the 401
    }
    localStorage.removeItem('access_token');
  }

  if (!response.ok) {
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { detail: response.statusText };
    }
    throw new ApiError(response.status, parseErrorMessage(response.status, data), data);
  }

  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
