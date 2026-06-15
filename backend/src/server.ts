import { buildApp } from "./app";
import { env } from "./env";
import { startEnrichmentWorker } from "./jobs/enrichmentWorker";

const app = buildApp();

app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((error: unknown) => {
  app.log.error(error);
  process.exit(1);
});

startEnrichmentWorker();
