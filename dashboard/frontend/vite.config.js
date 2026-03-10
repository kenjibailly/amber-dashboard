import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "/",
    plugins: [react()],
    define: {
      "import.meta.env.VITE_DISCORD_CLIENT_ID": JSON.stringify(
        env.VITE_DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID,
      ),
    },
    server: {
      host: true,
      port: 5173,
      allowedHosts: [
        "amber-dashboard.mindglowing.art",
        "brawldle.mindglowing.art",
        "localhost",
        "127.0.0.1",
      ],
      proxy: {
        "/auth": { target: "http://localhost:8080", changeOrigin: true },
        "/api": { target: "http://localhost:8080", changeOrigin: true },
        "/guilds": { target: "http://localhost:8080", changeOrigin: true },
      },
    },
  };
});
