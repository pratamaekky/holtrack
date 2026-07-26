import { createFileRoute } from "@tanstack/react-router";
import { ItemCategoriesTable } from "@/features/item-categories";

export const Route = createFileRoute("/item-categories")({
	component: ItemCategoriesTable,
});
