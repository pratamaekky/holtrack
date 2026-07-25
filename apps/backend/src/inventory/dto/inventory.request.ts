import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class InventoryRequest {
	@IsString()
	@IsNotEmpty()
	warehouseId!: string;

	@IsString()
	@IsNotEmpty()
	itemId!: string;

	@IsInt()
	@Min(0)
	quantityOnHand!: number;

	@IsInt()
	@Min(0)
	reorderPoint!: number;
}
