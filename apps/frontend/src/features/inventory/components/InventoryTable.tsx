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
import DeleteResourceDialog from "@/shared/components/DeleteResourceDialog";
import PaginationFooter from "@/shared/components/table/PaginationFooter";
import ResourceFilterPanel from "@/shared/components/table/ResourceFilterPanel";
import SortableHeaderButton from "@/shared/components/table/SortableHeaderButton";
import { formatStatus } from "@/shared/data/wms";
import { usePaginatedResourceAtoms } from "@/shared/hooks/pagination/usePaginatedResourceAtoms";
import { inventoryResourceAtoms } from "../state/inventoryResourceAtoms";
import InventoryEditorDialog from "./InventoryEditorDialog";

export default function InventoryTable() {
	const { data, error, filters, loading, order, retry, setPage, sort, toggleSort, updateFilter } =
		usePaginatedResourceAtoms(inventoryResourceAtoms);

	const rows = data?.data ?? [];
	const page = data?.page ?? 1;
	const totalPages = data?.totalPages ?? 1;

	const tableBody = rows.length ? (
		rows.map((row) => (
			<TableRow key={row.id}>
				<TableCell>{row.warehouseCode}</TableCell>
				<TableCell>{row.warehouseName}</TableCell>
				<TableCell>{row.itemSku}</TableCell>
				<TableCell>{row.itemName}</TableCell>
				<TableCell>{row.category}</TableCell>
				<TableCell>{row.quantityOnHand}</TableCell>
				<TableCell>{row.reorderPoint}</TableCell>
				<TableCell>
					<Badge variant={row.status === "in_stock" ? "secondary" : "outline"}>
						{formatStatus(row.status)}
					</Badge>
				</TableCell>
				<TableCell className="text-right">
					<div className="flex justify-end gap-1">
						<InventoryEditorDialog inventory={row} onSaved={retry} />
						<DeleteResourceDialog
							endpoint={`/inventory/${row.id}`}
							label="inventory"
							name={`${row.warehouseCode} / ${row.itemSku}`}
							onDeleted={retry}
						/>
					</div>
				</TableCell>
			</TableRow>
		))
	) : (
		<TableRow>
			<TableCell colSpan={9} className="p-8 text-center text-muted-foreground">
				No inventory.
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
			{loading ? <p className="p-4 text-sm text-muted-foreground">Loading inventory...</p> : null}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Warehouse Code</TableHead>
						<TableHead>Warehouse Name</TableHead>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="sku"
								label="SKU"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>Item</TableHead>
						<TableHead>Category</TableHead>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="quantityOnHand"
								label="Qty On Hand"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="reorderPoint"
								label="Reorder Point"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>Status</TableHead>
						<TableHead />
					</TableRow>
				</TableHeader>
				<TableBody>{tableBody}</TableBody>
			</Table>
			<PaginationFooter
				page={page}
				totalPages={totalPages}
				onPrev={() => setPage(page - 1)}
				onNext={() => setPage(page + 1)}
			/>
		</div>
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-3">
				<CardTitle>Inventory</CardTitle>
				<InventoryEditorDialog onSaved={retry} />
			</CardHeader>
			<CardContent className="space-y-3">
				<ResourceFilterPanel
					filterDefinitions={inventoryResourceAtoms.config.filterDefinitions}
					filters={filters}
					onChange={(key, value) => updateFilter({ key, value })}
				/>
				{content}
			</CardContent>
		</Card>
	);
}
