import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { WarehouseStatus } from "../warehouse.entity";

export class WarehouseRequest {
	@IsString()
	@IsNotEmpty()
	@MaxLength(24)
	code!: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	name!: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(80)
	city!: string;

	@IsIn(["active", "inactive"])
	status!: WarehouseStatus;
}
