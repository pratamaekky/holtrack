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
import type { ItemCategory, ItemCategoryPayload } from "@/shared/data/wms";
import { useSaveItemCategory } from "../hooks/useSaveItemCategory";
import { getInitialItemCategoryForm } from "../utils/item-category-form";

interface ItemCategoryEditorDialogProps {
	category?: ItemCategory;
	onSaved: () => void;
}

export default function ItemCategoryEditorDialog({
	category,
	onSaved,
}: ItemCategoryEditorDialogProps) {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<ItemCategoryPayload>(() => getInitialItemCategoryForm(category));
	const [error, setError] = useState<string | null>(null);
	const isEditing = Boolean(category);
	const saveMutation = useSaveItemCategory({
		category,
		onError: setError,
		onSaved: () => {
			setOpen(false);
			onSaved();
		},
	});
	const isSaving = saveMutation.isPending;
	const title = isEditing ? "Edit item category" : "Add item category";
	const submitText = isSaving ? "Saving..." : "Save";
	const trigger = isEditing ? (
		<Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${category?.name}`}>
			<Pencil aria-hidden="true" />
		</Button>
	) : (
		<Button type="button">
			<Plus aria-hidden="true" />
			Add item category
		</Button>
	);

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		setError(null);
		setForm(getInitialItemCategoryForm(category));
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
						<DialogDescription>Item category master data.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div className="grid gap-1">
							<Label htmlFor="item-category-name">Name</Label>
							<Input
								id="item-category-name"
								value={form.name}
								maxLength={80}
								required
								onChange={(event) => setForm({ name: event.target.value })}
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
