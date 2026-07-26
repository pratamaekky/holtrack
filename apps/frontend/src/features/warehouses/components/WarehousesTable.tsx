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
import { warehousesResourceAtoms } from "../state/warehousesResourceAtoms";
import WarehouseEditorDialog from "./WarehouseEditorDialog";

export default function WarehousesTable() {
	const { data, error, filters, loading, order, retry, setPage, sort, toggleSort, updateFilter } =
		usePaginatedResourceAtoms(warehousesResourceAtoms);

	const rows = data?.data ?? [];
	const page = data?.page ?? 1;
	const totalPages = data?.totalPages ?? 1;

	const tableBody = rows.length ? (
		rows.map((warehouse) => (
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
					<div className="flex justify-end gap-1">
						<WarehouseEditorDialog warehouse={warehouse} onSaved={retry} />
						<DeleteResourceDialog
							endpoint={`/warehouses/${warehouse.id}`}
							label="warehouse"
							name={warehouse.code}
							onDeleted={retry}
						/>
					</div>
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
			{loading ? <p className="p-4 text-sm text-muted-foreground">Loading warehouses...</p> : null}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="code"
								label="Code"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="name"
								label="Name"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="city"
								label="City"
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
				<CardTitle>Warehouses</CardTitle>
				<WarehouseEditorDialog onSaved={retry} />
			</CardHeader>
			<CardContent className="space-y-3">
				<ResourceFilterPanel
					filterDefinitions={warehousesResourceAtoms.config.filterDefinitions}
					filters={filters}
					onChange={(key, value) => updateFilter({ key, value })}
				/>
				{content}
			</CardContent>
		</Card>
	);
}
