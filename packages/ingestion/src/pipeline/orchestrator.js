import { cloneRepository } from './gitCloner.js';
import { scanFiles } from './fileScanner.js';
import { chunkFile } from '../chunkers/factory.js';
import { generateEmbeddings } from '../embedders/bgeM3Embedder.js';
import { saveChunks, saveDocument } from '../stores/documentStore.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  transports: [new winston.transports.Console()],
});

export async function runPipeline(cloneUrl, branch = 'main') {
  logger.info({ cloneUrl, branch }, 'Starting ingestion pipeline');

  // 1. Clone repository
  const repoPath = await cloneRepository(cloneUrl, branch);

  // 2. Discover & scan target files
  const files = await scanFiles(repoPath);
  logger.info({ count: files.length }, 'Discovered files to index');

  // 3. Process each file
  for (const filePath of files) {
    try {
      const doc = await saveDocument(repoPath, filePath);
      const chunks = await chunkFile(filePath, doc.content);

      if (chunks.length > 0) {
        // Embed chunk contents
        const contents = chunks.map(c => c.content);
        const embeddings = await generateEmbeddings(contents);

        const chunksWithEmbeddings = chunks.map((c, idx) => ({
          ...c,
          documentId: doc._id,
          embedding: embeddings[idx],
        }));

        await saveChunks(chunksWithEmbeddings);
      }
    } catch (err) {
      logger.error({ filePath, err: err.message }, 'Error indexing file');
    }
  }

  logger.info('Pipeline execution finished');
}
