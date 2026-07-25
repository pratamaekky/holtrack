export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
	}
}

class ApiService {
	private baseUrl = "/api";

	async get<T>(path: string): Promise<T> {
		return this.request<T>(path);
	}

	async post<T>(path: string, body: unknown): Promise<T> {
		return this.request<T>(path, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	}

	async patch<T>(path: string, body: unknown): Promise<T> {
		return this.request<T>(path, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	}

	async put<T>(path: string, body: unknown): Promise<T> {
		return this.request<T>(path, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	}

	async delete<T>(path: string): Promise<T> {
		return this.request<T>(path, { method: "DELETE" });
	}

	private async request<T>(path: string, init?: RequestInit): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, init);

		if (!response.ok) {
			const message = await readErrorMessage(response);
			throw new ApiError(message, response.status);
		}

		return response.json() as Promise<T>;
	}
}

export const apiService = new ApiService();

async function readErrorMessage(response: Response) {
	try {
		const body = await response.json();
		const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;

		return message ?? "Request failed";
	} catch {
		return "Request failed";
	}
}
