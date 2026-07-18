import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { OPENAI_EMBEDDING_MODEL } from "@/features/ai/constants";


/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string,
  openAiApiKey: string,
): Promise<number[]> {
  const openai = createOpenAI({ apiKey: openAiApiKey });
  const { embedding } = await embed({
    model: openai.embedding(OPENAI_EMBEDDING_MODEL),
    value: text,
  });

  return embedding;
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(
  texts: string[],
  openAiApiKey: string,
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const openai = createOpenAI({ apiKey: openAiApiKey });
  const { embeddings } = await embedMany({
    model: openai.embedding(OPENAI_EMBEDDING_MODEL),
    values: texts,
  });

  return embeddings;
}

/**
 * Convert a CRM entity to text for embedding
 */
export function entityToText(
  entityType: string,
  fields: Record<string, unknown>
): string {
  const parts: string[] = [`${entityType}:`];

  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined && value !== "") {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          parts.push(`${key}: ${value.join(", ")}`);
        }
      } else if (typeof value === "object") {
        parts.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        parts.push(`${key}: ${value}`);
      }
    }
  }

  return parts.join("\n");
}
