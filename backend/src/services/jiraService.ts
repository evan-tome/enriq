import type { Issue, Workspace } from "@prisma/client";

import { decryptValue } from "../lib/encryption";
import { BadRequestError } from "../lib/errors";

interface JiraCreateIssueResponse {
  key: string;
}

interface JiraErrorResponse {
  errorMessages?: string[];
  errors?: Record<string, string>;
}

interface JiraPriority {
  id: string;
  name: string;
}

function buildAuthHeaders(workspace: Workspace) {
  const apiToken = decryptValue(workspace.jiraApiTokenEncrypted!);
  const auth = Buffer.from(`${workspace.jiraEmail}:${apiToken}`).toString("base64");
  return { Authorization: `Basic ${auth}`, Accept: "application/json" };
}

/** Fetches the list of issue priorities configured on the Jira site, in their configured order. */
export async function getJiraPriorities(workspace: Workspace): Promise<JiraPriority[]> {
  const response = await fetch(new URL("/rest/api/3/priority", workspace.jiraBaseUrl!), {
    headers: buildAuthHeaders(workspace),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    return [];
  }

  const priorities = (await response.json()) as JiraPriority[];
  return priorities.map(({ id, name }) => ({ id, name }));
}

/** Builds an Atlassian Document Format document from the issue description, with an optional reporter line. */
function toDescriptionDoc(description: string, reporter: string | null) {
  const content = [
    {
      type: "paragraph",
      content: [{ type: "text", text: description }],
    },
  ];

  if (reporter) {
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: `Reported by: ${reporter}` }],
    });
  }

  return { type: "doc", version: 1, content };
}

export interface JiraStatus {
  configured: boolean;
  reachable: boolean;
  projectValid: boolean;
}

/** Checks whether the workspace's Jira credentials and project key are valid. */
export async function checkJiraStatus(workspace: Workspace): Promise<JiraStatus> {
  if (!workspace.jiraBaseUrl || !workspace.jiraEmail || !workspace.jiraApiTokenEncrypted || !workspace.jiraProjectKey) {
    return { configured: false, reachable: false, projectValid: false };
  }

  const headers = buildAuthHeaders(workspace);

  try {
    const meResponse = await fetch(new URL("/rest/api/3/myself", workspace.jiraBaseUrl), {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!meResponse.ok) {
      return { configured: true, reachable: false, projectValid: false };
    }

    const projectResponse = await fetch(
      new URL(`/rest/api/3/project/${encodeURIComponent(workspace.jiraProjectKey)}`, workspace.jiraBaseUrl),
      { headers, signal: AbortSignal.timeout(5000) },
    );

    return { configured: true, reachable: true, projectValid: projectResponse.ok };
  } catch {
    return { configured: true, reachable: false, projectValid: false };
  }
}

/** Creates an issue in Jira for the given workspace's project and returns its key. */
export async function createJiraIssue(workspace: Workspace, issue: Issue): Promise<JiraCreateIssueResponse> {
  if (!workspace.jiraBaseUrl || !workspace.jiraEmail || !workspace.jiraApiTokenEncrypted || !workspace.jiraProjectKey) {
    throw new BadRequestError("Jira is not fully configured for this workspace. Set it up in Settings.");
  }

  const fields: Record<string, unknown> = {
    project: { key: workspace.jiraProjectKey },
    summary: issue.title,
    description: toDescriptionDoc(issue.description, issue.reporter),
    issuetype: { name: "Bug" },
  };

  if (issue.priority) {
    fields.priority = { name: issue.priority };
  }

  const response = await fetch(new URL("/rest/api/3/issue", workspace.jiraBaseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(workspace),
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as JiraErrorResponse | null;
    const detail = body?.errorMessages?.join(", ") ?? JSON.stringify(body?.errors ?? {});
    throw new BadRequestError(`Jira request failed with status ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  return (await response.json()) as JiraCreateIssueResponse;
}
