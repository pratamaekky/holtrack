import { createRouter, RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { routeTree } from "./app/routeTree.gen";
import "./styles.css";

const router = createRouter({ routeTree });

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element not found.");
}

createRoot(rootElement).render(<RouterProvider router={router} />);

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
