const express = require('express');
const router = express.Router();
const { RawEvent, NormalizedEvent } = require('../models/Event');
const { normalizeEvent, generateHash } = require('../utils/normalizer');

// POST /api/events — ingest a new event
router.post('/', async (req, res) => {
  const { source, payload, simulateFailure } = req.body;

  // Step 1 — Save raw event first (before any processing)
  let rawEvent;
  try {
    rawEvent = await RawEvent.create({ source, payload });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save raw event', details: err.message });
  }

  // Step 2 — Normalize the event
  const { normalized, errors } = normalizeEvent(source, payload || {});
  const { client_id, metric, amount, timestamp } = normalized;

  // Step 3 — Generate deduplication hash
  const deduplicationHash = generateHash(client_id, metric, amount, timestamp);

  // Step 4 — Check for duplicate
  const existing = await NormalizedEvent.findOne({ deduplicationHash });
  if (existing) {
    return res.status(200).json({
      message: 'Duplicate event detected — skipped processing',
      deduplicated: true,
      existingId: existing._id
    });
  }

  // Step 5 — Simulate failure if requested (for UI toggle)
  if (simulateFailure) {
    await NormalizedEvent.create({
      client_id, metric, amount, timestamp,
      deduplicationHash,
      status: 'failed',
      failureReason: 'Simulated database failure',
      rawEventId: rawEvent._id
    });
    return res.status(500).json({ error: 'Simulated failure — event marked as failed' });
  }

  // Step 6 — Save normalized event
  try {
    const normalizedEvent = await NormalizedEvent.create({
      client_id, metric, amount, timestamp,
      deduplicationHash,
      status: errors.length > 0 ? 'rejected' : 'processed',
      failureReason: errors.length > 0 ? errors.join(', ') : undefined,
      rawEventId: rawEvent._id
    });

    return res.status(201).json({
      message: 'Event processed successfully',
      event: normalizedEvent,
      warnings: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    // If DB write fails — mark as failed but don't lose the raw event
    return res.status(500).json({
      error: 'Database write failed — raw event preserved',
      rawEventId: rawEvent._id,
      details: err.message
    });
  }
});

// GET /api/events — list all normalized events with filters
router.get('/', async (req, res) => {
  try {
    const { client, status, from, to, limit = 50 } = req.query;
    const filter = {};

    if (client) filter.client_id = client;
    if (status) filter.status = status;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const events = await NormalizedEvent.find(filter)
      .sort({ processedAt: -1 })
      .limit(parseInt(limit));

    res.json({ count: events.length, events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
