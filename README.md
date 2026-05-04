# Fault-Tolerant Data Processing System

A generic data ingestion and processing service that receives events from multiple external clients, normalizes inconsistent data, prevents duplicate processing, and exposes aggregated results.

---

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env   # Add your MongoDB URI
npm run dev            # Runs on port 5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # Runs on port 5173
```

---

## Architecture Overview

```
Client Request
     ↓
POST /api/events
     ↓
1. Save Raw Event (always first — preserves original data)
     ↓
2. Normalize (canonical format)
     ↓
3. Generate Deduplication Hash
     ↓
4. Check for Duplicate → Skip if exists
     ↓
5. Save Normalized Event (processed / failed / rejected)
     ↓
Response to Client
```

---

## README Questions

### What assumptions did you make?

1. **Events identify themselves via a `source` field** — used as `client_id`. If missing, defaults to `unknown_client`.

2. **Deduplication window is 1 minute** — events with the same client, metric, amount, and timestamp (rounded to the nearest minute) are considered duplicates. This handles retry scenarios without being too strict.

3. **Amount fields may use different names** — the normalizer checks `amount`, `value`, and `total` in that order.

4. **Timestamp formats may vary** — JavaScript's `new Date()` handles most common formats. Invalid timestamps default to `Date.now()`.

5. **Partial schema is acceptable** — missing fields are handled gracefully with defaults. Extra unknown fields are ignored.

6. **No authentication required** — as per the task constraints.

---

### How does your system prevent double counting?

**Deduplication via SHA-256 hash stored with a unique index in MongoDB.**

When an event is received:
1. The normalized event is hashed using: `client_id + metric + amount + timestamp (rounded to minute)`
2. This hash is stored in the `deduplicationHash` field with a **unique index**
3. Before saving, we check if this hash already exists
4. If it does — the event is skipped and the client receives a `deduplicated: true` response
5. If the hash doesn't exist — the event is saved normally

**Why this approach:**
- No reliance on client-provided IDs (unreliable)
- Timestamp rounding handles retry scenarios where timestamps differ slightly
- MongoDB unique index ensures race condition safety at the database level
- Works across retries and partial failures

---

### What happens if the database fails mid-request?

**The raw event is always saved first before any normalization or processing.**

The flow handles failure at each step:

| Step | What fails | What happens |
|------|-----------|--------------|
| Raw event save fails | DB down completely | Return 500, client retries |
| Normalization | Invalid data | Mark as `rejected`, still saved |
| Duplicate check | DB read fails | Return 500, client retries safely |
| Normalized save fails | DB write fails | Raw event preserved, return 500 with rawEventId |
| Client retries | Any failure | Deduplication hash prevents double counting |

**Key insight:** Because the raw event is saved first, we never lose valid data. If the normalized write fails, the raw event exists as a fallback. On retry, the deduplication hash prevents double processing.

---

### What would break first at scale?

**1. MongoDB single instance** — No replication or sharding. Under high write load, the database becomes the bottleneck. Solution: Replica sets + horizontal sharding by client_id.

**2. Deduplication hash lookup** — At very high throughput, even indexed lookups add latency. Solution: Redis cache for recent hashes with TTL.

**3. Synchronous normalization** — Currently normalization happens in-request. Solution: Message queue (e.g., RabbitMQ, Kafka) — ingest → queue → async worker normalizes.

**4. Aggregation queries** — `$group` aggregation on large collections is expensive. Solution: Pre-computed aggregation tables updated incrementally.

**5. No rate limiting** — A misbehaving client could flood the system. Solution: Rate limiting middleware per client_id.

---

## API Endpoints

### POST /api/events
Ingest a raw event.

**Request body:**
```json
{
  "source": "client_A",
  "payload": {
    "metric": "value",
    "amount": "1200",
    "timestamp": "2024/01/01"
  },
  "simulateFailure": false
}
```

**Responses:**
- `201` — Event processed successfully
- `200` — Duplicate detected, skipped
- `500` — Processing failed (raw event preserved)

---

### GET /api/events
List normalized events with optional filters.

**Query params:** `client`, `status`, `from`, `to`, `limit`

---

### GET /api/aggregate
Get aggregated results.

**Query params:** `client`, `from`, `to`

**Returns:** Overall totals, per-client breakdown, status counts

---

## Data Models

### RawEvent
Stores the exact incoming payload — never modified.

### NormalizedEvent
Canonical format with deduplication hash and processing status.

```json
{
  "client_id": "client_A",
  "metric": "value",
  "amount": 1200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "deduplicationHash": "sha256...",
  "status": "processed | failed | rejected",
  "failureReason": "optional error message",
  "rawEventId": "reference to original raw event"
}
```

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB + Mongoose
- **Frontend:** React + Tailwind CSS
- **Deployment:** Render (backend) + Vercel (frontend)

---

## Optional Extension Note

For schema evolution over time — the `RawEvent` collection stores the original payload untouched using `Mixed` type. This means old data always remains queryable in its original form. The `NormalizedEvent` can be re-processed from raw events if the normalization logic changes, without losing historical data.
