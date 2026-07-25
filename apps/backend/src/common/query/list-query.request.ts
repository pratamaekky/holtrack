import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export type SortOrder = "ASC" | "DESC";

export abstract class ListQueryRequest {
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page: number = 1;

	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit: number = 10;

	@IsOptional()
	@IsString()
	sort?: string;

	@IsOptional()
	@IsIn(["ASC", "DESC"])
	order: SortOrder = "DESC";
}
