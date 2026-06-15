import { processNextApprovedItem, type EnrichmentTickResult } from "../services/enrichmentService";

const POLL_INTERVAL_MS = 10_000;

export interface EnrichmentWorkerStatus {
  started: boolean;
  processing: boolean;
  lastTickAt: string | null;
  lastResult: EnrichmentTickResult | null;
  lastError: string | null;
  lastErrorAt: string | null;
}

const status: EnrichmentWorkerStatus = {
  started: false,
  processing: false,
  lastTickAt: null,
  lastResult: null,
  lastError: null,
  lastErrorAt: null,
};

/** Returns a snapshot of the in-process enrichment worker's status. */
export function getEnrichmentWorkerStatus(): EnrichmentWorkerStatus {
  return { ...status };
}

/** Starts polling for APPROVED triage items and enriching them. Returns a function to stop polling. */
export function startEnrichmentWorker(): () => void {
  let stopped = false;

  status.started = true;

  async function tick(): Promise<void> {
    if (stopped || status.processing) {
      return;
    }

    status.processing = true;

    try {
      let result = await processNextApprovedItem();
      status.lastTickAt = new Date().toISOString();
      status.lastResult = result;

      while (!stopped && result === "PROCESSED") {
        result = await processNextApprovedItem();
        status.lastTickAt = new Date().toISOString();
        status.lastResult = result;
      }
    } catch (error) {
      console.error("Enrichment worker error:", error);
      status.lastError = error instanceof Error ? error.message : String(error);
      status.lastErrorAt = new Date().toISOString();
    } finally {
      status.processing = false;
    }
  }

  const interval = setInterval(() => void tick(), POLL_INTERVAL_MS);
  void tick();

  return () => {
    stopped = true;
    status.started = false;
    clearInterval(interval);
  };
}
