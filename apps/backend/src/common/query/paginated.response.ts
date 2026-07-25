export class PaginatedResponse<T> {
	data!: T[];
	page!: number;
	limit!: number;
	total!: number;
	totalPages!: number;

	static from<T>(data: T[], page: number, limit: number, total: number): PaginatedResponse<T> {
		const response = new PaginatedResponse<T>();
		response.data = data;
		response.page = page;
		response.limit = limit;
		response.total = total;
		response.totalPages = Math.max(1, Math.ceil(total / limit));
		return response;
	}
}
