import { API_CONFIG, getAuthToken } from "./index";
import type {
  AssistantStatus,
  AssistantConversation,
  SendMessagePayload,
  SendMessageResponse,
} from "@/types/assistant";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const base = API_CONFIG.baseUrl.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${base}${path}`;

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const assistantClient = {
  async getStatus(): Promise<AssistantStatus> {
    const res = await request<{ success: boolean; data: AssistantStatus }>("/ai/assistant/status");
    return res.data;
  },

  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    const res = await request<{ success: boolean; data: SendMessageResponse }>("/ai/assistant/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async listConversations(params: { page?: number; limit?: number } = {}): Promise<AssistantConversation[]> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const qs = query.toString();
    const endpoint = `/ai/assistant/conversations${qs ? `?${qs}` : ""}`;
    const res = await request<{ success: boolean; data: AssistantConversation[] }>(endpoint);
    return res.data || [];
  },

  async getConversation(conversationId: string): Promise<AssistantConversation> {
    const res = await request<{ success: boolean; data: AssistantConversation }>(
      `/ai/assistant/conversations/${conversationId}`
    );
    return res.data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await request(`/ai/assistant/conversations/${conversationId}`, {
      method: "DELETE",
    });
  },
};
