// Minimal in-memory fake of the chrome.storage APIs this project actually uses,
// for unit-testing modules that touch chrome.storage.local/session without a real browser.

interface FakeStorageArea {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

function createInMemoryStorageArea(): FakeStorageArea {
  const store = new Map<string, unknown>();
  return {
    async get(keys) {
      if (keys == null) {
        return Object.fromEntries(store.entries());
      }
      const keyList = typeof keys === "string" ? [keys] : keys;
      const result: Record<string, unknown> = {};
      for (const key of keyList) {
        if (store.has(key)) {
          result[key] = store.get(key);
        }
      }
      return result;
    },
    async set(items) {
      for (const [key, value] of Object.entries(items)) {
        store.set(key, value);
      }
    },
    async remove(keys) {
      const keyList = typeof keys === "string" ? [keys] : keys;
      for (const key of keyList) {
        store.delete(key);
      }
    },
    async clear() {
      store.clear();
    },
  };
}

// Installs a fresh in-memory chrome.storage.local/session onto globalThis.chrome.
// Call from a beforeEach so each test starts with empty storage.
export function installChromeMock(): void {
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: createInMemoryStorageArea(),
      session: createInMemoryStorageArea(),
    },
  };
}
