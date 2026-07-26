import { Pencil, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SelectCombobox from "@/shared/components/forms/SelectCombobox";
import type { Inventory } from "@/shared/data/wms";
import { useInventoryOptions } from "..";
import { useSaveInventory } from "../hooks/useSaveInventory";
import { getInitialInventoryForm, getInventoryPayload } from "../utils/inventory-form";

interface InventoryEditorDialogProps {
	inventory?: Inventory;
	onSaved: () => void;
}

export default function InventoryEditorDialog({ inventory, onSaved }: InventoryEditorDialogProps) {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState(() => getInitialInventoryForm(inventory));
	const [error, setError] = useState<string | null>(null);
	const { items, warehouses } = useInventoryOptions(open);
	const isEditing = Boolean(inventory);
	const saveMutation = useSaveInventory({
		inventory,
		onError: setError,
		onSaved: () => {
			setOpen(false);
			onSaved();
		},
	});
	const isSaving = saveMutation.isPending;
	const submitText = isSaving ? "Saving..." : "Save";
	const trigger = isEditing ? (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-label={`Edit ${inventory?.warehouseCode} ${inventory?.itemSku}`}
		>
			<Pencil aria-hidden="true" />
		</Button>
	) : (
		<Button type="button">
			<Plus aria-hidden="true" />
			Add inventory
		</Button>
	);

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		setError(null);
		setForm(getInitialInventoryForm(inventory));
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		saveMutation.mutate(getInventoryPayload(form));
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{isEditing ? "Edit inventory" : "Add inventory"}</DialogTitle>
						<DialogDescription>Stock for one item at one warehouse.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div className="grid gap-1">
							<Label>Warehouse</Label>
							<SelectCombobox
								ariaLabel="Inventory warehouse"
								value={form.warehouseId}
								options={warehouses.map((warehouse) => ({
									label: `${warehouse.code} - ${warehouse.name}`,
									value: warehouse.id,
								}))}
								placeholder="Select warehouse"
								onChange={(value) => setForm((current) => ({ ...current, warehouseId: value }))}
							/>
						</div>
						<div className="grid gap-1">
							<Label>Item</Label>
							<SelectCombobox
								ariaLabel="Inventory item"
								value={form.itemId}
								options={items.map((item) => ({
									label: `${item.sku} - ${item.name}`,
									value: item.id,
								}))}
								placeholder="Select item"
								onChange={(value) => setForm((current) => ({ ...current, itemId: value }))}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="inventory-quantity">Quantity on hand</Label>
							<Input
								id="inventory-quantity"
								type="number"
								min={0}
								value={form.quantityOnHand}
								onChange={(event) =>
									setForm((current) => ({ ...current, quantityOnHand: event.target.value }))
								}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="inventory-reorder-point">Reorder point</Label>
							<Input
								id="inventory-reorder-point"
								type="number"
								min={0}
								value={form.reorderPoint}
								onChange={(event) =>
									setForm((current) => ({ ...current, reorderPoint: event.target.value }))
								}
							/>
						</div>
						{error ? <p className="text-sm text-destructive">{error}</p> : null}
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSaving}>
							{submitText}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
