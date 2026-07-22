import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: [/^@(auth|config|db|email|env|rbac|redis)(?:\/|$)/, /@sso\/.*/],
});
