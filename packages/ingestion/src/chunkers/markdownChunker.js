export async function chunkMarkdown(filePath, content) {
  const lines = content.split('\n');
  const chunks = [];

  const headingRegex = /^#{1,6}\s+(.+)$/;
  let currentChunk = null;
  let chunkIdx = 0;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const match = line.match(headingRegex);

    if (match) {
      if (currentChunk) {
        currentChunk.endLine = lineNum - 1;
        currentChunk.content = lines.slice(currentChunk.startLine - 1, currentChunk.endLine).join('\n');
        chunks.push(currentChunk);
      }

      currentChunk = {
        chunkIndex: chunkIdx++,
        chunkType: 'section',
        hierarchyLevel: 2,
        filePath,
        language: 'markdown',
        startLine: lineNum,
        endLine: lineNum,
        codeMetadata: {
          sectionHeading: match[1].trim(),
        },
        searchText: `${filePath} ${match[1].trim()}`,
      };
    }
  });

  if (currentChunk) {
    currentChunk.endLine = lines.length;
    currentChunk.content = lines.slice(currentChunk.startLine - 1, currentChunk.endLine).join('\n');
    chunks.push(currentChunk);
  }

  if (chunks.length === 0) {
    chunks.push({
      chunkIndex: 0,
      chunkType: 'paragraph',
      hierarchyLevel: 3,
      filePath,
      language: 'markdown',
      startLine: 1,
      endLine: lines.length,
      content,
      searchText: `${filePath} ${content.slice(0, 200)}`,
    });
  }

  return chunks;
}
