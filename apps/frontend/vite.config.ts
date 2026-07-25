import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		tanstackRouter({
			generatedRouteTree: "./src/app/routeTree.gen.ts",
			routesDirectory: "./src/app/routes",
			target: "react",
		}),
		react(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 5173,
		proxy: {
			"/api": {
				target: process.env.BACKEND_URL ?? "http://localhost:4000",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
	test: {
		setupFiles: ["./src/tests/setup.ts"],
	},
});
