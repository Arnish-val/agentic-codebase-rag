import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  parentChunkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chunk', default: null },
  chunkIndex: { type: Number, required: true },
  content: { type: String, required: true },
  chunkType: {
    type: String,
    enum: ['function', 'class', 'method', 'section', 'block', 'paragraph', 'endpoint', 'file'],
    default: 'block',
  },
  hierarchyLevel: { type: Number, default: 3 },  // 0=repo,1=file,2=class,3=func,4=block

  // Source location (denormalized for retrieval performance)
  filePath: { type: String, required: true, index: true },
  language: { type: String, default: 'unknown' },
  startLine: { type: Number, required: true },
  endLine: { type: Number, required: true },

  // Code-specific metadata
  codeMetadata: {
    functionName: String,
    className: String,
    signature: String,
    decorators: [String],
    imports: [String],
    exports: [String],
  },

  // Embedding (BGE-M3 dense vector — 1024 dims)
  // NOTE: Not stored directly in MongoDB document for Atlas Vector Search —
  // Atlas uses a separate vector index. We store the embedding here for local dev.
  embedding: { type: [Number], select: false },    // 1024-dim float array
  embeddingModel: { type: String, default: 'BAAI/bge-m3' },
  embeddingVersion: { type: String, default: '1.0' },
  tokenCount: { type: Number, default: 0 },

  // BM25 searchable text (content + signature + docstring)
  searchText: { type: String },

  isStale: { type: Boolean, default: false },
}, { timestamps: true });

// Compound indexes
chunkSchema.index({ documentId: 1, chunkIndex: 1 });
chunkSchema.index({ parentChunkId: 1 });
chunkSchema.index({ filePath: 1, startLine: 1 });
// Full-text index for BM25 search
chunkSchema.index({ searchText: 'text', filePath: 'text' }, {
  weights: { searchText: 10, filePath: 2 },
  name: 'chunk_bm25_index',
});

export const Chunk = mongoose.model('Chunk', chunkSchema);
