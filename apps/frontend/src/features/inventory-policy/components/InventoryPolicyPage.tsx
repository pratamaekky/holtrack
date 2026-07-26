import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SelectCombobox from "@/shared/components/forms/SelectCombobox";
import type { InventoryPolicyPayload, LowStockMode } from "@/shared/data/wms";
import { useInventoryPolicy } from "../hooks/useInventoryPolicy";
import { useSaveInventoryPolicy } from "../hooks/useSaveInventoryPolicy";

const modeOptions: Array<{ label: string; value: LowStockMode }> = [
	{ label: "Use reorder point", value: "reorder_point" },
	{ label: "Use low stock threshold", value: "low_stock_threshold" },
];

export default function InventoryPolicyPage() {
	const { data: policy, error: loadError, loading } = useInventoryPolicy();
	const [form, setForm] = useState<InventoryPolicyPayload>({
		lowStockMode: "reorder_point",
		lowStockThreshold: 0,
	});
	const [saveError, setSaveError] = useState<string | null>(null);
	const saveMutation = useSaveInventoryPolicy({
		onError: setSaveError,
		onSaved: () => {
			setSaveError(null);
			toast.success("Inventory policy saved.");
		},
	});

	useEffect(() => {
		if (policy) {
			setForm({ lowStockMode: policy.lowStockMode, lowStockThreshold: policy.lowStockThreshold });
		}
	}, [policy]);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaveError(null);
		saveMutation.mutate(form);
	}

	if (loading && !policy) {
		return null;
	}

	if (loadError && !policy) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Inventory Policy</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-destructive">{loadError}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Inventory Policy</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="grid max-w-sm gap-3">
					<div className="grid gap-1">
						<Label>Low stock mode</Label>
						<SelectCombobox
							ariaLabel="Low stock mode"
							value={form.lowStockMode}
							options={modeOptions}
							placeholder="Select mode"
							onChange={(value) => setForm((current) => ({ ...current, lowStockMode: value }))}
						/>
					</div>
					{form.lowStockMode === "low_stock_threshold" ? (
						<div className="grid gap-1">
							<Label htmlFor="low-stock-threshold">Low stock threshold</Label>
							<Input
								id="low-stock-threshold"
								type="number"
								min={0}
								value={form.lowStockThreshold}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										lowStockThreshold: Number(event.target.value),
									}))
								}
							/>
						</div>
					) : null}
					{saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
					<Button type="submit" disabled={saveMutation.isPending}>
						{saveMutation.isPending ? "Saving..." : "Save"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
