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
	const state = isActive ? (activeOrder === "ASC" ? "ascending" : "descending") : "not sorted";

	return (
		<Button type="button" variant="ghost" size="sm" onClick={() => onToggle(field)}>
			{`${label}: ${state}`}
		</Button>
	);
}
