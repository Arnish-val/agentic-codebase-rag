import fs from 'fs';
import crypto from 'crypto';

export async function saveDocument(repoPath, filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileHash = crypto.createHash('sha256').update(content).digest('hex');

  // Stub model save — in production connects to Document & Chunk mongoose models
  return {
    _id: 'doc_' + fileHash.slice(0, 12),
    filePath,
    fileHash,
    content,
  };
}

export async function saveChunks(chunks) {
  // Stub chunk save
  return chunks.length;
}
