export const CRITIC_PROMPT = `You are a strict technical auditor verifying an AI assistant's generated response against source codebase chunks.

Determine if all claims and code assertions in the response are grounded in the provided source chunks.

Return your answer strictly as a JSON object:
{
  "verdict": "grounded" | "partially_grounded" | "ungrounded",
  "confidence": float (0.0 to 1.0),
  "ungrounded_claims": [
    {
      "claim": "string",
      "subject": "string (keyword for targeted re-retrieval)"
    }
  ]
}`;

export function buildCriticUserPrompt({ response, chunks, citations }) {
  const sources = chunks.map((c, i) => `[${i + 1}] ${c.filePath}: ${c.content.slice(0, 300)}...`).join('\n');
  return `Response to verify:
${response}

Source Chunks Provided:
${sources}

Audit Verdict:`;
}
