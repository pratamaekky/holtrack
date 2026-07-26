import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
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
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button type="button" variant="outline" size="sm">
					<Filter aria-hidden="true" />
					Filter
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-96">
				<PopoverTitle>Filters</PopoverTitle>
				<div className="grid grid-cols-2 gap-3">
					{filterDefinitions.map((definition) => (
						<div key={definition.key} className="grid gap-1">
							<Label className="text-muted-foreground">{definition.label}</Label>
							{definition.type === "select" ? (
								<SelectCombobox
									ariaLabel={definition.ariaLabel}
									value={filters[definition.key] ?? ""}
									options={[{ label: "Any", value: "" }, ...(definition.options ?? [])]}
									placeholder={definition.label}
									onChange={(value) => onChange(definition.key, value)}
								/>
							) : (
								<Input
									aria-label={definition.ariaLabel}
									value={filters[definition.key] ?? ""}
									onChange={(event) => onChange(definition.key, event.target.value)}
								/>
							)}
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
