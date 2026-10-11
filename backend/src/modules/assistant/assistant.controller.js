import {
  chatMessageSchema,
  conversationIdParamSchema,
  listConversationsQuerySchema,
} from "./assistant.validation.js";
import { AssistantService } from "./assistant.service.js";
import { seedKnowledgeBase } from "./knowledge/ingestionPipeline.js";

/**
 * POST /api/v1/ai/assistant/chat
 * POST /api/ai/assistant/chat
 *
 * Process user question with context retrieval, server-controlled tools, RAG & citations.
 */
export async function handleChatMessage(req, res, next) {
  try {
    const validatedBody = chatMessageSchema.parse(req.body);
    const userId = req.user.id;

    const result = await AssistantService.sendMessage({
      userId,
      message: validatedBody.message,
      conversationId: validatedBody.conversationId,
      farmId: validatedBody.farmId,
      language: validatedBody.language,
    });

    return res.status(200).json({
      success: true,
      message: "Assistant response generated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/ai/assistant/conversations
 * GET /api/ai/assistant/conversations
 *
 * List user's conversations with pagination.
 */
export async function handleListConversations(req, res, next) {
  try {
    const validatedQuery = listConversationsQuerySchema.parse(req.query);
    const userId = req.user.id;

    const result = await AssistantService.listConversations({
      userId,
      page: validatedQuery.page,
      limit: validatedQuery.limit,
    });

    return res.status(200).json({
      success: true,
      message: "Conversations retrieved successfully",
      data: result.items,
      pagination: result.pagination,
      items: result.items,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/ai/assistant/conversations/:conversationId
 * GET /api/ai/assistant/conversations/:conversationId
 *
 * Get single conversation with full message history and citations.
 */
export async function handleGetConversation(req, res, next) {
  try {
    const { conversationId } = conversationIdParamSchema.parse(req.params);
    const userId = req.user.id;

    const result = await AssistantService.getConversation({
      userId,
      conversationId,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/ai/assistant/conversations/:conversationId
 * DELETE /api/ai/assistant/conversations/:conversationId
 *
 * Delete a user's conversation.
 */
export async function handleDeleteConversation(req, res, next) {
  try {
    const { conversationId } = conversationIdParamSchema.parse(req.params);
    const userId = req.user.id;

    const result = await AssistantService.deleteConversation({
      userId,
      conversationId,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/ai/assistant/status
 * GET /api/ai/assistant/status
 *
 * Return assistant readiness, provider configuration, supported languages, tools.
 */
export async function handleGetAssistantStatus(req, res, next) {
  try {
    const status = await AssistantService.getStatus();

    return res.status(200).json({
      success: true,
      message: "Assistant status retrieved successfully",
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/ai/assistant/knowledge/seed
 * POST /api/ai/assistant/knowledge/seed
 *
 * Ingest / refresh trusted agronomic knowledge base.
 */
export async function handleSeedKnowledge(req, res, next) {
  try {
    const summary = await seedKnowledgeBase();

    return res.status(200).json({
      success: true,
      message: "Knowledge base seeded successfully",
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}
