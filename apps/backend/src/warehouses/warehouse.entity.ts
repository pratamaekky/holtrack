import { Column, Entity } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";

export type WarehouseStatus = "active" | "inactive";

@Entity("warehouses")
export class Warehouse extends BaseEntity {
	@Column({ unique: true })
	code!: string;

	@Column()
	name!: string;

	@Column()
	city!: string;

	@Column({ type: "varchar" })
	status!: WarehouseStatus;
}
