import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { InventoryPolicyRequest } from "./dto/inventory-policy.request";
import { INVENTORY_POLICY_ID, InventoryPolicy } from "./inventory-policy.entity";

@Injectable()
export class InventoryPoliciesService {
	constructor(
		@InjectRepository(InventoryPolicy)
		private readonly policyRepository: Repository<InventoryPolicy>,
	) {}

	async get(): Promise<InventoryPolicy> {
		const policy = await this.policyRepository.findOneBy({
			id: INVENTORY_POLICY_ID,
		});

		if (policy) {
			return policy;
		}

		return this.policyRepository.save(
			this.policyRepository.create({
				id: INVENTORY_POLICY_ID,
				lowStockMode: "reorder_point",
				lowStockThreshold: 0,
			}),
		);
	}

	async update(request: InventoryPolicyRequest): Promise<InventoryPolicy> {
		const policy = await this.get();

		policy.lowStockMode = request.lowStockMode;
		policy.lowStockThreshold = request.lowStockThreshold;

		return this.policyRepository.save(policy);
	}
}
