import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  feedbackType: {
    type: String,
    enum: ['thumbs_up', 'thumbs_down', 'flag_hallucination', 'flag_citation'],
    required: true,
  },
  comment: { type: String, trim: true, maxlength: 1000 },
  flaggedCitationIndex: { type: Number, default: null },
  // Snapshots at time of feedback (for offline analysis)
  querySnapshot: { type: String },
  responseSnapshot: { type: String },
  sourcesSnapshot: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

feedbackSchema.index({ feedbackType: 1, createdAt: -1 });

export const Feedback = mongoose.model('Feedback', feedbackSchema);
