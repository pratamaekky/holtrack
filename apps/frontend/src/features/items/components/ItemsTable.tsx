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
import PaginationFooter from "@/shared/components/table/PaginationFooter";
import ResourceFilterPanel from "@/shared/components/table/ResourceFilterPanel";
import SortableHeaderButton from "@/shared/components/table/SortableHeaderButton";
import { formatStatus } from "@/shared/data/wms";
import { usePaginatedResourceAtoms } from "@/shared/hooks/pagination/usePaginatedResourceAtoms";
import { itemsResourceAtoms } from "../state/itemsResourceAtoms";
import ItemEditorDialog from "./ItemEditorDialog";

export default function ItemsTable() {
	const { data, error, filters, loading, order, retry, setPage, sort, toggleSort, updateFilter } =
		usePaginatedResourceAtoms(itemsResourceAtoms);

	const rows = data?.data ?? [];
	const page = data?.page ?? 1;
	const totalPages = data?.totalPages ?? 1;

	const tableBody = rows.length ? (
		rows.map((item) => (
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
			{loading ? <p className="p-4 text-sm text-muted-foreground">Loading items...</p> : null}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="sku"
								label="SKU"
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
						<TableHead>Category</TableHead>
						<TableHead>Unit</TableHead>
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
				<CardTitle>Items</CardTitle>
				<ItemEditorDialog onSaved={retry} />
			</CardHeader>
			<CardContent className="space-y-3">
				<ResourceFilterPanel
					filterDefinitions={itemsResourceAtoms.config.filterDefinitions}
					filters={filters}
					onChange={(key, value) => updateFilter({ key, value })}
				/>
				{content}
			</CardContent>
		</Card>
	);
}
