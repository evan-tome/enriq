import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { type App, buildApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { createWorkspace, registerAndLogin } from "./helpers";

describe("webhook sources", () => {
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

  it("creates a webhook source and returns a one-time api key", async () => {
    const { accessToken } = await registerAndLogin(app);
    const workspace = await createWorkspace(app, accessToken);

    const response = await app.inject({
      method: "POST",
      url: `/workspaces/${workspace.id}/webhook-sources`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Sentry" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.name).toBe("Sentry");
    expect(body.apiKey).toBeTypeOf("string");
    expect(body.apiKey.length).toBeGreaterThan(0);
    expect(body.payloadCount).toBe(0);
    expect(body.lastReceivedAt).toBeNull();
  });

  it("lists webhook sources for a workspace", async () => {
    const { accessToken } = await registerAndLogin(app);
    const workspace = await createWorkspace(app, accessToken);

    await app.inject({
      method: "POST",
      url: `/workspaces/${workspace.id}/webhook-sources`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Sentry" },
    });

    const response = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/webhook-sources`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Sentry");
    expect(body[0].apiKey).toBeUndefined();
  });

  it("deletes a webhook source", async () => {
    const { accessToken } = await registerAndLogin(app);
    const workspace = await createWorkspace(app, accessToken);

    const created = await app.inject({
      method: "POST",
      url: `/workspaces/${workspace.id}/webhook-sources`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Sentry" },
    });
    const source = created.json();

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/workspaces/${workspace.id}/webhook-sources/${source.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(deleteResponse.statusCode).toBe(204);

    const listResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/webhook-sources`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(listResponse.json()).toHaveLength(0);
  });

  it("rejects access from a user who is not a workspace member", async () => {
    const owner = await registerAndLogin(app);
    const workspace = await createWorkspace(app, owner.accessToken);

    const outsider = await registerAndLogin(app, {
      email: "outsider@example.com",
      password: "password123",
    });

    const listResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/webhook-sources`,
      headers: { authorization: `Bearer ${outsider.accessToken}` },
    });
    expect(listResponse.statusCode).toBe(403);

    const createResponse = await app.inject({
      method: "POST",
      url: `/workspaces/${workspace.id}/webhook-sources`,
      headers: { authorization: `Bearer ${outsider.accessToken}` },
      payload: { name: "Sentry" },
    });
    expect(createResponse.statusCode).toBe(403);
  });
});
