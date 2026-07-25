import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { PaginatedResponse } from "../common/query/paginated.response";
import { ItemCategoryRequest } from "./dto/item-category.request";
import { ItemCategoryResponse } from "./dto/item-category.response";
import { ItemCategoryFilterRequest } from "./dto/item-category-filter.request";
import { ItemCategoriesService } from "./item-categories.service";

@Controller("item-categories")
export class ItemCategoriesController {
	constructor(private readonly itemCategoriesService: ItemCategoriesService) {}

	@Get()
	async findAll(@Query() filter: ItemCategoryFilterRequest) {
		const { data, total } = await this.itemCategoriesService.findAll(filter);
		return PaginatedResponse.from(
			data.map(ItemCategoryResponse.from),
			filter.page,
			filter.limit,
			total,
		);
	}

	@Get(":id")
	async findById(@Param("id") id: string) {
		return ItemCategoryResponse.from(await this.itemCategoriesService.findById(id));
	}

	@Post()
	async create(@Body() request: ItemCategoryRequest) {
		return ItemCategoryResponse.from(await this.itemCategoriesService.create(request));
	}

	@Patch(":id")
	async update(@Param("id") id: string, @Body() request: ItemCategoryRequest) {
		return ItemCategoryResponse.from(await this.itemCategoriesService.update(id, request));
	}

	@Delete(":id")
	async remove(@Param("id") id: string) {
		await this.itemCategoriesService.remove(id);
		return { ok: true };
	}
}
