import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateEmbedding(
  text: string,
  geminiApiKey: string,
): Promise<number[]> {
  const model = new GoogleGenerativeAI(geminiApiKey).getGenerativeModel({
    model: "text-embedding-004",
  });

  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function generateEmbeddings(
  texts: string[],
  geminiApiKey: string,
): Promise<number[][]> {
  const model = new GoogleGenerativeAI(geminiApiKey).getGenerativeModel({
    model: "text-embedding-004",
  });

  const results = await Promise.all(
    texts.map(text => model.embedContent(text))
  );

  return results.map(result => result.embedding.values);
}

// Cosine similarity for comparing embeddings
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Find the most similar intent from a list
export async function findMostSimilarIntent(
  query: string,
  intents: Array<{ name: string; description: string; embedding?: number[] }>,
  geminiApiKey: string,
): Promise<{ intent: string; similarity: number }> {
  const queryEmbedding = await generateEmbedding(query, geminiApiKey);

  let bestMatch = { intent: "", similarity: -1 };

  for (const intent of intents) {
    const intentEmbedding =
      intent.embedding ||
      (await generateEmbedding(intent.description, geminiApiKey));
    const similarity = cosineSimilarity(queryEmbedding, intentEmbedding);

    if (similarity > bestMatch.similarity) {
      bestMatch = { intent: intent.name, similarity };
    }
  }

  return bestMatch;
}
