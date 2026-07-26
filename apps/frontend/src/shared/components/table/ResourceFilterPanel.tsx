import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
	const activeFilters = filterDefinitions
		.map((definition) => ({ definition, value: (filters[definition.key] ?? "").trim() }))
		.filter((entry) => entry.value.length > 0);

	function clearAll() {
		for (const entry of activeFilters) {
			onChange(entry.definition.key, "");
		}
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Popover>
				<PopoverTrigger asChild>
					<Button type="button" variant="outline" size="sm" className="gap-1.5">
						<Filter aria-hidden="true" />
						Filter
						{activeFilters.length > 0 ? (
							<Badge className="px-1.5">{activeFilters.length}</Badge>
						) : null}
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
			{activeFilters.map(({ definition, value }) => (
				<Badge key={definition.key} variant="outline" className="gap-1.5 font-normal">
					<span className="text-muted-foreground">{definition.label}</span>
					{displayFilterValue(definition, value)}
				</Badge>
			))}
			{activeFilters.length > 0 ? (
				<Button type="button" variant="ghost" size="sm" onClick={clearAll}>
					<X aria-hidden="true" />
					Clear
				</Button>
			) : null}
		</div>
	);
}

function displayFilterValue(definition: ResourceFilterDefinition, value: string) {
	if (definition.type === "select") {
		return definition.options?.find((option) => option.value === value)?.label ?? value;
	}

	return value;
}
