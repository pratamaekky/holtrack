import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";
import { ItemCategory } from "../item-categories/item-category.entity";

export type ItemStatus = "active" | "discontinued";

@Entity("items")
export class Item extends BaseEntity {
	@Column({ unique: true })
	sku!: string;

	@Column()
	name!: string;

	@Column()
	categoryId!: string;

	@ManyToOne(
		() => ItemCategory,
		(category) => category.id,
		{ nullable: false },
	)
	@JoinColumn({ name: "categoryId" })
	category!: ItemCategory;

	@Column()
	unit!: string;

	@Column({ type: "varchar" })
	status!: ItemStatus;
}
