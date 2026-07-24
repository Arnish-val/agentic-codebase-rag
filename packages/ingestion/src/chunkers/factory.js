import path from 'path';
import { chunkCode } from './codeChunker.js';
import { chunkMarkdown } from './markdownChunker.js';
import { chunkOpenAPI } from './openapiChunker.js';

export async function chunkFile(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();

  if (['.js', '.jsx', '.ts', '.tsx', '.py'].includes(ext)) {
    return chunkCode(filePath, content);
  }

  if (ext === '.md') {
    return chunkMarkdown(filePath, content);
  }

  if (ext === '.json' && (filePath.includes('swagger') || filePath.includes('openapi'))) {
    return chunkOpenAPI(filePath, content);
  }

  // Generic fallback
  const lines = content.split('\n');
  return [{
    chunkIndex: 0,
    chunkType: 'block',
    hierarchyLevel: 3,
    filePath,
    language: 'text',
    startLine: 1,
    endLine: lines.length,
    content,
    searchText: `${filePath} ${content.slice(0, 200)}`,
  }];
}
