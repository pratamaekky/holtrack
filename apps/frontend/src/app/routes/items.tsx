import { createFileRoute } from "@tanstack/react-router";
import { ItemsTable } from "@/features/items";

export const Route = createFileRoute("/items")({
	component: ItemsTable,
});
