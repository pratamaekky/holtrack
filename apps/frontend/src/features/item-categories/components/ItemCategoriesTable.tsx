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
import { usePaginatedResourceAtoms } from "@/shared/hooks/pagination/usePaginatedResourceAtoms";
import { itemCategoriesResourceAtoms } from "../state/itemCategoriesResourceAtoms";
import ItemCategoryEditorDialog from "./ItemCategoryEditorDialog";

export default function ItemCategoriesTable() {
	const { data, error, filters, loading, order, retry, setPage, sort, toggleSort, updateFilter } =
		usePaginatedResourceAtoms(itemCategoriesResourceAtoms);

	const rows = data?.data ?? [];
	const page = data?.page ?? 1;
	const totalPages = data?.totalPages ?? 1;

	const tableBody = rows.length ? (
		rows.map((category) => (
			<TableRow key={category.id}>
				<TableCell>{category.name}</TableCell>
				<TableCell className="text-right">
					<div className="flex justify-end gap-1">
						<ItemCategoryEditorDialog category={category} onSaved={retry} />
						<DeleteResourceDialog
							endpoint={`/item-categories/${category.id}`}
							label="item category"
							name={category.name}
							onDeleted={retry}
						/>
					</div>
				</TableCell>
			</TableRow>
		))
	) : (
		<TableRow>
			<TableCell colSpan={2} className="p-8 text-center text-muted-foreground">
				No item categories.
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
			{loading ? (
				<p className="p-4 text-sm text-muted-foreground">Loading item categories...</p>
			) : null}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="name"
								label="Name"
								onToggle={toggleSort}
							/>
						</TableHead>
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
				<CardTitle>Item Categories</CardTitle>
				<ItemCategoryEditorDialog onSaved={retry} />
			</CardHeader>
			<CardContent className="space-y-3">
				<ResourceFilterPanel
					filterDefinitions={itemCategoriesResourceAtoms.config.filterDefinitions}
					filters={filters}
					onChange={(key, value) => updateFilter({ key, value })}
				/>
				{content}
			</CardContent>
		</Card>
	);
}
