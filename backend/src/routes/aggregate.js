const express = require('express');
const router = express.Router();
const { NormalizedEvent } = require('../models/Event');

// GET /api/aggregate — aggregated results with filtering
router.get('/', async (req, res) => {
  try {
    const { client, from, to } = req.query;

    const matchFilter = { status: 'processed' };
    if (client) matchFilter.client_id = client;
    if (from || to) {
      matchFilter.timestamp = {};
      if (from) matchFilter.timestamp.$gte = new Date(from);
      if (to) matchFilter.timestamp.$lte = new Date(to);
    }

    const aggregation = await NormalizedEvent.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$client_id',
          totalAmount: { $sum: '$amount' },
          eventCount: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
          firstEvent: { $min: '$timestamp' },
          lastEvent: { $max: '$timestamp' },
          metrics: { $addToSet: '$metric' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Overall totals
    const totals = await NormalizedEvent.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalEvents: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    // Status breakdown
    const statusBreakdown = await NormalizedEvent.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      overall: totals[0] || { totalAmount: 0, totalEvents: 0, avgAmount: 0 },
      byClient: aggregation,
      statusBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
