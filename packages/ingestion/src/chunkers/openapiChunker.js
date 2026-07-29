export async function chunkOpenAPI(filePath, content) {
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [{
      chunkIndex: 0,
      chunkType: 'block',
      hierarchyLevel: 3,
      filePath,
      language: 'json',
      startLine: 1,
      endLine: content.split('\n').length,
      content,
      searchText: `${filePath} ${content.slice(0, 200)}`,
    }];
  }

  const chunks = [];
  let chunkIdx = 0;

  if (parsed.paths) {
    for (const [pathUrl, methods] of Object.entries(parsed.paths)) {
      for (const [httpMethod, details] of Object.entries(methods)) {
        chunks.push({
          chunkIndex: chunkIdx++,
          chunkType: 'endpoint',
          hierarchyLevel: 2,
          filePath,
          language: 'json',
          startLine: 1,
          endLine: 50,
          content: JSON.stringify({ path: pathUrl, method: httpMethod, ...details }, null, 2),
          codeMetadata: {
            endpointPath: pathUrl,
            httpMethod: httpMethod.toUpperCase(),
            summary: details.summary || details.description,
          },
          searchText: `${filePath} ${httpMethod.toUpperCase()} ${pathUrl} ${details.summary || ''}`,
        });
      }
    }
  }

  return chunks;
}
