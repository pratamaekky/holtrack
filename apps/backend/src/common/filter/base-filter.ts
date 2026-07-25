import { BadRequestException } from "@nestjs/common";
import type { ObjectLiteral, SelectQueryBuilder } from "typeorm";
import { FilterOperator } from "./filter-operator";
import { getFilterOperators } from "./operator.decorator";

export abstract class BaseFilter {
	applyTo<T extends ObjectLiteral>(queryBuilder: SelectQueryBuilder<T>): void {
		let paramIndex = 0;

		for (const meta of getFilterOperators(this)) {
			const raw = (this as unknown as Record<string, string | string[] | undefined>)[meta.field];
			if (raw === undefined || raw === null) {
				continue;
			}

			const values = Array.isArray(raw) ? raw : [raw];

			for (const rawValue of values) {
				const parsed = parseFilterValue(rawValue, meta.operator);
				if (!parsed) {
					continue;
				}

				if (parsed.operator !== meta.operator) {
					continue;
				}

				const path = meta.path ?? `${queryBuilder.alias}.${meta.field}`;
				if (meta.executor) {
					meta.executor(queryBuilder, path, parsed.value);
				} else {
					applyDefaultFilter(queryBuilder, path, parsed.value, meta.operator, paramIndex);
				}

				paramIndex += 1;
			}
		}
	}
}

function parseFilterValue(rawValue: string, defaultOperator: FilterOperator) {
	if (!rawValue.trim()) {
		return null;
	}

	const separatorIndex = rawValue.indexOf(":");
	if (separatorIndex === -1) {
		return { operator: defaultOperator, value: rawValue.trim() };
	}

	const operator = rawValue.slice(0, separatorIndex) as FilterOperator;
	const value = rawValue.slice(separatorIndex + 1).trim();
	if (!Object.values(FilterOperator).includes(operator)) {
		throw new BadRequestException(`Unsupported filter operator '${operator}'`);
	}

	if (!value) {
		return null;
	}

	return { operator, value };
}

function applyDefaultFilter<T extends ObjectLiteral>(
	queryBuilder: SelectQueryBuilder<T>,
	path: string,
	value: string,
	operator: FilterOperator,
	paramIndex: number,
) {
	const paramName = `${path.replaceAll(".", "_")}_${paramIndex}`;

	if (operator === FilterOperator.EQ) {
		queryBuilder.andWhere(`${path} = :${paramName}`, { [paramName]: value });
		return;
	}

	if (operator === FilterOperator.ILIKE) {
		queryBuilder.andWhere(`LOWER(${path}) LIKE :${paramName}`, {
			[paramName]: `%${value.toLowerCase()}%`,
		});
	}
}
