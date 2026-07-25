import type { ItemCategory } from "../item-category.entity";

export class ItemCategoryResponse {
	id!: string;
	name!: string;
	createdAt!: Date;

	static from(category: ItemCategory): ItemCategoryResponse {
		const response = new ItemCategoryResponse();
		response.id = category.id;
		response.name = category.name;
		response.createdAt = category.createdAt;
		return response;
	}
}
