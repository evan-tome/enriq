import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { type App, buildApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { createWorkspace, registerAndLogin } from "./helpers";

describe("issues", () => {
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

  it("creates an issue without a triage item", async () => {
    const { accessToken } = await registerAndLogin(app);
    const workspace = await createWorkspace(app, accessToken);

    const response = await app.inject({
      method: "POST",
      url: `/workspaces/${workspace.id}/issues`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: "Fix login bug", description: "Login fails for some users" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.title).toBe("Fix login bug");
    expect(body.source).toBe("WEBHOOK");
    expect(body.status).toBe("DRAFT");
    expect(body.affectedFiles).toEqual([]);
    expect(body.triageItemId).toBeNull();
  });

  it("rejects creating an issue with a non-existent triage item id", async () => {
    const { accessToken } = await registerAndLogin(app);
    const workspace = await createWorkspace(app, accessToken);

    const response = await app.inject({
      method: "POST",
      url: `/workspaces/${workspace.id}/issues`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        title: "Fix login bug",
        description: "Login fails for some users",
        triageItemId: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("creates an issue linked to an existing triage item", async () => {
    const { accessToken } = await registerAndLogin(app);
    const workspace = await createWorkspace(app, accessToken);

    const triageItem = await prisma.triageItem.create({
      data: { workspaceId: workspace.id, rawPayload: {}, status: "PENDING" },
    });

    const response = await app.inject({
      method: "POST",
      url: `/workspaces/${workspace.id}/issues`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        title: "Fix login bug",
        description: "Login fails for some users",
        triageItemId: triageItem.id,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().triageItemId).toBe(triageItem.id);
  });

  it("lists issues with status filtering", async () => {
    const { accessToken } = await registerAndLogin(app);
    const workspace = await createWorkspace(app, accessToken);

    await app.inject({
      method: "POST",
      url: `/workspaces/${workspace.id}/issues`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: "Fix login bug", description: "Login fails for some users" },
    });

    const draftResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/issues?status=DRAFT`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(draftResponse.json()).toHaveLength(1);

    const pushedResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/issues?status=PUSHED`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(pushedResponse.json()).toHaveLength(0);
  });

  it("gets, updates, and deletes an issue", async () => {
    const { accessToken } = await registerAndLogin(app);
    const workspace = await createWorkspace(app, accessToken);

    const created = await app.inject({
      method: "POST",
      url: `/workspaces/${workspace.id}/issues`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: "Fix login bug", description: "Login fails for some users" },
    });
    const issueId = created.json().id;

    const getResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/issues/${issueId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(getResponse.statusCode).toBe(200);

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/workspaces/${workspace.id}/issues/${issueId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { priority: "P1", complexity: "HIGH", status: "PUSHED", jiraKey: "ABC-123" },
    });
    expect(patchResponse.statusCode).toBe(200);
    const patchedBody = patchResponse.json();
    expect(patchedBody.priority).toBe("P1");
    expect(patchedBody.complexity).toBe("HIGH");
    expect(patchedBody.status).toBe("PUSHED");
    expect(patchedBody.jiraKey).toBe("ABC-123");

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/workspaces/${workspace.id}/issues/${issueId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(deleteResponse.statusCode).toBe(204);

    const afterDelete = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/issues/${issueId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(afterDelete.statusCode).toBe(404);
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
      url: `/workspaces/${workspace.id}/issues`,
      headers: { authorization: `Bearer ${outsider.accessToken}` },
    });
    expect(listResponse.statusCode).toBe(403);

    const createResponse = await app.inject({
      method: "POST",
      url: `/workspaces/${workspace.id}/issues`,
      headers: { authorization: `Bearer ${outsider.accessToken}` },
      payload: { title: "Fix login bug", description: "Login fails for some users" },
    });
    expect(createResponse.statusCode).toBe(403);
  });
});
