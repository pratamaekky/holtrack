import type { Warehouse, WarehouseStatus } from "../warehouse.entity";

export class WarehouseResponse {
	id!: string;
	code!: string;
	name!: string;
	city!: string;
	status!: WarehouseStatus;
	createdAt!: Date;

	static from(warehouse: Warehouse): WarehouseResponse {
		const response = new WarehouseResponse();
		response.id = warehouse.id;
		response.code = warehouse.code;
		response.name = warehouse.name;
		response.city = warehouse.city;
		response.status = warehouse.status;
		response.createdAt = warehouse.createdAt;
		return response;
	}
}
