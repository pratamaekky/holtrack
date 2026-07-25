import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { WarehouseRequest } from "./dto/warehouse.request";
import { WarehouseResponse } from "./dto/warehouse.response";
import { WarehouseFilterRequest } from "./dto/warehouse-filter.request";
import { WarehousesService } from "./warehouses.service";

@Controller("warehouses")
export class WarehousesController {
	constructor(private readonly warehousesService: WarehousesService) {}

	@Get()
	async findAll(@Query() filter: WarehouseFilterRequest) {
		const warehouses = await this.warehousesService.findAll(filter);
		return warehouses.map(WarehouseResponse.from);
	}

	@Get(":id")
	async findById(@Param("id") id: string) {
		return WarehouseResponse.from(await this.warehousesService.findById(id));
	}

	@Post()
	async create(@Body() request: WarehouseRequest) {
		return WarehouseResponse.from(await this.warehousesService.create(request));
	}

	@Patch(":id")
	async update(@Param("id") id: string, @Body() request: WarehouseRequest) {
		return WarehouseResponse.from(await this.warehousesService.update(id, request));
	}

	@Delete(":id")
	async remove(@Param("id") id: string) {
		await this.warehousesService.remove(id);
		return { ok: true };
	}
}
