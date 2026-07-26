import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { apiService } from "@/api/apiService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Inventory, InventoryStatusSummary, LowStockByCategory } from "@/shared/data/wms";
import { formatStatus } from "@/shared/data/wms";

export default function DashboardPage() {
	const summaryQuery = useQuery({
		queryKey: ["/dashboard/inventory-status-summary"],
		queryFn: () => apiService.get<InventoryStatusSummary>("/dashboard/inventory-status-summary"),
		retry: false,
	});
	const byCategoryQuery = useQuery({
		queryKey: ["/dashboard/low-stock-by-category"],
		queryFn: () => apiService.get<LowStockByCategory[]>("/dashboard/low-stock-by-category"),
		retry: false,
	});
	const lowStockItemsQuery = useQuery({
		queryKey: ["/dashboard/low-stock-items"],
		queryFn: () => apiService.get<Inventory[]>("/dashboard/low-stock-items?limit=10"),
		retry: false,
	});

	const summary = summaryQuery.data;
	const categories = byCategoryQuery.data ?? [];
	const lowStockItems = lowStockItemsQuery.data ?? [];
	const error = [summaryQuery.error, byCategoryQuery.error, lowStockItemsQuery.error].find(
		(queryError): queryError is Error => queryError instanceof Error,
	);

	function handleRefresh() {
		summaryQuery.refetch();
		byCategoryQuery.refetch();
		lowStockItemsQuery.refetch();
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Dashboard</CardTitle>
				</CardHeader>
				<CardContent>
					<p role="alert" className="text-sm text-destructive">
						{error.message}
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="grid gap-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
					<p className="text-sm text-muted-foreground">Inventory health from policy.</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
					<RefreshCw aria-hidden="true" />
					Refresh
				</Button>
			</div>
			<div className="grid gap-4 md:grid-cols-4">
				<SummaryCard label="Inventory rows" value={summary?.totalRows ?? 0} />
				<SummaryCard label="In stock" value={summary?.inStockRows ?? 0} />
				<SummaryCard label="Low stock" value={summary?.lowStockRows ?? 0} />
				<SummaryCard label="Out of stock" value={summary?.outOfStockRows ?? 0} />
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Low Stock by Category</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Category</TableHead>
									<TableHead className="text-right">Rows</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{categories.length ? (
									categories.map((entry) => (
										<TableRow key={entry.category}>
											<TableCell>{entry.category}</TableCell>
											<TableCell className="text-right">{entry.count}</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={2} className="p-8 text-center text-muted-foreground">
											No low-stock categories.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Top Low-Stock Items</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Item</TableHead>
									<TableHead>Warehouse</TableHead>
									<TableHead>Category</TableHead>
									<TableHead>On hand</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{lowStockItems.length ? (
									lowStockItems.map((row) => (
										<TableRow key={row.id}>
											<TableCell>
												<div className="font-medium">{row.itemSku}</div>
												<div className="text-sm text-muted-foreground">{row.itemName}</div>
											</TableCell>
											<TableCell>{row.warehouseCode}</TableCell>
											<TableCell>{row.category}</TableCell>
											<TableCell>{row.quantityOnHand}</TableCell>
											<TableCell>
												<Badge variant={row.status === "out_of_stock" ? "destructive" : "outline"}>
													{formatStatus(row.status)}
												</Badge>
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
											No low-stock rows.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function SummaryCard({ label, value }: { label: string; value: number }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
			</CardHeader>
			<CardContent className="text-2xl font-semibold">{value}</CardContent>
		</Card>
	);
}
