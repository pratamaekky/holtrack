import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { FilterQueryBuilder } from "../common/query/filter-query-builder";
import { Item } from "../items/item.entity";
import type { ItemCategoryRequest } from "./dto/item-category.request";
import {
	ITEM_CATEGORY_SORT_FIELDS,
	type ItemCategoryFilterRequest,
} from "./dto/item-category-filter.request";
import { ItemCategory } from "./item-category.entity";

@Injectable()
export class ItemCategoriesService {
	constructor(
		@InjectRepository(ItemCategory)
		private readonly categoryRepository: Repository<ItemCategory>,
		@InjectRepository(Item) private readonly itemRepository: Repository<Item>,
	) {}

	findAll(filter: ItemCategoryFilterRequest): Promise<{
		data: ItemCategory[];
		total: number;
	}> {
		const queryBuilder = this.categoryRepository.createQueryBuilder("itemCategory");

		return new FilterQueryBuilder(queryBuilder)
			.applyFilter(filter)
			.getPaginated(filter, ITEM_CATEGORY_SORT_FIELDS, "createdAt");
	}

	async findById(id: string): Promise<ItemCategory> {
		const category = await this.categoryRepository.findOneBy({ id });

		if (!category) {
			throw new NotFoundException(`Item category '${id}' not found`);
		}

		return category;
	}

	async create(request: ItemCategoryRequest): Promise<ItemCategory> {
		const name = request.name.trim();
		await this.assertNameAvailable(name);

		return this.categoryRepository.save(this.categoryRepository.create({ name }));
	}

	async update(id: string, request: ItemCategoryRequest): Promise<ItemCategory> {
		const category = await this.findById(id);
		const name = request.name.trim();
		await this.assertNameAvailable(name, id);

		category.name = name;
		return this.categoryRepository.save(category);
	}

	async remove(id: string): Promise<void> {
		await this.findById(id);

		const itemCount = await this.itemRepository.countBy({ categoryId: id });
		if (itemCount > 0) {
			throw new ConflictException("Item category cannot be deleted while items reference it");
		}

		await this.categoryRepository.delete(id);
	}

	private async assertNameAvailable(name: string, currentId?: string) {
		const where = currentId ? { name, id: Not(currentId) } : { name };
		const existingCategory = await this.categoryRepository.findOneBy(where);

		if (existingCategory) {
			throw new ConflictException(`Item category '${name}' is already in use`);
		}
	}
}
