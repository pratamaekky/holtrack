import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { FilterQueryBuilder } from "../common/query/filter-query-builder";
import { Inventory } from "../inventory/inventory.entity";
import { ItemCategory } from "../item-categories/item-category.entity";
import type { ItemRequest } from "./dto/item.request";
import type { ItemFilterRequest } from "./dto/item-filter.request";
import { Item } from "./item.entity";

@Injectable()
export class ItemsService {
	constructor(
		@InjectRepository(Item) private readonly itemRepository: Repository<Item>,
		@InjectRepository(Inventory) private readonly inventoryRepository: Repository<Inventory>,
		@InjectRepository(ItemCategory)
		private readonly categoryRepository: Repository<ItemCategory>,
	) {}

	findAll(filter: ItemFilterRequest): Promise<Item[]> {
		const queryBuilder = this.itemRepository
			.createQueryBuilder("item")
			.leftJoinAndSelect("item.category", "category")
			.orderBy("item.createdAt", "DESC");

		return new FilterQueryBuilder(queryBuilder).applyFilter(filter).getMany();
	}

	async findById(id: string): Promise<Item> {
		const item = await this.itemRepository.findOne({
			where: { id },
			relations: { category: true },
		});

		if (!item) {
			throw new NotFoundException(`Item '${id}' not found`);
		}

		return item;
	}

	async create(request: ItemRequest): Promise<Item> {
		const sku = normalizeSku(request.sku);
		await this.assertSkuAvailable(sku);
		await this.assertCategoryExists(request.categoryId);

		const item = await this.itemRepository.save(
			this.itemRepository.create({
				sku,
				name: request.name.trim(),
				categoryId: request.categoryId,
				unit: request.unit.trim(),
				status: request.status,
			}),
		);

		return this.findById(item.id);
	}

	async update(id: string, request: ItemRequest): Promise<Item> {
		const item = await this.findById(id);
		const sku = normalizeSku(request.sku);
		await this.assertSkuAvailable(sku, id);
		await this.assertCategoryExists(request.categoryId);

		item.sku = sku;
		item.name = request.name.trim();
		item.categoryId = request.categoryId;
		item.unit = request.unit.trim();
		item.status = request.status;

		await this.itemRepository.save(item);
		return this.findById(id);
	}

	async remove(id: string): Promise<void> {
		await this.findById(id);

		const inventoryCount = await this.inventoryRepository.countBy({ itemId: id });
		if (inventoryCount > 0) {
			throw new ConflictException("Item cannot be deleted while inventory exists");
		}

		await this.itemRepository.delete(id);
	}

	private async assertSkuAvailable(sku: string, currentId?: string) {
		const where = currentId ? { sku, id: Not(currentId) } : { sku };
		const existingItem = await this.itemRepository.findOneBy(where);

		if (existingItem) {
			throw new ConflictException(`SKU '${sku}' is already in use`);
		}
	}

	private async assertCategoryExists(categoryId: string) {
		const category = await this.categoryRepository.findOneBy({ id: categoryId });

		if (!category) {
			throw new NotFoundException(`Item category '${categoryId}' not found`);
		}
	}
}

function normalizeSku(sku: string) {
	return sku.trim().toUpperCase();
}
