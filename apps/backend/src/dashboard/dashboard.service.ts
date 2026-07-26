import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Inventory } from "../inventory/inventory.entity";
import type { InventoryRow } from "../inventory/inventory.service";
import { InventoryService } from "../inventory/inventory.service";
import { buildInventoryStatusSql } from "../inventory/inventory-status.sql";
import { InventoryPoliciesService } from "../inventory-policies/inventory-policies.service";

export interface InventoryStatusSummary {
	totalRows: number;
	inStockRows: number;
	lowStockRows: number;
	outOfStockRows: number;
}

export interface LowStockByCategory {
	category: string;
	count: number;
}

@Injectable()
export class DashboardService {
	constructor(
		@InjectRepository(Inventory) private readonly inventoryRepository: Repository<Inventory>,
		private readonly inventoryPoliciesService: InventoryPoliciesService,
		private readonly inventoryService: InventoryService,
	) {}

	async getInventoryStatusSummary(): Promise<InventoryStatusSummary> {
		const statusSql = await this.buildStatusSql();

		const rows = await this.inventoryRepository
			.createQueryBuilder("inventory")
			.select(statusSql, "status")
			.addSelect("COUNT(*)", "count")
			.groupBy(statusSql)
			.getRawMany<{ status: string; count: string }>();

		const summary: InventoryStatusSummary = {
			totalRows: 0,
			inStockRows: 0,
			lowStockRows: 0,
			outOfStockRows: 0,
		};

		for (const row of rows) {
			const count = Number(row.count);
			summary.totalRows += count;

			if (row.status === "in_stock") summary.inStockRows = count;
			if (row.status === "low_stock") summary.lowStockRows = count;
			if (row.status === "out_of_stock") summary.outOfStockRows = count;
		}

		return summary;
	}

	async getLowStockByCategory(): Promise<LowStockByCategory[]> {
		const statusSql = await this.buildStatusSql();

		const rows = await this.inventoryRepository
			.createQueryBuilder("inventory")
			.innerJoin("inventory.item", "item")
			.innerJoin("item.category", "category")
			.select("category.name", "category")
			.addSelect("COUNT(*)", "count")
			.where(`${statusSql} IN (:...statuses)`, { statuses: ["low_stock", "out_of_stock"] })
			.groupBy("category.name")
			.getRawMany<{ category: string; count: string }>();

		return rows.map((row) => ({ category: row.category, count: Number(row.count) }));
	}

	getLowStockItems(limit: number): Promise<InventoryRow[]> {
		return this.inventoryService.findLowStockRows(limit);
	}

	private async buildStatusSql(): Promise<string> {
		const policy = await this.inventoryPoliciesService.get();
		return buildInventoryStatusSql(policy);
	}
}
