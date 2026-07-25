import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { ItemStatus } from "../item.entity";

export class ItemRequest {
	@IsString()
	@IsNotEmpty()
	@MaxLength(40)
	sku!: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(140)
	name!: string;

	@IsString()
	@IsNotEmpty()
	categoryId!: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(24)
	unit!: string;

	@IsIn(["active", "discontinued"])
	status!: ItemStatus;
}
