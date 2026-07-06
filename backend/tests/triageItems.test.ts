import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { type App, buildApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { createWorkspace, registerAndLogin } from "./helpers";

async function createWebhookSource(app: App, accessToken: string, workspaceId: string) {
  const response = await app.inject({
    method: "POST",
    url: `/workspaces/${workspaceId}/webhook-sources`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { name: "Sentry" },
  });

  return response.json();
}

describe("triage items", () => {
  let app: App;

  beforeEach(async () => {
    await prisma.user.deleteMany();
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("ingests a payload with a valid api key and rejects an invalid one", async () => {
    const { accessToken } = await registerAndLogin(app);
    const workspace = await createWorkspace(app, accessToken);
    const source = await createWebhookSource(app, accessToken, workspace.id);

    const ingestResponse = await app.inject({
      method: "POST",
      url: "/webhooks/ingest",
      headers: { "x-api-key": source.apiKey },
      payload: { message: "Something broke", level: "error" },
    });

    expect(ingestResponse.statusCode).toBe(201);
    expect(ingestResponse.json().id).toBeTypeOf("string");

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/webhooks/ingest",
      headers: { "x-api-key": "not-a-real-key" },
      payload: { message: "Something broke" },
    });

    expect(invalidResponse.statusCode).toBe(401);
  });

  it("lists triage items created by ingest, with status filtering", async () => {
    const { accessToken } = await registerAndLogin(app);
    const workspace = await createWorkspace(app, accessToken);
    const source = await createWebhookSource(app, accessToken, workspace.id);

    const payload = { message: "Something broke", level: "error" };
    await app.inject({
      method: "POST",
      url: "/webhooks/ingest",
      headers: { "x-api-key": source.apiKey },
      payload,
    });

    const pendingResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/triage-items?status=PENDING`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(pendingResponse.statusCode).toBe(200);
    const pendingBody = pendingResponse.json();
    expect(pendingBody).toHaveLength(1);
    expect(pendingBody[0].status).toBe("PENDING");
    expect(pendingBody[0].rawPayload).toEqual(payload);

    const approvedResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/triage-items?status=APPROVED`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(approvedResponse.json()).toHaveLength(0);
  });

  it("gets and updates a single triage item", async () => {
    const { accessToken } = await registerAndLogin(app);
    const workspace = await createWorkspace(app, accessToken);
    const source = await createWebhookSource(app, accessToken, workspace.id);

    await app.inject({
      method: "POST",
      url: "/webhooks/ingest",
      headers: { "x-api-key": source.apiKey },
      payload: { message: "Something broke" },
    });

    const list = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/triage-items`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const itemId = list.json()[0].id;

    const getResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/triage-items/${itemId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().id).toBe(itemId);

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/workspaces/${workspace.id}/triage-items/${itemId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { status: "APPROVED" },
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().status).toBe("APPROVED");
  });

  it("rejects access from a user who is not a workspace member", async () => {
    const owner = await registerAndLogin(app);
    const workspace = await createWorkspace(app, owner.accessToken);

    const outsider = await registerAndLogin(app, {
      email: "outsider@example.com",
      password: "password123",
    });

    const response = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/triage-items`,
      headers: { authorization: `Bearer ${outsider.accessToken}` },
    });
    expect(response.statusCode).toBe(403);
  });
});
