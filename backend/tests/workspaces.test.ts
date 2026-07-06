// Requires a running Postgres instance (docker compose up -d postgres) with
// DATABASE_URL pointing to it and the init migration applied.
import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { type App, buildApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { createWorkspace, registerAndLogin } from "./helpers";

describe("workspaces", () => {
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

  it("creates a workspace owned by the requesting user", async () => {
    const { accessToken } = await registerAndLogin(app);

    const body = await createWorkspace(app, accessToken, "Acme Corp");

    expect(body.id).toBeTypeOf("string");
    expect(body.name).toBe("Acme Corp");
    expect(body.slug).toBeTypeOf("string");
    expect(body.slug).toMatch(/^acme-corp-[0-9a-f]{6}$/);
    expect(body.role).toBe("OWNER");
    expect(body.hasJiraApiToken).toBe(false);
    expect(body.hasGithubToken).toBe(false);
    expect(body.jiraBaseUrl).toBeNull();
    expect(body.jiraEmail).toBeNull();
    expect(body.githubRepo).toBeNull();
    expect(body.ollamaUrl).toBeTypeOf("string");
  });

  it("lists workspaces for the current user", async () => {
    const { accessToken } = await registerAndLogin(app);
    const created = await createWorkspace(app, accessToken, "List Me");

    const response = await app.inject({
      method: "GET",
      url: "/workspaces",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((workspace: { id: string }) => workspace.id === created.id)).toBe(true);
  });

  it("gets a workspace by id for a member", async () => {
    const { accessToken } = await registerAndLogin(app);
    const created = await createWorkspace(app, accessToken, "Get Me");

    const response = await app.inject({
      method: "GET",
      url: `/workspaces/${created.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe(created.id);
  });

  it("rejects getting a workspace the user is not a member of", async () => {
    const owner = await registerAndLogin(app);
    const created = await createWorkspace(app, owner.accessToken, "Private Workspace");

    const outsider = await registerAndLogin(app, {
      email: "outsider@example.com",
      password: "password123",
    });

    const response = await app.inject({
      method: "GET",
      url: `/workspaces/${created.id}`,
      headers: { authorization: `Bearer ${outsider.accessToken}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it("allows the owner to update workspace settings, including setting and clearing jiraApiToken", async () => {
    const { accessToken } = await registerAndLogin(app);
    const created = await createWorkspace(app, accessToken, "Update Me");

    const setTokenResponse = await app.inject({
      method: "PATCH",
      url: `/workspaces/${created.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: "Updated Name",
        jiraBaseUrl: "https://acme.atlassian.net",
        jiraEmail: "jira@acme.com",
        jiraApiToken: "super-secret-token",
        githubRepo: "acme/repo",
        ollamaUrl: "http://localhost:12345",
      },
    });

    expect(setTokenResponse.statusCode).toBe(200);
    const setTokenBody = setTokenResponse.json();
    expect(setTokenBody.name).toBe("Updated Name");
    expect(setTokenBody.jiraBaseUrl).toBe("https://acme.atlassian.net");
    expect(setTokenBody.jiraEmail).toBe("jira@acme.com");
    expect(setTokenBody.githubRepo).toBe("acme/repo");
    expect(setTokenBody.ollamaUrl).toBe("http://localhost:12345");
    expect(setTokenBody.hasJiraApiToken).toBe(true);

    const clearTokenResponse = await app.inject({
      method: "PATCH",
      url: `/workspaces/${created.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { jiraApiToken: null },
    });

    expect(clearTokenResponse.statusCode).toBe(200);
    expect(clearTokenResponse.json().hasJiraApiToken).toBe(false);
  });

  it("allows the owner to set and update the assignee mapping", async () => {
    const { accessToken } = await registerAndLogin(app);
    const created = await createWorkspace(app, accessToken, "Assignee Mapping Workspace");

    expect(created.assigneeMapping).toEqual({});

    const setResponse = await app.inject({
      method: "PATCH",
      url: `/workspaces/${created.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { assigneeMapping: { alice: "Alice Smith", bob: "Bob Jones" } },
    });

    expect(setResponse.statusCode).toBe(200);
    expect(setResponse.json().assigneeMapping).toEqual({ alice: "Alice Smith", bob: "Bob Jones" });

    const getResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${created.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(getResponse.json().assigneeMapping).toEqual({ alice: "Alice Smith", bob: "Bob Jones" });
  });

  it("rejects updates from a user who is not a member of the workspace", async () => {
    const owner = await registerAndLogin(app);
    const created = await createWorkspace(app, owner.accessToken, "Owner Only");

    const outsider = await registerAndLogin(app, {
      email: "outsider2@example.com",
      password: "password123",
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/workspaces/${created.id}`,
      headers: { authorization: `Bearer ${outsider.accessToken}` },
      payload: { name: "Hacked Name" },
    });

    expect(response.statusCode).toBe(403);
  });

  it("allows the owner to delete a workspace, after which membership is gone", async () => {
    const { accessToken } = await registerAndLogin(app);
    const created = await createWorkspace(app, accessToken, "Delete Me");

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/workspaces/${created.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(deleteResponse.statusCode).toBe(204);

    const getResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${created.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(getResponse.statusCode).toBe(403);
  });

  it("lists workspace members including the owner", async () => {
    const { accessToken } = await registerAndLogin(app);
    const created = await createWorkspace(app, accessToken, "Members Workspace");

    const response = await app.inject({
      method: "GET",
      url: `/workspaces/${created.id}/members`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].role).toBe("OWNER");
    expect(body[0].email).toBeTypeOf("string");
  });

  it("allows the owner to add an existing user as a member, and the member can then view the workspace", async () => {
    const owner = await registerAndLogin(app);
    const created = await createWorkspace(app, owner.accessToken, "Add Member Workspace");

    const invitee = await registerAndLogin(app, {
      email: "invitee@example.com",
      password: "password123",
    });

    const addResponse = await app.inject({
      method: "POST",
      url: `/workspaces/${created.id}/members`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { email: "invitee@example.com" },
    });

    expect(addResponse.statusCode).toBe(201);
    const addBody = addResponse.json();
    expect(addBody.email).toBe("invitee@example.com");
    expect(addBody.role).toBe("MEMBER");

    const getResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${created.id}`,
      headers: { authorization: `Bearer ${invitee.accessToken}` },
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().role).toBe("MEMBER");
  });

  it("rejects adding a member who is already in the workspace, or who doesn't exist, or when not the owner", async () => {
    const owner = await registerAndLogin(app);
    const created = await createWorkspace(app, owner.accessToken, "Duplicate Member Workspace");

    await registerAndLogin(app, { email: "dup@example.com", password: "password123" });

    const firstAdd = await app.inject({
      method: "POST",
      url: `/workspaces/${created.id}/members`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { email: "dup@example.com" },
    });
    expect(firstAdd.statusCode).toBe(201);

    const duplicateAdd = await app.inject({
      method: "POST",
      url: `/workspaces/${created.id}/members`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { email: "dup@example.com" },
    });
    expect(duplicateAdd.statusCode).toBe(409);

    const unknownAdd = await app.inject({
      method: "POST",
      url: `/workspaces/${created.id}/members`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { email: "nobody@example.com" },
    });
    expect(unknownAdd.statusCode).toBe(404);

    const member = await registerAndLogin(app, { email: "member@example.com", password: "password123" });
    await app.inject({
      method: "POST",
      url: `/workspaces/${created.id}/members`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { email: "member@example.com" },
    });

    const forbiddenAdd = await app.inject({
      method: "POST",
      url: `/workspaces/${created.id}/members`,
      headers: { authorization: `Bearer ${member.accessToken}` },
      payload: { email: "nobody@example.com" },
    });
    expect(forbiddenAdd.statusCode).toBe(403);
  });

  it("allows the owner to remove a member, but not the owner themselves", async () => {
    const owner = await registerAndLogin(app);
    const created = await createWorkspace(app, owner.accessToken, "Remove Member Workspace");

    await registerAndLogin(app, { email: "removable@example.com", password: "password123" });
    const addResponse = await app.inject({
      method: "POST",
      url: `/workspaces/${created.id}/members`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { email: "removable@example.com" },
    });
    const memberId = addResponse.json().id;

    const removeResponse = await app.inject({
      method: "DELETE",
      url: `/workspaces/${created.id}/members/${memberId}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(removeResponse.statusCode).toBe(204);

    const membersResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${created.id}/members`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(membersResponse.json()).toHaveLength(1);

    const ownerMemberId = membersResponse.json()[0].id;
    const removeOwnerResponse = await app.inject({
      method: "DELETE",
      url: `/workspaces/${created.id}/members/${ownerMemberId}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(removeOwnerResponse.statusCode).toBe(409);
  });
});
