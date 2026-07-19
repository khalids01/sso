import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number.parseInt(env.PORT ?? "5003", 10);

  return {
    plugins: [tailwindcss(), tanstackStart(), viteReact()],
    resolve: { tsconfigPaths: true },
    server: { port },
  };
});
