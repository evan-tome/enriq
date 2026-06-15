import type { App } from "../app";

export async function healthRoutes(app: App) {
  app.get("/health", async () => ({ status: "ok" }));
}
