import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  handleChatMessage,
  handleListConversations,
  handleGetConversation,
  handleDeleteConversation,
  handleGetAssistantStatus,
  handleSeedKnowledge,
} from "./assistant.controller.js";

const router = Router();

// Public / operational status check
router.get("/status", handleGetAssistantStatus);

// Authenticated conversational routes
router.use(authenticate);

router.post("/chat", handleChatMessage);
router.get("/conversations", handleListConversations);
router.get("/conversations/:conversationId", handleGetConversation);
router.delete("/conversations/:conversationId", handleDeleteConversation);
router.post("/knowledge/seed", handleSeedKnowledge);

export default router;
