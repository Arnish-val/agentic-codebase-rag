import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * Cross-Encoder Reranker Tool — calls TEI reranker service to re-score candidates.
 */
export async function rerank(query, chunks, topK = 10) {
  if (!chunks || chunks.length === 0) return [];

  const rerankerUrl = process.env.RERANKER_SERVICE_URL || 'http://localhost:8081';

  try {
    const texts = chunks.map(c => c.content);
    const response = await axios.post(`${rerankerUrl}/rerank`, {
      query,
      texts,
      truncate: true,
    }, { timeout: 5000 });

    const rankResults = response.data; // [{ index: 0, score: 0.95 }, ...]

    const rescored = rankResults.map(r => ({
      ...chunks[r.index],
      rerankScore: r.score,
    }));

    return rescored.sort((a, b) => b.rerankScore - a.rerankScore).slice(0, topK);
  } catch (err) {
    logger.warn({ err: err.message }, 'Cross-encoder reranker service unavailable, returning RRF sorted chunks');
    return chunks.slice(0, topK);
  }
}
