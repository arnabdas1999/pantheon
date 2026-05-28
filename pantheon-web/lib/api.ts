import type { CreateTeardownResponse, Teardown, TeardownSummary } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function createTeardown(
  idea: string,
  userId?: string,
  groqApiKey?: string,
): Promise<CreateTeardownResponse> {
  return apiFetch<CreateTeardownResponse>("/api/teardowns", {
    method: "POST",
    body: JSON.stringify({ idea, user_id: userId ?? null, groq_api_key: groqApiKey ?? null }),
  });
}

export async function getTeardown(slug: string): Promise<Teardown> {
  return apiFetch<Teardown>(`/api/teardowns/${slug}`);
}

export async function listTeardowns(limit = 20, offset = 0): Promise<TeardownSummary[]> {
  return apiFetch<TeardownSummary[]>(`/api/teardowns?limit=${limit}&offset=${offset}`);
}

export async function getUserTeardowns(userId: string): Promise<TeardownSummary[]> {
  return apiFetch<TeardownSummary[]>("/api/users/teardowns", {
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
  });
}
