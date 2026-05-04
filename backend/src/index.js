require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const eventRoutes = require('./routes/events');
const aggregateRoutes = require('./routes/aggregate');

const app = express();

app.use(cors({
  origin: "https://fault-tolerant-data-processing-task.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/aggregate', aggregateRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Fault-Tolerant Data Processing System Running' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fault_tolerant';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
