import type { ObjectLiteral, SelectQueryBuilder } from "typeorm";
import type { BaseFilter } from "../filter";

export class FilterQueryBuilder<T extends ObjectLiteral> {
	constructor(private readonly queryBuilder: SelectQueryBuilder<T>) {}

	applyFilter(filter: BaseFilter): this {
		filter.applyTo(this.queryBuilder);
		return this;
	}

	getMany(): Promise<T[]> {
		return this.queryBuilder.getMany();
	}
}
