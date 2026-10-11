/**
 * Phase AI-7: Agricultural AI Assistant Types
 */

export interface Citation {
  title: string;
  url: string;
  sourceUrl?: string;
  publisher: string;
  snippet?: string;
  contentSnippet?: string;
  topic?: string;
  cropName?: string | null;
  publicationDate?: string | null;
  retrievedAt?: string;
  score?: number;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Citation[];
  farmContextUsed?: boolean;
  createdAt: string;
}

export interface AssistantConversation {
  id: string;
  title: string;
  farmId?: string | null;
  farm?: {
    id: string;
    name: string;
    district?: string;
    state?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  messages?: AssistantMessage[];
}

export interface AssistantStatus {
  status: string;
  service: string;
  version: string;
  activeProvider: string;
  zeroCostMode: boolean;
  knowledgeDocumentsCount: number;
  trustedSources: string[];
  supportedTools: string[];
  supportedLanguages: string[];
  capabilities: string[];
}

export interface SendMessagePayload {
  message: string;
  conversationId?: string | null;
  farmId?: string | null;
  language?: string;
}

export interface SendMessageResponse {
  conversationId: string;
  messageId: string;
  answer: string;
  sources: Citation[];
  farmContextUsed: boolean;
  relatedEntities: Array<{ type: string; id: string; name: string }>;
  warnings: string[];
  generatedAt: string;
}
