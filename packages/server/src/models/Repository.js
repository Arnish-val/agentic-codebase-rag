import mongoose from 'mongoose';

const repositorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },        // "myorg/backend-api"
  cloneUrl: { type: String, required: true, trim: true },
  branch: { type: String, default: 'main' },
  lastCommitSha: { type: String },
  lastIndexedAt: { type: Date },
  indexStatus: {
    type: String,
    enum: ['pending', 'cloning', 'indexing', 'ready', 'error'],
    default: 'pending',
  },
  indexError: { type: String },
  stats: {
    totalFiles: { type: Number, default: 0 },
    totalChunks: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    indexDurationMs: { type: Number },
  },
}, { timestamps: true });

repositorySchema.index({ name: 1, branch: 1 }, { unique: true });
repositorySchema.index({ indexStatus: 1 });

export const Repository = mongoose.model('Repository', repositorySchema);
