const crypto = require('crypto');

// Normalize raw payload into canonical format
function normalizeEvent(source, payload) {
  const errors = [];

  // client_id — from source field
  const client_id = source || 'unknown_client';

  // metric — try common field names
  const metric = payload.metric || payload.event_type || payload.type || payload.name || 'unknown';

  // amount — convert string to number safely
  let amount = 0;
  const rawAmount = payload.amount ?? payload.value ?? payload.total ?? 0;
  const parsed = parseFloat(rawAmount);
  if (!isNaN(parsed)) {
    amount = parsed;
  } else {
    errors.push(`Invalid amount: ${rawAmount}`);
  }

  // timestamp — handle multiple formats
  let timestamp = new Date();
  const rawTimestamp = payload.timestamp || payload.date || payload.time;
  if (rawTimestamp) {
    const parsed = new Date(rawTimestamp);
    if (!isNaN(parsed.getTime())) {
      timestamp = parsed;
    } else {
      errors.push(`Invalid timestamp: ${rawTimestamp}`);
    }
  }

  return {
    normalized: { client_id, metric, amount, timestamp },
    errors
  };
}

// Generate deduplication hash from normalized data
// Using client_id + metric + amount + timestamp rounded to minute
function generateHash(client_id, metric, amount, timestamp) {
  const minuteTimestamp = new Date(timestamp);
  minuteTimestamp.setSeconds(0, 0);

  const hashInput = `${client_id}:${metric}:${amount}:${minuteTimestamp.toISOString()}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

module.exports = { normalizeEvent, generateHash };
