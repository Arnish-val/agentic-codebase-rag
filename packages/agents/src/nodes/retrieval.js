import { hybridSearch } from '../tools/hybridSearch.js';
import { rerank } from '../tools/reranker.js';
import { logger } from '../utils/logger.js';

const TOP_K_BM25 = parseInt(process.env.RETRIEVAL_TOP_K_BM25 ?? '50');
const TOP_K_VECTOR = parseInt(process.env.RETRIEVAL_TOP_K_VECTOR ?? '50');
const TOP_K_RERANK = parseInt(process.env.RETRIEVAL_TOP_K_RERANK ?? '10');

/**
 * RetrievalAgent node — hybrid BM25+vector search → RRF → cross-encoder rerank.
 *
 * Handles both single queries (factual/codegen/comparison) and
 * multi-hop sub-queries (runs each sub-query and merges results).
 */
export async function retrievalNode(state) {
  const start = Date.now();
  const {
    reformulatedQuery, queryType, subQueries, reRetrievalCount,
    ungroundedClaims, sessionId, options,
  } = state;
  const log = logger.child({ node: 'retrieval', sessionId });

  state.streamCallback?.('status', { step: 'retrieving', message: 'Searching indexed repositories…' });

  try {
    const maxChunks = options?.maxChunks ?? TOP_K_RERANK;

    let allChunks = [];

    // For multi-hop: retrieve per sub-query and merge
    const queries = queryType === 'multi_hop' && subQueries?.length > 0
      ? subQueries
      : [reformulatedQuery];

    // On re-retrieval, augment query with ungrounded claim keywords
    const augmentedQueries = reRetrievalCount > 0 && ungroundedClaims?.length > 0
      ? queries.map(q => `${q} ${ungroundedClaims.map(c => c.subject).join(' ')}`)
      : queries;

    for (const q of augmentedQueries) {
      const results = await hybridSearch(q, {
        topKBm25: TOP_K_BM25,
        topKVector: TOP_K_VECTOR,
        topKFinal: maxChunks * 3, // Over-retrieve before reranking
      });
      allChunks.push(...results);
    }

    // Deduplicate by chunk ID
    const seen = new Set();
    const deduped = allChunks.filter(c => {
      const key = c._id.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Cross-encoder reranking
    const query = augmentedQueries[0];
    let reranked = deduped;
    if (deduped.length > 0) {
      try {
        reranked = await rerank(query, deduped, maxChunks);
      } catch (err) {
        log.warn({ err }, 'Reranker failed, using RRF-only results');
        reranked = deduped.slice(0, maxChunks);
      }
    }

    // Context expansion — include parent chunks if requested
    const expansion = options?.contextExpansion ?? 'parent';
    if (expansion === 'parent' && reranked.length > 0) {
      reranked = await expandWithParents(reranked, log);
    }

    const duration = Date.now() - start;
    log.info({ chunksFound: reranked.length, reRetrievalCount, duration }, 'Retrieval complete');

    state.streamCallback?.('status', {
      step: 'retrieved',
      message: `Found ${reranked.length} relevant chunks`,
      chunks: reranked.length,
    });

    return {
      retrievedChunks: reranked,
      reRetrievalCount: reRetrievalCount + (reRetrievalCount > 0 ? 1 : 0), // Increment only on re-retrieval
      retrievalMetadata: { duration, totalCandidates: deduped.length, afterRerank: reranked.length },
      currentNode: 'retrieval',
      trace: [{
        step: 'retrieve',
        agent: 'RetrievalAgent',
        durationMs: duration,
        inputSummary: query.slice(0, 100),
        outputSummary: `${reranked.length} chunks (${deduped.length} candidates)`,
        metadata: { topKBm25: TOP_K_BM25, topKVector: TOP_K_VECTOR, afterRerank: reranked.length },
      }],
    };
  } catch (err) {
    log.error({ err }, 'Retrieval node failed');
    return { retrievedChunks: [], error: err, trace: [{ step: 'retrieve', agent: 'RetrievalAgent', durationMs: Date.now() - start, outputSummary: `Error: ${err.message}` }] };
  }
}

async function expandWithParents(chunks, log) {
  const parentIds = chunks.filter(c => c.parentChunkId).map(c => c.parentChunkId);
  if (parentIds.length === 0) return chunks;

  try {
    const { Chunk } = await import('../../../server/src/models/Chunk.js').catch(() => ({ Chunk: null }));
    if (!Chunk) return chunks; // Server models not available in agent context

    const parents = await Chunk.find({ _id: { $in: parentIds } }).lean();
    const parentMap = new Map(parents.map(p => [p._id.toString(), p]));

    const withParents = [];
    const seenParents = new Set();

    for (const chunk of chunks) {
      withParents.push(chunk);
      if (chunk.parentChunkId) {
        const parentId = chunk.parentChunkId.toString();
        if (!seenParents.has(parentId) && parentMap.has(parentId)) {
          seenParents.add(parentId);
          withParents.push({ ...parentMap.get(parentId), _isParent: true, _score: 0 });
        }
      }
    }
    return withParents;
  } catch (err) {
    log.warn({ err }, 'Parent expansion failed, returning chunks as-is');
    return chunks;
  }
}
