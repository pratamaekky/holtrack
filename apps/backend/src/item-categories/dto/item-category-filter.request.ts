import { IsOptional, IsString } from "class-validator";
import { BaseFilter, FilterOperator, Operator } from "../../common/filter";

export const ITEM_CATEGORY_SORT_FIELDS: Record<string, string> = {
	name: "itemCategory.name",
	createdAt: "itemCategory.createdAt",
};

export class ItemCategoryFilterRequest extends BaseFilter {
	@Operator(FilterOperator.ILIKE, { path: "itemCategory.name" })
	@IsOptional()
	@IsString()
	name?: string;
}
