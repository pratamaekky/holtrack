import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SelectCombobox from "@/shared/components/forms/SelectCombobox";
import type { ResourceFilterDefinition } from "@/shared/utils/build-filter-query";

interface ResourceFilterPanelProps<TFilters extends Record<string, string>> {
	filterDefinitions: ResourceFilterDefinition[];
	filters: TFilters;
	onChange: (key: string, value: string) => void;
}

export default function ResourceFilterPanel<TFilters extends Record<string, string>>({
	filterDefinitions,
	filters,
	onChange,
}: ResourceFilterPanelProps<TFilters>) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="space-y-2">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => setIsOpen((current) => !current)}
			>
				Filter
			</Button>
			{isOpen ? (
				<div className="grid gap-2 md:grid-cols-4">
					{filterDefinitions.map((definition) =>
						definition.type === "select" ? (
							<SelectCombobox
								key={definition.key}
								ariaLabel={definition.ariaLabel}
								value={filters[definition.key] ?? ""}
								options={[{ label: "All", value: "" }, ...(definition.options ?? [])]}
								placeholder={definition.label}
								onChange={(value) => onChange(definition.key, value)}
							/>
						) : (
							<Input
								key={definition.key}
								aria-label={definition.ariaLabel}
								placeholder={definition.label}
								value={filters[definition.key] ?? ""}
								onChange={(event) => onChange(definition.key, event.target.value)}
							/>
						),
					)}
				</div>
			) : null}
		</div>
	);
}
