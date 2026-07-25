import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

export const INVENTORY_POLICY_ID = "default";

export type LowStockMode = "reorder_point" | "low_stock_threshold";

@Entity("inventory_policy")
export class InventoryPolicy {
	@PrimaryColumn()
	id!: string;

	@Column({ type: "varchar" })
	lowStockMode!: LowStockMode;

	@Column({ type: "int", default: 0 })
	lowStockThreshold!: number;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}
