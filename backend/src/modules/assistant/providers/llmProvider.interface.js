/**
 * Phase AI-7: LLM Provider Abstraction Layer
 * Pluggable provider system supporting:
 * - Local Agronomic Synthesis Engine (zero-cost, offline-friendly, high accuracy)
 * - Hosted API (Gemini, OpenAI, or compatible endpoints when keys are configured)
 * - Local Ollama server (when OLLAMA_BASE_URL is configured)
 */

import { LocalAgronomicEngine } from "./localAgronomicEngine.js";

export class LLMProviderManager {
  /**
   * Determines active provider and generates grounded assistant response.
   *
   * @param {Object} params
   * @param {string} params.query
   * @param {Array<Object>} [params.conversationHistory=[]]
   * @param {Object} [params.farmContext={}]
   * @param {Array<Object>} [params.knowledgeCitations=[]]
   * @param {string} [params.language="en"]
   * @returns {Promise<{ answer: string, providerUsed: string }>}
   */
  static async generateResponse({
    query,
    conversationHistory = [],
    farmContext = {},
    knowledgeCitations = [],
    language = "en",
  }) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const ollamaUrl = process.env.OLLAMA_BASE_URL;

    // 1. Try Hosted Gemini if configured
    if (geminiKey) {
      try {
        const answer = await this.queryGemini({
          geminiKey,
          query,
          conversationHistory,
          farmContext,
          knowledgeCitations,
          language,
        });
        if (answer) {
          return { answer, providerUsed: "google-gemini" };
        }
      } catch (err) {
        console.warn("[LLMProvider] Gemini call failed, falling back to LocalAgronomicEngine:", err?.message);
      }
    }

    // 2. Try Hosted OpenAI if configured
    if (openaiKey) {
      try {
        const answer = await this.queryOpenAI({
          openaiKey,
          query,
          conversationHistory,
          farmContext,
          knowledgeCitations,
          language,
        });
        if (answer) {
          return { answer, providerUsed: "openai" };
        }
      } catch (err) {
        console.warn("[LLMProvider] OpenAI call failed, falling back to LocalAgronomicEngine:", err?.message);
      }
    }

    // 3. Try Local Ollama if configured
    if (ollamaUrl) {
      try {
        const answer = await this.queryOllama({
          ollamaUrl,
          query,
          conversationHistory,
          farmContext,
          knowledgeCitations,
          language,
        });
        if (answer) {
          return { answer, providerUsed: "ollama-local" };
        }
      } catch (err) {
        console.warn("[LLMProvider] Ollama call failed, falling back to LocalAgronomicEngine:", err?.message);
      }
    }

    // 4. Default Zero-Cost Built-In High Accuracy Engine
    const synthesized = LocalAgronomicEngine.synthesizeResponse({
      query,
      farmContext,
      knowledgeCitations,
      language,
    });

    return {
      answer: synthesized,
      providerUsed: "local-agronomic-engine",
    };
  }

  /**
   * Safe, bounded call to Gemini REST API.
   */
  static async queryGemini({ geminiKey, query, farmContext, knowledgeCitations, language }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

    const systemContext =
      "You are HarvestWindow's official Agricultural AI Assistant. " +
      "Explain harvest predictions, weather risks, yield forecasts, and crop disease findings. " +
      "Always ground your response strictly in the authorized farm facts and verified agricultural citations provided below. " +
      "Never invent citations or farm measurements. If data is unavailable, state so clearly.\n\n" +
      `AUTHORIZED FARM CONTEXT:\n${JSON.stringify(farmContext, null, 2)}\n\n` +
      `VERIFIED RETRIEVED KNOWLEDGE CITATIONS:\n${JSON.stringify(knowledgeCitations, null, 2)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemContext}\n\nFARMER QUERY: ${query}\n(Respond in ${language})` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 600,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      if (!resp.ok) return null;
      const data = await resp.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  /**
   * Safe, bounded call to OpenAI REST API.
   */
  static async queryOpenAI({ openaiKey, query, farmContext, knowledgeCitations, language }) {
    const url = "https://api.openai.com/v1/chat/completions";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are HarvestWindow's Agricultural AI Assistant. Ground all answers in the provided farm data and citations.\n" +
                `Context:\n${JSON.stringify({ farmContext, knowledgeCitations })}`,
            },
            { role: "user", content: query },
          ],
          max_tokens: 500,
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      if (!resp.ok) return null;
      const data = await resp.json();
      return data?.choices?.[0]?.message?.content || null;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  /**
   * Safe call to Local Ollama.
   */
  static async queryOllama({ ollamaUrl, query, farmContext, knowledgeCitations, language }) {
    const endpoint = `${ollamaUrl.replace(/\/$/, "")}/api/generate`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || "llama3",
          prompt: `Context: ${JSON.stringify({ farmContext, knowledgeCitations })}\n\nQuestion: ${query}`,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      if (!resp.ok) return null;
      const data = await resp.json();
      return data?.response || null;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }
}
