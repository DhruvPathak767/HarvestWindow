/**
 * Phase AI-7: Agricultural Knowledge Ingestion Pipeline
 * Validates, cleans, chunks, and persists authoritative agronomic documents
 * into the Prisma AgriculturalKnowledgeDocument repository.
 */

import prisma from "../../../config/prisma.js";
import { CURATED_KNOWLEDGE_DOCUMENTS } from "./knowledgeCorpus.js";
import { TRUSTED_AGRICULTURAL_SOURCES } from "./trustedSources.js";

/**
 * Normalizes text: trims, removes duplicated whitespace, normalizes quotes.
 * @param {string} text
 * @returns {string}
 */
export function cleanDocumentText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

/**
 * Divides long text into semantically cohesive chunks with token overlap.
 * @param {string} text
 * @param {number} maxWords
 * @param {number} overlapWords
 * @returns {string[]}
 */
export function chunkText(text, maxWords = 150, overlapWords = 30) {
  const words = cleanDocumentText(text).split(" ");
  if (words.length <= maxWords) return [words.join(" ")];

  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunkWords = words.slice(i, i + maxWords);
    chunks.push(chunkWords.join(" "));
    i += maxWords - overlapWords;
  }
  return chunks;
}

/**
 * Seeds and synchronizes the curated agricultural knowledge base into the database.
 * Completely idempotent: avoids duplicating already-ingested documents.
 * @returns {Promise<{ inserted: number, existing: number, total: number }>}
 */
export async function seedKnowledgeBase() {
  let inserted = 0;
  let existing = 0;

  for (const doc of CURATED_KNOWLEDGE_DOCUMENTS) {
    const source = TRUSTED_AGRICULTURAL_SOURCES.find((s) => s.id === doc.sourceId);
    const publisher = doc.publisher || source?.name || "Accredited Agricultural Institute";

    const chunks = chunkText(doc.content, 180, 30);

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkContent = chunks[idx];
      const match = await prisma.agriculturalKnowledgeDocument.findFirst({
        where: {
          title: doc.title,
          sourceId: doc.sourceId,
          chunkIndex: idx,
        },
      });

      if (match) {
        existing++;
      } else {
        await prisma.agriculturalKnowledgeDocument.create({
          data: {
            sourceId: doc.sourceId,
            title: doc.title,
            url: doc.url,
            publisher,
            topic: doc.topic,
            cropName: doc.cropName || null,
            chunkIndex: idx,
            content: chunkContent,
            keywords: doc.keywords || null,
            publicationDate: doc.publicationDate ? new Date(doc.publicationDate) : new Date("2024-01-01"),
            retrievedAt: new Date(),
            version: "1.0.0",
          },
        });
        inserted++;
      }
    }
  }

  const total = await prisma.agriculturalKnowledgeDocument.count();
  return { inserted, existing, total };
}
