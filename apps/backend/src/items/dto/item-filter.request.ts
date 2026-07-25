import { IsOptional, IsString } from "class-validator";
import { BaseFilter, FilterOperator, Operator } from "../../common/filter";
import type { ItemStatus } from "../item.entity";

export class ItemFilterRequest extends BaseFilter {
	@Operator(FilterOperator.ILIKE, { path: "item.sku" })
	@IsOptional()
	@IsString()
	sku?: string;

	@Operator(FilterOperator.ILIKE, { path: "item.name" })
	@IsOptional()
	@IsString()
	name?: string;

	@Operator(FilterOperator.ILIKE, { path: "category.name" })
	@IsOptional()
	@IsString()
	category?: string;

	@Operator(FilterOperator.EQ, { path: "item.status" })
	@IsOptional()
	@IsString()
	status?: ItemStatus | string;
}
