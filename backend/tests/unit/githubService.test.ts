import { afterEach, describe, expect, it, vi } from "vitest";

import { encryptValue } from "../../src/lib/encryption";
import { extractQuotedPhrases, getRecentCommitters, searchRepoForPhrases } from "../../src/services/githubService";

function workspaceWith(githubRepo: string | null, githubTokenEncrypted: string | null = null) {
  return { githubRepo, githubTokenEncrypted } as unknown as Parameters<typeof getRecentCommitters>[0];
}

describe("getRecentCommitters", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty array when no repo is configured", async () => {
    expect(await getRecentCommitters(workspaceWith(null), ["src/index.ts"])).toEqual([]);
  });

  it("returns an empty array when there are no affected files", async () => {
    expect(await getRecentCommitters(workspaceWith("acme/repo"), [])).toEqual([]);
  });

  it("ranks committers by how often they appear across the given files' commit history", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
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

    vi.stubGlobal("fetch", fetchMock);

    const committers = await getRecentCommitters(workspaceWith("acme/repo"), ["src/index.ts", "src/utils.ts"]);

    expect(committers).toEqual(["alice", "bob"]);
  });

  it("ignores commits with no linked GitHub account", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([{ author: null }, { author: { login: "carol" } }]), { status: 200 }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const committers = await getRecentCommitters(workspaceWith("acme/repo"), ["src/index.ts"]);

    expect(committers).toEqual(["carol"]);
  });
});

describe("extractQuotedPhrases", () => {
  it("extracts double-quoted and single-quoted phrases of at least 4 characters", () => {
    const text = `The chart says "Least Active Classes" but it should say 'Performing Classes'.`;

    expect(extractQuotedPhrases(text)).toEqual(["Least Active Classes", "Performing Classes"]);
  });

  it("ignores quoted strings shorter than 4 characters", () => {
    expect(extractQuotedPhrases(`The button is labeled "OK" and does nothing else.`)).toEqual([]);
  });

  it("deduplicates repeated phrases", () => {
    const text = `"Least Active Classes" appears twice: "Least Active Classes"`;

    expect(extractQuotedPhrases(text)).toEqual(["Least Active Classes"]);
  });

  it("caps the result at 3 phrases", () => {
    const text = `"phrase one" "phrase two" "phrase three" "phrase four"`;

    expect(extractQuotedPhrases(text)).toEqual(["phrase one", "phrase two", "phrase three"]);
  });

  it("returns an empty array when there are no quoted phrases", () => {
    expect(extractQuotedPhrases("no quotes here")).toEqual([]);
  });
});

describe("searchRepoForPhrases", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty array when no repo is configured", async () => {
    expect(await searchRepoForPhrases(workspaceWith(null, encryptValue("token")), ["Least Active Classes"])).toEqual(
      [],
    );
  });

  it("returns an empty array when no GitHub token is configured", async () => {
    expect(await searchRepoForPhrases(workspaceWith("acme/repo", null), ["Least Active Classes"])).toEqual([]);
  });

  it("returns an empty array when there are no phrases", async () => {
    expect(await searchRepoForPhrases(workspaceWith("acme/repo", encryptValue("token")), [])).toEqual([]);
  });

  it("aggregates matched file paths from each phrase's search results", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const urlStr = url.toString();

      if (urlStr.includes(encodeURIComponent('"Least Active Classes"'))) {
        return new Response(
          JSON.stringify({ items: [{ path: "frontend/src/pages/Analytics/Analytics.jsx" }] }),
          { status: 200 },
        );
      }

      if (urlStr.includes(encodeURIComponent('"Performing Classes"'))) {
        return new Response(
          JSON.stringify({
            items: [
              { path: "frontend/src/pages/Analytics/Analytics.jsx" },
              { path: "frontend/src/components/Chart.jsx" },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const paths = await searchRepoForPhrases(workspaceWith("acme/repo", encryptValue("token")), [
      "Least Active Classes",
      "Performing Classes",
    ]);

    expect(paths).toEqual(["frontend/src/pages/Analytics/Analytics.jsx", "frontend/src/components/Chart.jsx"]);
  });

  it("ignores phrases whose search request fails", async () => {
    const fetchMock = vi.fn(async () => new Response("rate limited", { status: 403 }));

    vi.stubGlobal("fetch", fetchMock);

    const paths = await searchRepoForPhrases(workspaceWith("acme/repo", encryptValue("token")), ["Some phrase"]);

    expect(paths).toEqual([]);
  });

  it("caps the result at 5 file paths", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          items: [
            { path: "a.js" },
            { path: "b.js" },
            { path: "c.js" },
            { path: "d.js" },
            { path: "e.js" },
            { path: "f.js" },
          ],
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const paths = await searchRepoForPhrases(workspaceWith("acme/repo", encryptValue("token")), ["phrase"]);

    expect(paths).toEqual(["a.js", "b.js", "c.js", "d.js", "e.js"]);
  });
});
