import type { ObjectLiteral, SelectQueryBuilder } from "typeorm";
import type { FilterOperator } from "./filter-operator";

export type FilterExecutor = <T extends ObjectLiteral>(
	queryBuilder: SelectQueryBuilder<T>,
	path: string,
	value: string,
) => void;

export interface FilterOperatorMeta {
	executor?: FilterExecutor;
	field: string;
	operator: FilterOperator;
	path?: string;
}
