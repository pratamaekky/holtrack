import { Body, Controller, Get, Put } from "@nestjs/common";
import { InventoryPolicyRequest } from "./dto/inventory-policy.request";
import { InventoryPolicyResponse } from "./dto/inventory-policy.response";
import { InventoryPoliciesService } from "./inventory-policies.service";

@Controller("inventory-policy")
export class InventoryPoliciesController {
	constructor(private readonly inventoryPoliciesService: InventoryPoliciesService) {}

	@Get()
	async get() {
		return InventoryPolicyResponse.from(await this.inventoryPoliciesService.get());
	}

	@Put()
	async update(@Body() request: InventoryPolicyRequest) {
		return InventoryPolicyResponse.from(await this.inventoryPoliciesService.update(request));
	}
}
