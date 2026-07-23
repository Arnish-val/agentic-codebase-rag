import { createLLMClient } from '../utils/llmClient.js';
import { CLARIFICATION_PROMPT } from '../prompts/clarification.prompt.js';

export async function clarificationNode(state) {
  const { query, streamCallback } = state;
  const llm = createLLMClient({ model: 'router' });

  const res = await llm.invoke([
    { role: 'system', content: CLARIFICATION_PROMPT },
    { role: 'user', content: query },
  ]);

  const message = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);

  streamCallback?.('chunk', { token: message, index: 0 });
  streamCallback?.('done', {});

  return {
    response: message,
    done: true,
    currentNode: 'clarification',
  };
}
