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
import type { Warehouse, WarehousePayload } from "@/shared/data/wms";
import { useSaveWarehouse } from "../hooks/useSaveWarehouse";
import { getInitialWarehouseForm } from "../utils/warehouse-form";

interface WarehouseEditorDialogProps {
	warehouse?: Warehouse;
	onSaved: () => void;
}

const statusOptions: Array<{ label: string; value: WarehousePayload["status"] }> = [
	{ label: "Active", value: "active" },
	{ label: "Inactive", value: "inactive" },
];

export default function WarehouseEditorDialog({ warehouse, onSaved }: WarehouseEditorDialogProps) {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<WarehousePayload>(() => getInitialWarehouseForm(warehouse));
	const [error, setError] = useState<string | null>(null);
	const isEditing = Boolean(warehouse);
	const saveMutation = useSaveWarehouse({
		warehouse,
		onError: setError,
		onSaved: () => {
			setOpen(false);
			onSaved();
		},
	});
	const isSaving = saveMutation.isPending;
	const title = isEditing ? "Edit warehouse" : "Add warehouse";
	const description = isEditing ? "Update warehouse details." : "Create a warehouse.";
	const submitText = isSaving ? "Saving..." : "Save";
	const trigger = isEditing ? (
		<Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${warehouse?.code}`}>
			<Pencil aria-hidden="true" />
		</Button>
	) : (
		<Button type="button">
			<Plus aria-hidden="true" />
			Add warehouse
		</Button>
	);

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		setError(null);
		setForm(getInitialWarehouseForm(warehouse));
	}

	function updateField<TKey extends keyof WarehousePayload>(
		key: TKey,
		value: WarehousePayload[TKey],
	) {
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
							<Label htmlFor="warehouse-code">Code</Label>
							<Input
								id="warehouse-code"
								value={form.code}
								maxLength={24}
								required
								onChange={(event) => updateField("code", event.target.value)}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="warehouse-name">Name</Label>
							<Input
								id="warehouse-name"
								value={form.name}
								maxLength={120}
								required
								onChange={(event) => updateField("name", event.target.value)}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="warehouse-city">City</Label>
							<Input
								id="warehouse-city"
								value={form.city}
								maxLength={80}
								required
								onChange={(event) => updateField("city", event.target.value)}
							/>
						</div>
						<div className="grid gap-1">
							<Label>Status</Label>
							<SelectCombobox
								ariaLabel="Warehouse status"
								value={form.status}
								options={statusOptions}
								placeholder="Select status"
								onChange={(value) => updateField("status", value as WarehousePayload["status"])}
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
