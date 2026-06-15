import { type App } from "../src/app";
import { env } from "../src/env";

export const credentials = { email: "test@example.com", password: "password123" };

export function register(app: App, payload: { email: string; password: string } = credentials) {
  return app.inject({ method: "POST", url: "/auth/register", payload });
}

export function login(app: App, payload: { email: string; password: string } = credentials) {
  return app.inject({ method: "POST", url: "/auth/login", payload });
}

export async function registerAndLogin(
  app: App,
  payload: { email: string; password: string } = credentials,
) {
  await register(app, payload);
  const response = await login(app, payload);
  const refreshCookie = response.cookies.find((cookie) => cookie.name === env.REFRESH_COOKIE_NAME);

  return { accessToken: response.json().access_token as string, refreshCookie: refreshCookie!.value };
}

export async function createWorkspace(app: App, accessToken: string, name = "Test Workspace") {
  const response = await app.inject({
    method: "POST",
    url: "/workspaces",
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { name },
  });

  return response.json();
}
