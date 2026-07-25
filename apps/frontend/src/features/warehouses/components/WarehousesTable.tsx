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
import type { Warehouse } from "@/shared/data/wms";
import { formatStatus } from "@/shared/data/wms";
import { buildFilterQuery } from "@/shared/utils/build-filter-query";
import WarehouseEditorDialog from "./WarehouseEditorDialog";

export default function WarehousesTable() {
	const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
	const [filters, setFilters] = useState({ city: "", code: "", name: "", status: "" });
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
			.get<Warehouse[]>(`/warehouses${query}`)
			.then((response) => {
				if (isCurrent) {
					setWarehouses(response);
				}
			})
			.catch((loadError) => {
				if (isCurrent) {
					setError(loadError instanceof Error ? loadError.message : "Failed to load warehouses.");
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

	const tableBody = warehouses.length ? (
		warehouses.map((warehouse) => (
			<TableRow key={warehouse.id}>
				<TableCell>{warehouse.code}</TableCell>
				<TableCell>{warehouse.name}</TableCell>
				<TableCell>{warehouse.city}</TableCell>
				<TableCell>
					<Badge variant={warehouse.status === "active" ? "secondary" : "outline"}>
						{formatStatus(warehouse.status)}
					</Badge>
				</TableCell>
				<TableCell className="text-right">
					<WarehouseEditorDialog warehouse={warehouse} onSaved={retry} />
				</TableCell>
			</TableRow>
		))
	) : (
		<TableRow>
			<TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
				No warehouses.
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
			{isLoading ? (
				<p className="p-4 text-sm text-muted-foreground">Loading warehouses...</p>
			) : null}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Code</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>City</TableHead>
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
				<CardTitle>Warehouses</CardTitle>
				<WarehouseEditorDialog onSaved={retry} />
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid gap-2 md:grid-cols-4">
					<Input
						aria-label="Filter warehouse code"
						placeholder="Code"
						value={filters.code}
						onChange={(event) =>
							setFilters((current) => ({ ...current, code: event.target.value }))
						}
					/>
					<Input
						aria-label="Filter warehouse name"
						placeholder="Name"
						value={filters.name}
						onChange={(event) =>
							setFilters((current) => ({ ...current, name: event.target.value }))
						}
					/>
					<Input
						aria-label="Filter warehouse city"
						placeholder="City"
						value={filters.city}
						onChange={(event) =>
							setFilters((current) => ({ ...current, city: event.target.value }))
						}
					/>
					<Input
						aria-label="Filter warehouse status"
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
