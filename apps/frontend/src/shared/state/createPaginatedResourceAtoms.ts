import { atom, type PrimitiveAtom } from "jotai";
import type { ResourceFilterDefinition } from "@/shared/utils/build-filter-query";

export interface PaginatedResourceConfig<
	TEntity,
	TFilters extends Record<string, string>,
	TSort extends string,
> {
	endpoint: string;
	filterDefinitions: ResourceFilterDefinition[];
	initialFilters: TFilters;
	initialSort: TSort;
	limit?: number;
	__entity?: TEntity;
}

export interface PaginatedResourceAtoms<
	TEntity,
	TFilters extends Record<string, string>,
	TSort extends string,
> {
	config: PaginatedResourceConfig<TEntity, TFilters, TSort>;
	filtersAtom: PrimitiveAtom<TFilters>;
	limitAtom: PrimitiveAtom<number>;
	orderAtom: PrimitiveAtom<"ASC" | "DESC">;
	pageAtom: PrimitiveAtom<number>;
	sortAtom: PrimitiveAtom<TSort>;
}

export function createPaginatedResourceAtoms<
	TEntity,
	TFilters extends Record<string, string>,
	TSort extends string,
>(
	config: PaginatedResourceConfig<TEntity, TFilters, TSort>,
): PaginatedResourceAtoms<TEntity, TFilters, TSort> {
	return {
		config,
		filtersAtom: atom(config.initialFilters),
		limitAtom: atom(config.limit ?? 5),
		orderAtom: atom<"ASC" | "DESC">("DESC"),
		pageAtom: atom(1),
		sortAtom: atom(config.initialSort),
	};
}
