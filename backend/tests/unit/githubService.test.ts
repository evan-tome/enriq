import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { getRecentCommitters } from "../../src/services/githubService";

function workspaceWith(githubRepo: string | null, githubTokenEncrypted: string | null = null) {
  return { githubRepo, githubTokenEncrypted } as unknown as Parameters<typeof getRecentCommitters>[0];
}

describe("getRecentCommitters", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns an empty array when no repo is configured", async () => {
    expect(await getRecentCommitters(workspaceWith(null), ["src/index.ts"])).toEqual([]);
  });

  it("returns an empty array when there are no affected files", async () => {
    expect(await getRecentCommitters(workspaceWith("acme/repo"), [])).toEqual([]);
  });

  it("ranks committers by how often they appear across the given files' commit history", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async (url) => {
      const urlStr = url.toString();

      if (urlStr.includes("path=src%2Findex.ts")) {
        return new Response(
          JSON.stringify([{ author: { login: "alice" } }, { author: { login: "bob" } }]),
          { status: 200 },
        );
      }

      if (urlStr.includes("path=src%2Futils.ts")) {
        return new Response(JSON.stringify([{ author: { login: "alice" } }]), { status: 200 });
      }

      return new Response("not found", { status: 404 });
    });

    const committers = await getRecentCommitters(workspaceWith("acme/repo"), ["src/index.ts", "src/utils.ts"]);

    expect(committers).toEqual(["alice", "bob"]);
  });

  it("ignores commits with no linked GitHub account", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify([{ author: null }, { author: { login: "carol" } }]), { status: 200 }),
    );

    const committers = await getRecentCommitters(workspaceWith("acme/repo"), ["src/index.ts"]);

    expect(committers).toEqual(["carol"]);
  });
});
