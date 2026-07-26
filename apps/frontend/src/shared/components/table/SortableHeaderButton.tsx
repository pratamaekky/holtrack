import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SortableHeaderButtonProps<TSort extends string> {
	activeOrder: "ASC" | "DESC";
	activeSort: TSort;
	field: TSort;
	label: string;
	onToggle: (field: TSort) => void;
}

export default function SortableHeaderButton<TSort extends string>({
	activeOrder,
	activeSort,
	field,
	label,
	onToggle,
}: SortableHeaderButtonProps<TSort>) {
	const isActive = field === activeSort;
	const state = isActive
		? `sorted ${activeOrder === "ASC" ? "ascending" : "descending"}`
		: "not sorted";
	const Icon = isActive ? (activeOrder === "ASC" ? ArrowUp : ArrowDown) : ChevronsUpDown;

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			aria-label={`${label}: ${state}`}
			onClick={() => onToggle(field)}
		>
			{label}
			<Icon aria-hidden="true" className="size-3.5" />
		</Button>
	);
}
