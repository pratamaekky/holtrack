import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class LowStockItemsQuery {
	@Type(() => Number)
	@IsOptional()
	@IsInt()
	@Min(1)
	limit: number = 10;
}
