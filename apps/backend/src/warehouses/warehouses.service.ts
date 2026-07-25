import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { FilterQueryBuilder } from "../common/query/filter-query-builder";
import { Inventory } from "../inventory/inventory.entity";
import type { WarehouseRequest } from "./dto/warehouse.request";
import { WAREHOUSE_SORT_FIELDS, type WarehouseFilterRequest } from "./dto/warehouse-filter.request";
import { Warehouse } from "./warehouse.entity";

@Injectable()
export class WarehousesService {
	constructor(
		@InjectRepository(Warehouse) private readonly warehouseRepository: Repository<Warehouse>,
		@InjectRepository(Inventory) private readonly inventoryRepository: Repository<Inventory>,
	) {}

	findAll(filter: WarehouseFilterRequest): Promise<{ data: Warehouse[]; total: number }> {
		const queryBuilder = this.warehouseRepository.createQueryBuilder("warehouse");

		return new FilterQueryBuilder(queryBuilder)
			.applyFilter(filter)
			.getPaginated(filter, WAREHOUSE_SORT_FIELDS, "createdAt");
	}

	async findById(id: string): Promise<Warehouse> {
		const warehouse = await this.warehouseRepository.findOneBy({ id });

		if (!warehouse) {
			throw new NotFoundException(`Warehouse '${id}' not found`);
		}

		return warehouse;
	}

	async create(request: WarehouseRequest): Promise<Warehouse> {
		const code = normalizeCode(request.code);
		await this.assertCodeAvailable(code);

		return this.warehouseRepository.save(
			this.warehouseRepository.create({
				code,
				name: request.name.trim(),
				city: request.city.trim(),
				status: request.status,
			}),
		);
	}

	async update(id: string, request: WarehouseRequest): Promise<Warehouse> {
		const warehouse = await this.findById(id);
		const code = normalizeCode(request.code);
		await this.assertCodeAvailable(code, id);

		warehouse.code = code;
		warehouse.name = request.name.trim();
		warehouse.city = request.city.trim();
		warehouse.status = request.status;

		return this.warehouseRepository.save(warehouse);
	}

	async remove(id: string): Promise<void> {
		await this.findById(id);

		const inventoryCount = await this.inventoryRepository.countBy({ warehouseId: id });
		if (inventoryCount > 0) {
			throw new ConflictException("Warehouse cannot be deleted while inventory exists");
		}

		await this.warehouseRepository.delete(id);
	}

	private async assertCodeAvailable(code: string, currentId?: string) {
		const where = currentId ? { code, id: Not(currentId) } : { code };
		const existingWarehouse = await this.warehouseRepository.findOneBy(where);

		if (existingWarehouse) {
			throw new ConflictException(`Warehouse code '${code}' is already in use`);
		}
	}
}

function normalizeCode(code: string) {
	return code.trim().toUpperCase();
}
