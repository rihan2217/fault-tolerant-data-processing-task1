const mongoose = require('mongoose');

// Raw event stored exactly as received
const RawEventSchema = new mongoose.Schema({
  source: String,
  payload: mongoose.Schema.Types.Mixed,
  receivedAt: { type: Date, default: Date.now }
});

// Normalized canonical event
const NormalizedEventSchema = new mongoose.Schema({
  client_id: { type: String, required: true, index: true },
  metric: { type: String, default: 'unknown' },
  amount: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now, index: true },
  deduplicationHash: { type: String, unique: true, index: true },
  status: { type: String, enum: ['processed', 'failed', 'rejected'], default: 'processed' },
  failureReason: { type: String },
  rawEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'RawEvent' },
  processedAt: { type: Date, default: Date.now }
});

const RawEvent = mongoose.model('RawEvent', RawEventSchema);
const NormalizedEvent = mongoose.model('NormalizedEvent', NormalizedEventSchema);

module.exports = { RawEvent, NormalizedEvent };
