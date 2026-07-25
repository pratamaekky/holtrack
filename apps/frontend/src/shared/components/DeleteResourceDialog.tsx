import { Trash2 } from "lucide-react";
import { useState } from "react";
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
import { useDeleteResource } from "@/shared/hooks/useDeleteResource";

interface DeleteResourceDialogProps {
	endpoint: string;
	label: string;
	name: string;
	onDeleted: () => void;
}

export default function DeleteResourceDialog({
	endpoint,
	label,
	name,
	onDeleted,
}: DeleteResourceDialogProps) {
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const deleteMutation = useDeleteResource({
		endpoint,
		label,
		onDeleted,
		onError: setError,
		onSuccess: () => setOpen(false),
	});
	const isDeleting = deleteMutation.isPending;

	function handleDelete() {
		setError(null);
		deleteMutation.mutate();
	}

	const deleteButtonText = isDeleting ? "Deleting..." : "Delete";

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${name}`}>
					<Trash2 aria-hidden="true" />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete {label}</DialogTitle>
					<DialogDescription>Delete {name}. This cannot be undone.</DialogDescription>
				</DialogHeader>
				{error ? <p className="text-sm text-destructive">{error}</p> : null}
				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
						{deleteButtonText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
