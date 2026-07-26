import { defineConfig, devices } from "@playwright/test";
import {
	E2E_BACKEND_PORT,
	E2E_BACKEND_URL,
	E2E_FRONTEND_PORT,
	E2E_FRONTEND_URL,
} from "./e2e/config";

export default defineConfig({
	testDir: "./e2e",
	workers: 1,
	timeout: 15_000,
	expect: {
		timeout: 5_000,
	},
	use: {
		baseURL: E2E_FRONTEND_URL,
		trace: "on-first-retry",
	},
	webServer: [
		{
			command: `PORT=${E2E_BACKEND_PORT} CORS_ORIGIN=${E2E_FRONTEND_URL} bun --filter '@mini-wms/backend' dev`,
			url: `${E2E_BACKEND_URL}/warehouses`,
			reuseExistingServer: false,
			timeout: 30_000,
		},
		{
			command: `BACKEND_URL=${E2E_BACKEND_URL} bun --filter '@mini-wms/frontend' dev --port ${E2E_FRONTEND_PORT} --host 127.0.0.1`,
			url: E2E_FRONTEND_URL,
			reuseExistingServer: false,
			timeout: 30_000,
		},
	],
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				channel: "chrome",
			},
		},
	],
});
