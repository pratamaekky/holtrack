import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ItemCategoryRequest {
	@IsString()
	@IsNotEmpty()
	@MaxLength(80)
	name!: string;
}
