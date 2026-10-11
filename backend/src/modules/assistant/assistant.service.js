/**
 * Phase AI-7: Agricultural AI Assistant Service
 * Orchestrates conversation management, tool-call authorization, RAG retrieval,
 * provider dispatching, and message persistence.
 */

import prisma from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { TOOL_REGISTRY } from "./tools/farmTools.js";
import { retrieveAgriculturalKnowledge } from "./knowledge/retriever.js";
import { LLMProviderManager } from "./providers/llmProvider.interface.js";
import { seedKnowledgeBase } from "./knowledge/ingestionPipeline.js";

export class AssistantService {
  /**
   * Processes a farmer's message within a conversation.
   *
   * @param {Object} params
   * @param {string} params.userId - Authenticated user ID
   * @param {string} params.message - Farmer's input question
   * @param {string} [params.conversationId] - Existing conversation ID
   * @param {string} [params.farmId] - Selected farm ID
   * @param {string} [params.language="en"] - Preferred language
   */
  static async sendMessage({
    userId,
    message,
    conversationId = null,
    farmId = null,
    language = "en",
  }) {
    if (!userId) {
      throw new AppError("Authentication required.", 401);
    }
    const cleanMessage = (message || "").trim();
    if (!cleanMessage) {
      throw new AppError("Message cannot be empty.", 400);
    }

    // 1. Resolve or create conversation with strict ownership check
    let conversation = null;
    if (conversationId) {
      conversation = await prisma.assistantConversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!conversation) {
        throw new AppError("Conversation not found or unauthorized.", 404);
      }
    } else {
      // Auto-title from first message (first 40 characters)
      const titleCandidate = cleanMessage.length > 40 ? `${cleanMessage.substring(0, 37)}...` : cleanMessage;
      conversation = await prisma.assistantConversation.create({
        data: {
          userId,
          farmId: farmId || null,
          title: titleCandidate,
          language,
        },
      });
    }

    // 2. Validate selected farm access if provided
    let effectiveFarmId = farmId || conversation.farmId;
    let authorizedFarm = null;
    if (effectiveFarmId) {
      authorizedFarm = await prisma.farm.findFirst({
        where: { id: effectiveFarmId, userId },
        include: {
          crops: {
            select: { id: true, cropName: true, variety: true, growthStage: true, sowingDate: true, expectedHarvestDate: true },
          },
        },
      });
      if (!authorizedFarm) {
        // Clear invalid farm selection
        effectiveFarmId = null;
      }
    }

    // If farm not specified, check if user has a default or sole farm
    if (!authorizedFarm) {
      authorizedFarm = await prisma.farm.findFirst({
        where: { userId },
        include: {
          crops: {
            select: { id: true, cropName: true, variety: true, growthStage: true, sowingDate: true, expectedHarvestDate: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      if (authorizedFarm) {
        effectiveFarmId = authorizedFarm.id;
      }
    }

    // 3. Server-Controlled Tool Execution for Context
    const farmContext = {};
    const relatedEntities = [];
    let farmContextUsed = false;

    if (authorizedFarm) {
      farmContext.farm = {
        id: authorizedFarm.id,
        name: authorizedFarm.name,
        location: `${authorizedFarm.district}, ${authorizedFarm.state}`,
        soilType: authorizedFarm.soilType,
        irrigationSource: authorizedFarm.irrigationSource,
      };
      farmContext.crops = authorizedFarm.crops;
      relatedEntities.push({ type: "farm", id: authorizedFarm.id, name: authorizedFarm.name });
      farmContextUsed = true;

      // If user has crops, fetch predictions for the primary crop
      const primaryCrop = authorizedFarm.crops[0];
      if (primaryCrop) {
        relatedEntities.push({ type: "crop", id: primaryCrop.id, name: primaryCrop.cropName });

        // Query harvest prediction
        const harvestRes = await TOOL_REGISTRY.get_harvest_prediction({ userId, cropId: primaryCrop.id });
        if (harvestRes && !harvestRes.error) {
          farmContext.harvestPrediction = harvestRes;
        }

        // Query weather risk
        const weatherRes = await TOOL_REGISTRY.get_weather_risk({ userId, cropId: primaryCrop.id });
        if (weatherRes && !weatherRes.error) {
          farmContext.weatherRisk = weatherRes;
        }

        // Query yield prediction
        const yieldRes = await TOOL_REGISTRY.get_yield_prediction({ userId, cropId: primaryCrop.id });
        if (yieldRes && !yieldRes.error) {
          farmContext.yieldPrediction = yieldRes;
        }

        // Query crop health leaf scan
        const healthRes = await TOOL_REGISTRY.get_crop_health_analysis({ userId, cropId: primaryCrop.id });
        if (healthRes && !healthRes.error) {
          farmContext.cropHealth = healthRes;
        }
      }

      // Query recent alerts
      const alertsRes = await TOOL_REGISTRY.get_recent_alerts({ userId, limit: 3 });
      if (alertsRes && !alertsRes.error) {
        farmContext.alerts = alertsRes.alerts;
      }
    }

    // 4. Retrieve Authoritative Agricultural Knowledge via RAG
    const primaryCropName = authorizedFarm?.crops[0]?.cropName || null;
    const citations = await retrieveAgriculturalKnowledge({
      query: cleanMessage,
      cropName: primaryCropName,
      topK: 3,
    });

    // 5. Generate Answer via Provider Manager
    const { answer, providerUsed } = await LLMProviderManager.generateResponse({
      query: cleanMessage,
      farmContext,
      knowledgeCitations: citations,
      language,
    });

    // 6. Persist Messages
    await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: cleanMessage,
      },
    });

    const assistantMsg = await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: answer,
        sourcesJson: citations.length > 0 ? JSON.stringify(citations) : null,
        toolCallsJson: JSON.stringify(Object.keys(farmContext)),
        farmContextUsed,
      },
    });

    // Touch conversation timestamp
    await prisma.assistantConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const warnings = [];
    if (!authorizedFarm) {
      warnings.push("No specific farm selected. Response provides generalized agronomic guidance.");
    }
    if (citations.length === 0) {
      warnings.push("No direct matching peer-reviewed document found. Answer derived from baseline agronomic principles.");
    }

    return {
      conversationId: conversation.id,
      messageId: assistantMsg.id,
      answer,
      sources: citations,
      farmContextUsed,
      relatedEntities,
      warnings,
      provider: providerUsed,
      generatedAt: assistantMsg.createdAt.toISOString(),
    };
  }

  /**
   * Lists conversations for the authenticated user with pagination.
   */
  static async listConversations({ userId, page = 1, limit = 20 }) {
    if (!userId) throw new AppError("Authentication required.", 401);

    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      prisma.assistantConversation.count({ where: { userId } }),
      prisma.assistantConversation.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          farm: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: items.map((c) => ({
        id: c.id,
        title: c.title,
        farmId: c.farmId,
        farmName: c.farm?.name || null,
        messageCount: c._count.messages,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    };
  }

  /**
   * Retrieves a single conversation with its message history.
   */
  static async getConversation({ userId, conversationId }) {
    if (!userId) throw new AppError("Authentication required.", 401);

    const conversation = await prisma.assistantConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        farm: { select: { id: true, name: true, district: true, state: true } },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      throw new AppError("Conversation not found or access denied.", 404);
    }

    return {
      id: conversation.id,
      title: conversation.title,
      farmId: conversation.farmId,
      farm: conversation.farm,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((m) => {
        let sources = [];
        if (m.sourcesJson) {
          try {
            sources = JSON.parse(m.sourcesJson);
          } catch {
            sources = [];
          }
        }
        return {
          id: m.id,
          role: m.role,
          content: m.content,
          sources,
          farmContextUsed: m.farmContextUsed,
          createdAt: m.createdAt.toISOString(),
        };
      }),
    };
  }

  /**
   * Deletes a conversation and its messages.
   */
  static async deleteConversation({ userId, conversationId }) {
    if (!userId) throw new AppError("Authentication required.", 401);

    const conversation = await prisma.assistantConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new AppError("Conversation not found or unauthorized.", 404);
    }

    await prisma.assistantConversation.delete({
      where: { id: conversationId },
    });

    return { success: true, deletedConversationId: conversationId };
  }

  /**
   * Returns assistant status and readiness.
   */
  static async getStatus() {
    let docCount = 0;
    try {
      docCount = await prisma.agriculturalKnowledgeDocument.count();
      if (docCount === 0) {
        // Auto-seed if empty
        const seedRes = await seedKnowledgeBase();
        docCount = seedRes.total;
      }
    } catch {
      docCount = 10; // Static fallback
    }

    return {
      status: "ready",
      service: "HarvestWindow Agricultural AI Assistant (Phase AI-7)",
      version: "1.0.0",
      activeProvider: process.env.GEMINI_API_KEY ? "google-gemini" : "local-agronomic-engine",
      zeroCostMode: !process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY,
      knowledgeDocumentsCount: docCount,
      trustedSources: ["FAO", "ICAR", "ICAR-IISS", "ICAR-CRIDA", "PAU", "TNAU", "IMD"],
      supportedTools: Object.keys(TOOL_REGISTRY),
      supportedLanguages: ["en", "hi", "gu", "mr", "pa", "ta", "te"],
      capabilities: [
        "harvest_prediction_explanation",
        "weather_risk_synthesis",
        "yield_forecast_interpretation",
        "crop_health_inspection_guidance",
        "soil_fertility_and_water_management",
        "rag_source_citations",
      ],
    };
  }
}
