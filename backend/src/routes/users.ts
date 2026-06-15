import type { App } from "../app";
import { userPublicSchema } from "../schemas/user.schema";

export async function userRoutes(app: App) {
  app.get(
    "/me",
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: userPublicSchema } },
    },
    async (request) => {
      const user = request.user!;

      return { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() };
    },
  );
}
