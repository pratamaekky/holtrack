import { Button } from "@/components/ui/button";

interface PaginationFooterProps {
	onNext: () => void;
	onPrev: () => void;
	page: number;
	totalPages: number;
}

export default function PaginationFooter({
	onNext,
	onPrev,
	page,
	totalPages,
}: PaginationFooterProps) {
	return (
		<div className="flex items-center justify-between gap-3 border-t px-4 py-3">
			<span className="text-sm text-muted-foreground">{`Page ${page} of ${totalPages}`}</span>
			<div className="flex gap-2">
				<Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={onPrev}>
					Prev
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={page >= totalPages}
					onClick={onNext}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
