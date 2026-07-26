import { Controller, Get, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { LowStockItemsQuery } from "./dto/low-stock-items.query";

@Controller("dashboard")
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@Get("inventory-status-summary")
	getInventoryStatusSummary() {
		return this.dashboardService.getInventoryStatusSummary();
	}

	@Get("low-stock-by-category")
	getLowStockByCategory() {
		return this.dashboardService.getLowStockByCategory();
	}

	@Get("low-stock-items")
	getLowStockItems(@Query() query: LowStockItemsQuery) {
		return this.dashboardService.getLowStockItems(query.limit);
	}
}
