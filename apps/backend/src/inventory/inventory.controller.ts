import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { PaginatedResponse } from "../common/query/paginated.response";
import { InventoryRequest } from "./dto/inventory.request";
import { InventoryFilterRequest } from "./dto/inventory-filter.request";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
export class InventoryController {
	constructor(private readonly inventoryService: InventoryService) {}

	@Get()
	async findAll(@Query() filter: InventoryFilterRequest) {
		const { data, total } = await this.inventoryService.findAll(filter);
		return PaginatedResponse.from(data, filter.page, filter.limit, total);
	}

	@Post()
	async create(@Body() request: InventoryRequest) {
		return this.inventoryService.create(request);
	}

	@Patch(":id")
	async update(@Param("id") id: string, @Body() request: InventoryRequest) {
		return this.inventoryService.update(id, request);
	}

	@Delete(":id")
	async remove(@Param("id") id: string) {
		await this.inventoryService.remove(id);
		return { ok: true };
	}
}
