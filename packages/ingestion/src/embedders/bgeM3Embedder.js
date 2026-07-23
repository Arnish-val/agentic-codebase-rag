import axios from 'axios';

export async function generateEmbeddings(texts) {
  const serviceUrl = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8080';

  try {
    const res = await axios.post(`${serviceUrl}/embed`, {
      inputs: texts,
    }, { timeout: 30000 });

    return res.data; // Array of 1024-dim float arrays
  } catch (err) {
    console.warn('Embedding service request failed, returning mock 1024-dim zero vectors:', err.message);
    // Mock zero vector array fallback for local dev when TEI server is offline
    return texts.map(() => new Array(1024).fill(0));
  }
}
