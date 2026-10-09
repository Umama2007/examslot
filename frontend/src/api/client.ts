const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function fetchClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = localStorage.getItem("access_token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: "include",
  };

  let response = await fetch(url, config);
  
  // Basic retry logic for 401 could go here, for now we just throw
  
  if (!response.ok) {
    let data;
    try {
      data = await response.json();
    } catch {
      data = { detail: response.statusText };
    }
    
    let message = data.detail;
    if (typeof data.detail === 'object' && data.detail !== null && data.detail.message) {
      message = data.detail.message;
    }
    
    throw new ApiError(
      response.status,
      message || response.statusText,
      data
    );
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  
  return JSON.parse(text) as T;
}
