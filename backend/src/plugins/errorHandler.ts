import type { FastifyError, FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import fp from "fastify-plugin";

import { AppError } from "../lib/errors";

export default fp(async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.name, message: error.message });
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: "ValidationError",
        message: "Request validation failed",
        issues: error.validation,
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: error.name, message: error.message });
    }

    request.log.error(error);
    return reply.status(500).send({ error: "InternalServerError", message: "Something went wrong" });
  });
});
