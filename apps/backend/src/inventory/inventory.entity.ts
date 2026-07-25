import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";
import { Item } from "../items/item.entity";
import { Warehouse } from "../warehouses/warehouse.entity";

@Entity("inventory")
@Unique(["warehouseId", "itemId"])
export class Inventory extends BaseEntity {
	@Column()
	warehouseId!: string;

	@ManyToOne(() => Warehouse, { eager: true })
	@JoinColumn({ name: "warehouseId" })
	warehouse!: Warehouse;

	@Column()
	itemId!: string;

	@ManyToOne(() => Item, { eager: true })
	@JoinColumn({ name: "itemId" })
	item!: Item;

	@Column()
	quantityOnHand!: number;

	@Column()
	reorderPoint!: number;
}
