import { beforeEach, describe, expect, it, vi } from "vitest";
import { disconnectYoutube } from "./auth";

function installIdentityMock(getAuthTokenImpl: () => Promise<{ token?: string }>) {
  (globalThis as unknown as { chrome: { identity: unknown } }).chrome = {
    identity: {
      getAuthToken: vi.fn(getAuthTokenImpl),
      removeCachedAuthToken: vi.fn(async () => undefined),
    },
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("disconnectYoutube", () => {
  it("removes the cached token and revokes it with Google when one exists", async () => {
    installIdentityMock(async () => ({ token: "cached-token" }));
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await disconnectYoutube();

    const identity = (globalThis as unknown as { chrome: { identity: { removeCachedAuthToken: ReturnType<typeof vi.fn> } } })
      .chrome.identity;
    expect(identity.removeCachedAuthToken).toHaveBeenCalledWith({ token: "cached-token" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("oauth2.googleapis.com/revoke?token=cached-token"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does nothing when there is no cached token to remove", async () => {
    installIdentityMock(async () => {
      throw new Error("no cached token");
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(disconnectYoutube()).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not throw if the server-side revoke request fails", async () => {
    installIdentityMock(async () => ({ token: "cached-token" }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network error");
      }),
    );

    await expect(disconnectYoutube()).resolves.toBeUndefined();
  });
});
