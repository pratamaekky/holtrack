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
		this.queryBuilder.skip((query.page - 1) * query.limit).take(query.limit);
		return this;
	}
}
