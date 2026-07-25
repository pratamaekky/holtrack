import { createFileRoute } from "@tanstack/react-router";
import { WarehousesTable } from "@/features/warehouses";

export const Route = createFileRoute("/warehouses")({
	component: WarehousesTable,
});
