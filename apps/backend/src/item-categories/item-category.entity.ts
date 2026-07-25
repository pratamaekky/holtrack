import { Column, Entity } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";

@Entity("item_categories")
export class ItemCategory extends BaseEntity {
	@Column({ unique: true })
	name!: string;
}
