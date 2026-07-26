import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { FilterQueryBuilder } from "../common/query/filter-query-builder";
import { InventoryPoliciesService } from "../inventory-policies/inventory-policies.service";
import { Item } from "../items/item.entity";
import { Warehouse } from "../warehouses/warehouse.entity";
import type { InventoryRequest } from "./dto/inventory.request";
import { INVENTORY_SORT_FIELDS, type InventoryFilterRequest } from "./dto/inventory-filter.request";
import { Inventory } from "./inventory.entity";
import { buildInventoryStatusSql } from "./inventory-status.sql";

export interface InventoryRow {
	id: string;
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
	itemId: string;
	itemSku: string;
	itemName: string;
	category: string;
	quantityOnHand: number;
	reorderPoint: number;
	status: string;
	updatedAt: Date;
}

const INVENTORY_SELECT = [
	"inventory.id AS id",
	'inventory.warehouseId AS "warehouseId"',
	'warehouse.code AS "warehouseCode"',
	'warehouse.name AS "warehouseName"',
	'inventory.itemId AS "itemId"',
	'item.sku AS "itemSku"',
	'item.name AS "itemName"',
	"category.name AS category",
	'inventory.quantityOnHand AS "quantityOnHand"',
	'inventory.reorderPoint AS "reorderPoint"',
	'inventory.updatedAt AS "updatedAt"',
];

function mapInventoryRow(row: Record<string, unknown>): InventoryRow {
	return {
		...row,
		quantityOnHand: Number(row.quantityOnHand),
		reorderPoint: Number(row.reorderPoint),
	} as InventoryRow;
}

@Injectable()
export class InventoryService {
	constructor(
		@InjectRepository(Inventory) private readonly inventoryRepository: Repository<Inventory>,
		@InjectRepository(Warehouse) private readonly warehouseRepository: Repository<Warehouse>,
		@InjectRepository(Item) private readonly itemRepository: Repository<Item>,
		private readonly inventoryPoliciesService: InventoryPoliciesService,
	) {}

	async findAll(filter: InventoryFilterRequest): Promise<{ data: InventoryRow[]; total: number }> {
		const statusSql = await this.buildStatusSql();

		const queryBuilder = this.inventoryRepository
			.createQueryBuilder("inventory")
			.innerJoin("inventory.warehouse", "warehouse")
			.innerJoin("inventory.item", "item")
			.innerJoin("item.category", "category")
			.select(INVENTORY_SELECT)
			.addSelect(statusSql, "status");

		new FilterQueryBuilder(queryBuilder).applyFilter(filter);
		this.applyStatusFilter(queryBuilder, filter.status, statusSql);

		const { data, total } = await new FilterQueryBuilder(queryBuilder).getRawPaginated(
			filter,
			INVENTORY_SORT_FIELDS,
			"updatedAt",
		);

		return { data: data.map(mapInventoryRow), total };
	}

	async findLowStockRows(limit: number): Promise<InventoryRow[]> {
		const statusSql = await this.buildStatusSql();
		const severitySql = `CASE (${statusSql}) WHEN 'out_of_stock' THEN 0 WHEN 'low_stock' THEN 1 ELSE 2 END`;

		const rows = await this.inventoryRepository
			.createQueryBuilder("inventory")
			.innerJoin("inventory.warehouse", "warehouse")
			.innerJoin("inventory.item", "item")
			.innerJoin("item.category", "category")
			.select(INVENTORY_SELECT)
			.addSelect(statusSql, "status")
			.where(`${statusSql} IN (:...statuses)`, { statuses: ["low_stock", "out_of_stock"] })
			.orderBy(severitySql, "ASC")
			.addOrderBy("inventory.quantityOnHand", "ASC")
			.limit(limit)
			.getRawMany();

		return rows.map(mapInventoryRow);
	}

	async create(request: InventoryRequest): Promise<InventoryRow> {
		await this.assertWarehouseExists(request.warehouseId);
		await this.assertItemExists(request.itemId);
		await this.assertNotDuplicate(request.warehouseId, request.itemId);

		const inventory = await this.inventoryRepository.save(
			this.inventoryRepository.create({
				warehouseId: request.warehouseId,
				itemId: request.itemId,
				quantityOnHand: request.quantityOnHand,
				reorderPoint: request.reorderPoint,
			}),
		);

		return this.findRowById(inventory.id);
	}

	async update(id: string, request: InventoryRequest): Promise<InventoryRow> {
		const inventory = await this.findEntityById(id);
		await this.assertWarehouseExists(request.warehouseId);
		await this.assertItemExists(request.itemId);
		await this.assertNotDuplicate(request.warehouseId, request.itemId, id);

		inventory.warehouseId = request.warehouseId;
		inventory.itemId = request.itemId;
		inventory.quantityOnHand = request.quantityOnHand;
		inventory.reorderPoint = request.reorderPoint;

		await this.inventoryRepository.save(inventory);
		return this.findRowById(id);
	}

	async remove(id: string): Promise<void> {
		await this.findEntityById(id);
		await this.inventoryRepository.delete(id);
	}

	private async buildStatusSql(): Promise<string> {
		const policy = await this.inventoryPoliciesService.get();
		return buildInventoryStatusSql(policy);
	}

	private applyStatusFilter(
		queryBuilder: ReturnType<Repository<Inventory>["createQueryBuilder"]>,
		status: string | undefined,
		statusSql: string,
	) {
		if (!status) {
			return;
		}

		const separatorIndex = status.indexOf(":");
		const operator = separatorIndex === -1 ? "eq" : status.slice(0, separatorIndex);
		const value = separatorIndex === -1 ? status : status.slice(separatorIndex + 1);

		if (operator !== "eq") {
			throw new BadRequestException(`Unsupported filter operator '${operator}'`);
		}

		queryBuilder.andWhere(`${statusSql} = :statusValue`, { statusValue: value });
	}

	private async findEntityById(id: string): Promise<Inventory> {
		const inventory = await this.inventoryRepository.findOneBy({ id });

		if (!inventory) {
			throw new NotFoundException(`Inventory row '${id}' not found`);
		}

		return inventory;
	}

	private async findRowById(id: string): Promise<InventoryRow> {
		const statusSql = await this.buildStatusSql();

		const row = await this.inventoryRepository
			.createQueryBuilder("inventory")
			.innerJoin("inventory.warehouse", "warehouse")
			.innerJoin("inventory.item", "item")
			.innerJoin("item.category", "category")
			.select(INVENTORY_SELECT)
			.addSelect(statusSql, "status")
			.where("inventory.id = :id", { id })
			.getRawOne();

		return mapInventoryRow(row);
	}

	private async assertWarehouseExists(warehouseId: string) {
		const warehouse = await this.warehouseRepository.findOneBy({ id: warehouseId });

		if (!warehouse) {
			throw new NotFoundException(`Warehouse '${warehouseId}' not found`);
		}
	}

	private async assertItemExists(itemId: string) {
		const item = await this.itemRepository.findOneBy({ id: itemId });

		if (!item) {
			throw new NotFoundException(`Item '${itemId}' not found`);
		}
	}

	private async assertNotDuplicate(warehouseId: string, itemId: string, currentId?: string) {
		const where = currentId ? { warehouseId, itemId, id: Not(currentId) } : { warehouseId, itemId };
		const existing = await this.inventoryRepository.findOneBy(where);

		if (existing) {
			throw new ConflictException("Inventory row already exists for this warehouse and item");
		}
	}
}
