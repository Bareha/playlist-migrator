import { defineConfig, loadEnv } from "vite";
import { crx } from "@crxjs/vite-plugin";

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // manifest.config.ts reads process.env at import time (it's evaluated by the
  // crx plugin in a Node context, not through Vite's import.meta.env transform),
  // so this must be set before the dynamic import below.
  process.env.GOOGLE_OAUTH_CLIENT_ID = env.VITE_GOOGLE_OAUTH_CLIENT_ID ?? "";

  const { default: manifest } = await import("./manifest.config.ts");

  return {
    plugins: [crx({ manifest })],
  };
});
