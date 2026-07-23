import path from 'path';

export async function chunkFile(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();

  // Basic hierarchical line/block chunker for code and markdown
  const lines = content.split('\n');
  const chunkSize = ext === '.md' ? 30 : 40;
  const overlap = 5;

  const chunks = [];
  let chunkIdx = 0;

  for (let i = 0; i < lines.length; i += (chunkSize - overlap)) {
    const chunkLines = lines.slice(i, i + chunkSize);
    if (chunkLines.length === 0) break;

    const startLine = i + 1;
    const endLine = i + chunkLines.length;

    chunks.push({
      chunkIndex: chunkIdx++,
      content: chunkLines.join('\n'),
      chunkType: ext === '.md' ? 'section' : 'block',
      hierarchyLevel: 3,
      filePath,
      language: getLanguage(ext),
      startLine,
      endLine,
      searchText: `${filePath} ${chunkLines.join(' ')}`,
    });
  }

  return chunks;
}

function getLanguage(ext) {
  switch (ext) {
    case '.js': case '.jsx': return 'javascript';
    case '.ts': case '.tsx': return 'typescript';
    case '.py': return 'python';
    case '.md': return 'markdown';
    default: return 'text';
  }
}
