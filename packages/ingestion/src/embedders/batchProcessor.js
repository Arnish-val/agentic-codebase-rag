import { generateEmbeddings } from './bgeM3Embedder.js';

export async function processEmbeddingBatch(chunks, batchSize = 16) {
  const embeddedChunks = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const contents = batch.map(c => c.content);

    try {
      const vectors = await generateEmbeddings(contents);
      batch.forEach((chunk, idx) => {
        embeddedChunks.push({
          ...chunk,
          embedding: vectors[idx],
        });
      });
    } catch (err) {
      console.error(`Failed batch embedding starting at index ${i}:`, err.message);
      // Fallback zero vector assignment for failed batch
      batch.forEach(chunk => {
        embeddedChunks.push({
          ...chunk,
          embedding: new Array(1024).fill(0),
        });
      });
    }
  }

  return embeddedChunks;
}
