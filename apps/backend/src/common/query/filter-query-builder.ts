import { BadRequestException } from "@nestjs/common";
import type { ObjectLiteral, SelectQueryBuilder } from "typeorm";
import type { BaseFilter } from "../filter";
import type { ListQueryRequest } from "./list-query.request";

export class FilterQueryBuilder<T extends ObjectLiteral> {
	constructor(private readonly queryBuilder: SelectQueryBuilder<T>) {}

	applyFilter(filter: BaseFilter): this {
		filter.applyTo(this.queryBuilder);
		return this;
	}

	getMany(): Promise<T[]> {
		return this.queryBuilder.getMany();
	}

	async getPaginated(
		query: ListQueryRequest,
		sortMap: Record<string, string>,
		defaultSortField: string,
	): Promise<{ data: T[]; total: number }> {
		const total = await this.queryBuilder.clone().getCount();
		this.applySort(query, sortMap, defaultSortField).applyPagination(query);

		return { data: await this.queryBuilder.getMany(), total };
	}

	async getRawPaginated(
		query: ListQueryRequest,
		sortMap: Record<string, string>,
		defaultSortField: string,
	): Promise<{ data: Record<string, unknown>[]; total: number }> {
		const total = await this.queryBuilder.clone().getCount();
		this.applySort(query, sortMap, defaultSortField).applyPagination(query);

		return { data: await this.queryBuilder.getRawMany(), total };
	}

	private applySort(
		query: ListQueryRequest,
		sortMap: Record<string, string>,
		defaultSortField: string,
	): this {
		const field = query.sort ?? defaultSortField;
		const path = sortMap[field];

		if (!path) {
			throw new BadRequestException(`Unsupported sort field '${field}'`);
		}

		this.queryBuilder.orderBy(path, query.order);
		return this;
	}

	private applyPagination(query: ListQueryRequest): this {
		// .limit()/.offset() emit a literal SQL LIMIT/OFFSET; .skip()/.take() instead
		// build a subquery-based pagination strategy meant for getMany() with
		// one-to-many joins, which silently ignores the limit under getRawMany().
		// All joins in this codebase are many-to-one, so plain LIMIT/OFFSET is correct
		// for both getMany() and getRawMany().
		this.queryBuilder.offset((query.page - 1) * query.limit).limit(query.limit);
		return this;
	}
}
