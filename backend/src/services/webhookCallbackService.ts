import type { TriageItemDto } from "../schemas/triageItem.schema";

/** Fires a POST to a webhook source's configured callback URL. Never throws. */
export async function sendApprovalCallback(callbackUrl: string, item: TriageItemDto): Promise<void> {
  try {
    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "triage_item.approved", triageItem: item }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`Approval callback to ${callbackUrl} failed with status ${response.status}`);
    }
  } catch (error) {
    console.error(`Approval callback to ${callbackUrl} failed:`, error);
  }
}

const TEST_CALLBACK_PAYLOAD: TriageItemDto = {
  id: "00000000-0000-0000-0000-000000000000",
  workspaceId: "00000000-0000-0000-0000-000000000000",
  webhookSourceId: "00000000-0000-0000-0000-000000000000",
  rawPayload: {},
  title: "Sample bug report",
  description: "This is a test callback sent from the Webhook Sources page.",
  reporter: "Test Player",
  status: "APPROVED",
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

export async function sendTestApprovalCallback(callbackUrl: string): Promise<void> {
  return sendApprovalCallback(callbackUrl, TEST_CALLBACK_PAYLOAD);
}
