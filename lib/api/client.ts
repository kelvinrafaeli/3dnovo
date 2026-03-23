// Use backend directly to avoid Next.js rewrite proxy timeout on long requests
const API_BASE =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : "http://localhost:3001/api";

interface ApiError {
  status: number;
  message: string;
  retryAfter?: number;
}

export class ApiRequestError extends Error {
  status: number;
  retryAfter?: number;

  constructor({ status, message, retryAfter }: ApiError) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.retryAfter = retryAfter;
  }

  get isQuotaExceeded() {
    return this.status === 429;
  }

  get isServerError() {
    return this.status >= 500;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    timeout?: number;
  } = {}
): Promise<T> {
  const { method = "POST", body, timeout = 300000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      let message = `Erro ${res.status}`;
      let retryAfter: number | undefined;

      try {
        const errData = await res.json();
        message = errData.error || errData.message || message;
        retryAfter = errData.retryAfterSeconds;
      } catch {
        // ignore JSON parse error
      }

      throw new ApiRequestError({ status: res.status, message, retryAfter });
    }

    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof ApiRequestError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiRequestError({
        status: 408,
        message: "Requisicao expirou. Tente novamente.",
      });
    }
    throw new ApiRequestError({
      status: 0,
      message: "Erro de conexao. Verifique se o servidor esta rodando.",
    });
  } finally {
    clearTimeout(timer);
  }
}
