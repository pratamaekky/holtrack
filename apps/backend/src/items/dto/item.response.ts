import type { Item, ItemStatus } from "../item.entity";

export class ItemResponse {
	id!: string;
	sku!: string;
	name!: string;
	categoryId!: string;
	category!: string;
	unit!: string;
	status!: ItemStatus;
	createdAt!: Date;

	static from(item: Item): ItemResponse {
		const response = new ItemResponse();
		response.id = item.id;
		response.sku = item.sku;
		response.name = item.name;
		response.categoryId = item.categoryId;
		response.category = item.category.name;
		response.unit = item.unit;
		response.status = item.status;
		response.createdAt = item.createdAt;
		return response;
	}
}
