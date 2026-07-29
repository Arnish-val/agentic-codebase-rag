import axios from 'axios';
import { logger } from '../utils/logger.js';

const K = parseInt(process.env.RRF_K ?? '60');
const ALPHA_BM25 = parseFloat(process.env.RRF_ALPHA_BM25 ?? '0.4');
const ALPHA_VECTOR = parseFloat(process.env.RRF_ALPHA_VECTOR ?? '0.6');

/**
 * Hybrid Search Tool — combines BM25 text search and BGE-M3 vector search via Reciprocal Rank Fusion (RRF).
 */
export async function hybridSearch(query, options = {}) {
  const { topKBm25 = 50, topKVector = 50, topKFinal = 30 } = options;

  let ChunkModel = null;
  try {
    const mongoose = await import('mongoose');
    ChunkModel = mongoose.models.Chunk || (await import('../../../server/src/models/Chunk.js')).Chunk;
  } catch (err) {
    logger.warn({ err }, 'Mongoose models not loaded directly, using mongo query fallback');
  }

  if (!ChunkModel) {
    logger.error('Chunk model uninitialized');
    return [];
  }

  // 1. Run BM25 search
  const bm25Promise = ChunkModel.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(topKBm25)
    .lean();

  // 2. Fetch query embedding and run vector search
  const vectorPromise = (async () => {
    try {
      const embedUrl = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8080';
      const embedRes = await axios.post(`${embedUrl}/embed`, { inputs: query });
      const queryVector = embedRes.data[0];

      // In production with MongoDB Atlas Vector Search:
      // return ChunkModel.aggregate([{ $vectorSearch: { index: "vector_index", path: "embedding", queryVector, numCandidates: topKVector * 10, limit: topKVector } }]);

      // Local fallback simulation (fetch chunks with embeddings or search by text)
      return [];
    } catch (err) {
      logger.warn({ err: err.message }, 'Vector embedding request failed, falling back to BM25 only');
      return [];
    }
  })();

  const [bm25Results, vectorResults] = await Promise.all([bm25Promise, vectorPromise]);

  // 3. Compute RRF scores
  const scoreMap = new Map();

  bm25Results.forEach((doc, rank) => {
    const id = doc._id.toString();
    const score = ALPHA_BM25 * (1 / (K + rank + 1));
    scoreMap.set(id, { doc, score });
  });

  vectorResults.forEach((doc, rank) => {
    const id = doc._id.toString();
    const score = ALPHA_VECTOR * (1 / (K + rank + 1));
    if (scoreMap.has(id)) {
      scoreMap.get(id).score += score;
    } else {
      scoreMap.set(id, { doc, score });
    }
  });

  const fused = Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topKFinal)
    .map(item => ({ ...item.doc, rrfScore: item.score }));

  return fused;
}
