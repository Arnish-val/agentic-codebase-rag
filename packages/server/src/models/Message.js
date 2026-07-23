import mongoose from 'mongoose';

const citationSchema = new mongoose.Schema({
  index: Number,
  chunkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chunk' },
  filePath: String,
  startLine: Number,
  endLine: Number,
  relevanceScore: Number,
  snippet: String,
}, { _id: false });

const executionResultSchema = new mongoose.Schema({
  language: String,
  code: String,
  stdout: String,
  stderr: String,
  exitCode: Number,
  executionTimeMs: Number,
}, { _id: false });

const traceStepSchema = new mongoose.Schema({
  step: { type: String, enum: ['route', 'retrieve', 'generate', 'verify', 'execute', 'memory', 'clarify'] },
  agent: String,
  durationMs: Number,
  inputSummary: String,
  outputSummary: String,
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  messageIndex: { type: Number, required: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },

  // Classification (assistant messages)
  queryType: { type: String, enum: ['factual', 'multi_hop', 'codegen', 'comparison', 'ambiguous'] },
  classificationConfidence: Number,

  // Citations
  citations: [citationSchema],

  // Code execution results
  executionResults: [executionResultSchema],

  // Agent reasoning trace
  trace: [traceStepSchema],

  // Performance
  firstTokenMs: Number,
  totalDurationMs: Number,
  tokenCount: {
    input: { type: Number, default: 0 },
    output: { type: Number, default: 0 },
  },
}, { timestamps: true });

messageSchema.index({ sessionId: 1, messageIndex: 1 });
messageSchema.index({ createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
