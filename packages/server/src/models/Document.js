import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository', required: true },
  filePath: { type: String, required: true, trim: true },   // "src/auth/middleware.js"
  fileHash: { type: String, required: true },               // SHA-256
  language: { type: String, default: 'unknown' },           // "javascript", "python", "markdown"
  content: { type: String, required: true },                // Full file content
  lineCount: { type: Number, default: 0 },
  fileSizeBytes: { type: Number, default: 0 },
  astStructure: { type: mongoose.Schema.Types.Mixed },      // Parsed AST summary (code files)
  lastIndexedAt: { type: Date, default: Date.now },
  metadata: {
    repository: String,
    branch: String,
    commitSha: String,
  },
}, { timestamps: true });

documentSchema.index({ repositoryId: 1, filePath: 1 }, { unique: true });
documentSchema.index({ fileHash: 1 });
documentSchema.index({ language: 1 });
documentSchema.index({ lastIndexedAt: 1 });

export const Document = mongoose.model('Document', documentSchema);
