const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export { API_BASE_URL }

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = options.body !== undefined ? { "Content-Type": "application/json" } : {}

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...headers, ...options.headers },
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, body?.message ?? response.statusText)
  }

  return body as T
}

export function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` }
}

export function getErrorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong"
}

export interface User {
  id: string
  email: string
  createdAt: string
}

export interface TokenResponse {
  access_token: string
  token_type: "bearer"
}

export function register(email: string, password: string) {
  return request<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function login(email: string, password: string) {
  return request<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function refresh() {
  return request<TokenResponse>("/auth/refresh", { method: "POST" })
}

export function logout() {
  return request<{ message: string }>("/auth/logout", { method: "POST" })
}

export function getCurrentUser(accessToken: string) {
  return request<User>("/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
