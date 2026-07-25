import { useEffect, useState } from "react";
import { apiService } from "@/api/apiService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Item } from "@/shared/data/wms";
import { formatStatus } from "@/shared/data/wms";
import { buildFilterQuery } from "@/shared/utils/build-filter-query";
import ItemEditorDialog from "./ItemEditorDialog";

export default function ItemsTable() {
	const [items, setItems] = useState<Item[]>([]);
	const [filters, setFilters] = useState({ category: "", name: "", sku: "", status: "" });
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [reloadKey, setReloadKey] = useState(0);
	const retry = () => setReloadKey((current) => current + 1);
	const query = buildFilterQuery(filters, { exactKeys: ["status"] });

	useEffect(() => {
		let isCurrent = true;
		void reloadKey;
		setIsLoading(true);
		setError(null);

		apiService
			.get<Item[]>(`/items${query}`)
			.then((response) => {
				if (isCurrent) {
					setItems(response);
				}
			})
			.catch((loadError) => {
				if (isCurrent) {
					setError(loadError instanceof Error ? loadError.message : "Failed to load items.");
				}
			})
			.finally(() => {
				if (isCurrent) {
					setIsLoading(false);
				}
			});

		return () => {
			isCurrent = false;
		};
	}, [query, reloadKey]);

	const tableBody = items.length ? (
		items.map((item) => (
			<TableRow key={item.id}>
				<TableCell>{item.sku}</TableCell>
				<TableCell>{item.name}</TableCell>
				<TableCell>{item.category}</TableCell>
				<TableCell>{item.unit}</TableCell>
				<TableCell>
					<Badge variant={item.status === "active" ? "secondary" : "outline"}>
						{formatStatus(item.status)}
					</Badge>
				</TableCell>
				<TableCell className="text-right">
					<ItemEditorDialog item={item} onSaved={retry} />
				</TableCell>
			</TableRow>
		))
	) : (
		<TableRow>
			<TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
				No items.
			</TableCell>
		</TableRow>
	);

	const content = error ? (
		<div role="alert" className="grid justify-items-center gap-3 p-8 text-center text-destructive">
			<p>{error}</p>
			<Button variant="outline" onClick={retry}>
				Retry
			</Button>
		</div>
	) : (
		<div className="overflow-hidden rounded-lg border">
			{isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading items...</p> : null}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>SKU</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>Category</TableHead>
						<TableHead>Unit</TableHead>
						<TableHead>Status</TableHead>
						<TableHead />
					</TableRow>
				</TableHeader>
				<TableBody>{tableBody}</TableBody>
			</Table>
		</div>
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-3">
				<CardTitle>Items</CardTitle>
				<ItemEditorDialog onSaved={retry} />
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid gap-2 md:grid-cols-4">
					<Input
						aria-label="Filter item SKU"
						placeholder="SKU"
						value={filters.sku}
						onChange={(event) => setFilters((current) => ({ ...current, sku: event.target.value }))}
					/>
					<Input
						aria-label="Filter item name"
						placeholder="Name"
						value={filters.name}
						onChange={(event) =>
							setFilters((current) => ({ ...current, name: event.target.value }))
						}
					/>
					<Input
						aria-label="Filter item category"
						placeholder="Category"
						value={filters.category}
						onChange={(event) =>
							setFilters((current) => ({ ...current, category: event.target.value }))
						}
					/>
					<Input
						aria-label="Filter item status"
						placeholder="Status"
						value={filters.status}
						onChange={(event) =>
							setFilters((current) => ({ ...current, status: event.target.value }))
						}
					/>
				</div>
				{content}
			</CardContent>
		</Card>
	);
}
