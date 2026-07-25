import { IsOptional, IsString } from "class-validator";
import { BaseFilter, FilterOperator, Operator } from "../../common/filter";
import type { WarehouseStatus } from "../warehouse.entity";

export class WarehouseFilterRequest extends BaseFilter {
	@Operator(FilterOperator.ILIKE, { path: "warehouse.code" })
	@IsOptional()
	@IsString()
	code?: string;

	@Operator(FilterOperator.ILIKE, { path: "warehouse.name" })
	@IsOptional()
	@IsString()
	name?: string;

	@Operator(FilterOperator.ILIKE, { path: "warehouse.city" })
	@IsOptional()
	@IsString()
	city?: string;

	@Operator(FilterOperator.EQ, { path: "warehouse.status" })
	@IsOptional()
	@IsString()
	status?: WarehouseStatus | string;
}
