import type { InventoryPolicy } from "../inventory-policy.entity";

export class InventoryPolicyResponse {
	id!: string;
	lowStockMode!: InventoryPolicy["lowStockMode"];
	lowStockThreshold!: number;
	createdAt!: Date;
	updatedAt!: Date;

	static from(policy: InventoryPolicy): InventoryPolicyResponse {
		const response = new InventoryPolicyResponse();
		response.id = policy.id;
		response.lowStockMode = policy.lowStockMode;
		response.lowStockThreshold = policy.lowStockThreshold;
		response.createdAt = policy.createdAt;
		response.updatedAt = policy.updatedAt;
		return response;
	}
}
