import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';

export function createLLMClient({ model = 'generation', streaming = false, responseFormat = null }) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';

  const modelName = model === 'router'
    ? (process.env.LLM_ROUTER_MODEL || 'anthropic/claude-haiku-4-5')
    : (process.env.LLM_GENERATION_MODEL || 'anthropic/claude-sonnet-4-5');

  // Use ChatOpenAI interface when communicating with OpenRouter or OpenAI-compatible endpoint
  if (process.env.OPENROUTER_API_KEY || baseUrl.includes('openrouter.ai')) {
    const config = {
      modelName,
      openAIApiKey: apiKey,
      streaming,
      configuration: {
        baseURL: baseUrl,
      },
    };

    if (responseFormat === 'json_object') {
      config.modelKwargs = { response_format: { type: 'json_object' } };
    }

    return new ChatOpenAI(config);
  }

  // Fallback to direct Anthropic client
  return new ChatAnthropic({
    modelName: 'claude-3-5-sonnet-20241022',
    anthropicApiKey: apiKey,
    streaming,
  });
}
