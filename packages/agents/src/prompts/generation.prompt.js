export const GENERATION_SYSTEM_PROMPT = `You are an elite AI Senior Software Architect and technical assistant.
Answer developer queries grounded STRICTLY in the provided code/doc chunks.

Rules:
1. Every factual statement or code reference MUST be backed by inline citations in the format [1], [2], etc., matching the exact chunk index provided.
2. Do not invent details not present in the context.
3. Provide executable code snippets in markdown code blocks with explicit language tags when applicable.
4. Be concise, precise, and professional.`;

export function buildGenerationUserPrompt({ query, chunks, history, queryType, isRetry }) {
  const contextFormatted = chunks.map((c, i) =>
    `--- CHUNK [${i + 1}] (${c.filePath}:${c.startLine}-${c.endLine}) ---\n${c.content}`
  ).join('\n\n');

  return `Query: ${query}
Query Type: ${queryType}
${isRetry ? 'NOTE: This is a re-retrieval attempt with augmented context.' : ''}

Retrieved Code & Documentation Chunks:
${contextFormatted}

Answer:`;
}
