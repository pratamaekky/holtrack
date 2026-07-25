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
import type { Item, ItemPayload } from "@/shared/data/wms";
import { useSaveItem } from "../hooks/useSaveItem";
import { getInitialItemForm } from "../utils/item-form";

interface ItemEditorDialogProps {
	item?: Item;
	onSaved: () => void;
}

const statusOptions: Array<{ label: string; value: ItemPayload["status"] }> = [
	{ label: "Active", value: "active" },
	{ label: "Discontinued", value: "discontinued" },
];

export default function ItemEditorDialog({ item, onSaved }: ItemEditorDialogProps) {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<ItemPayload>(() => getInitialItemForm(item));
	const [error, setError] = useState<string | null>(null);
	const isEditing = Boolean(item);
	const saveMutation = useSaveItem({
		item,
		onError: setError,
		onSaved: () => {
			setOpen(false);
			onSaved();
		},
	});
	const isSaving = saveMutation.isPending;
	const title = isEditing ? "Edit item" : "Add item";
	const description = isEditing ? "Update item master data." : "Create item master data.";
	const submitText = isSaving ? "Saving..." : "Save";
	const trigger = isEditing ? (
		<Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${item?.sku}`}>
			<Pencil aria-hidden="true" />
		</Button>
	) : (
		<Button type="button">
			<Plus aria-hidden="true" />
			Add item
		</Button>
	);

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		setError(null);
		setForm(getInitialItemForm(item));
	}

	function updateField<TKey extends keyof ItemPayload>(key: TKey, value: ItemPayload[TKey]) {
		setForm((current) => ({ ...current, [key]: value }));
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		saveMutation.mutate(form);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div className="grid gap-1">
							<Label htmlFor="item-sku">SKU</Label>
							<Input
								id="item-sku"
								value={form.sku}
								maxLength={40}
								required
								onChange={(event) => updateField("sku", event.target.value)}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="item-name">Name</Label>
							<Input
								id="item-name"
								value={form.name}
								maxLength={140}
								required
								onChange={(event) => updateField("name", event.target.value)}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="item-category-id">Category ID</Label>
							<Input
								id="item-category-id"
								value={form.categoryId}
								required
								onChange={(event) => updateField("categoryId", event.target.value)}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="item-unit">Unit</Label>
							<Input
								id="item-unit"
								value={form.unit}
								maxLength={24}
								required
								onChange={(event) => updateField("unit", event.target.value)}
							/>
						</div>
						<div className="grid gap-1">
							<Label>Status</Label>
							<SelectCombobox
								ariaLabel="Item status"
								value={form.status}
								options={statusOptions}
								placeholder="Select status"
								onChange={(value) => updateField("status", value as ItemPayload["status"])}
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
