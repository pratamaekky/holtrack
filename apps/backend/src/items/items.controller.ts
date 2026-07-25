import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ItemRequest } from "./dto/item.request";
import { ItemResponse } from "./dto/item.response";
import { ItemFilterRequest } from "./dto/item-filter.request";
import { ItemsService } from "./items.service";

@Controller("items")
export class ItemsController {
	constructor(private readonly itemsService: ItemsService) {}

	@Get()
	async findAll(@Query() filter: ItemFilterRequest) {
		const items = await this.itemsService.findAll(filter);
		return items.map(ItemResponse.from);
	}

	@Get(":id")
	async findById(@Param("id") id: string) {
		return ItemResponse.from(await this.itemsService.findById(id));
	}

	@Post()
	async create(@Body() request: ItemRequest) {
		return ItemResponse.from(await this.itemsService.create(request));
	}

	@Patch(":id")
	async update(@Param("id") id: string, @Body() request: ItemRequest) {
		return ItemResponse.from(await this.itemsService.update(id, request));
	}

	@Delete(":id")
	async remove(@Param("id") id: string) {
		await this.itemsService.remove(id);
		return { ok: true };
	}
}
