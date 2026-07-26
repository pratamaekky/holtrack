import { createFileRoute } from "@tanstack/react-router";
import { InventoryTable } from "@/features/inventory";

export const Route = createFileRoute("/inventory")({
	component: InventoryTable,
});
