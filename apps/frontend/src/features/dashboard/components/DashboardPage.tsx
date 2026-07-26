import { useQuery } from "@tanstack/react-query";

import { apiService } from "@/api/apiService";
import { Badge } from "@/components/ui/badge";
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

	return (
		<div className="grid gap-4">
			<div className="grid gap-4 md:grid-cols-4">
				<SummaryCard label="Inventory rows" value={summary?.totalRows ?? 0} />
				<SummaryCard label="In stock" value={summary?.inStockRows ?? 0} />
				<SummaryCard label="Low stock" value={summary?.lowStockRows ?? 0} />
				<SummaryCard label="Out of stock" value={summary?.outOfStockRows ?? 0} />
			</div>
			<Card>
				<CardHeader>
					<CardTitle>Low Stock By Category</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-2">
					{categories.length ? (
						categories.map((entry) => (
							<div
								key={entry.category}
								className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
							>
								<span>{entry.category}</span>
								<Badge variant="outline">{entry.count}</Badge>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground">No low-stock categories.</p>
					)}
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Low Stock Rows</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Warehouse</TableHead>
								<TableHead>SKU</TableHead>
								<TableHead>Item</TableHead>
								<TableHead>Category</TableHead>
								<TableHead>Qty On Hand</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{lowStockItems.length ? (
								lowStockItems.map((row) => (
									<TableRow key={row.id}>
										<TableCell>{row.warehouseCode}</TableCell>
										<TableCell>{row.itemSku}</TableCell>
										<TableCell>{row.itemName}</TableCell>
										<TableCell>{row.category}</TableCell>
										<TableCell>{row.quantityOnHand}</TableCell>
										<TableCell>
											<Badge variant="outline">{formatStatus(row.status)}</Badge>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
										No low-stock rows.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
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
