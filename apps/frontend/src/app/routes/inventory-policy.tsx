import { createFileRoute } from "@tanstack/react-router";
import { InventoryPolicyPage } from "@/features/inventory-policy";

export const Route = createFileRoute("/inventory-policy")({
	component: InventoryPolicyPage,
});
