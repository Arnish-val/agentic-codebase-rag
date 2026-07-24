import path from 'path';

export async function chunkCode(filePath, content) {
  const lines = content.split('\n');
  const chunks = [];

  // Match function and class declarations
  const funcRegex = /^\s*(async\s+)?(function|class|const|let|var)\s+([A-Za-z0-9_]+)/;

  let currentChunk = null;
  let chunkIdx = 0;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const match = line.match(funcRegex);

    if (match) {
      if (currentChunk) {
        currentChunk.endLine = lineNum - 1;
        currentChunk.content = lines.slice(currentChunk.startLine - 1, currentChunk.endLine).join('\n');
        chunks.push(currentChunk);
      }

      currentChunk = {
        chunkIndex: chunkIdx++,
        chunkType: match[2] === 'class' ? 'class' : 'function',
        hierarchyLevel: 2,
        filePath,
        language: getLanguage(filePath),
        startLine: lineNum,
        endLine: lineNum,
        codeMetadata: {
          functionName: match[2] !== 'class' ? match[3] : undefined,
          className: match[2] === 'class' ? match[3] : undefined,
          signature: line.trim(),
        },
        searchText: `${filePath} ${match[3]} ${line.trim()}`,
      };
    }
  });

  if (currentChunk) {
    currentChunk.endLine = lines.length;
    currentChunk.content = lines.slice(currentChunk.startLine - 1, currentChunk.endLine).join('\n');
    chunks.push(currentChunk);
  }

  // Fallback if no functions/classes detected
  if (chunks.length === 0) {
    chunks.push({
      chunkIndex: 0,
      chunkType: 'block',
      hierarchyLevel: 3,
      filePath,
      language: getLanguage(filePath),
      startLine: 1,
      endLine: lines.length,
      content,
      searchText: `${filePath} ${content.slice(0, 200)}`,
    });
  }

  return chunks;
}

function getLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.js', '.jsx'].includes(ext)) return 'javascript';
  if (['.ts', '.tsx'].includes(ext)) return 'typescript';
  if (ext === '.py') return 'python';
  return 'code';
}
