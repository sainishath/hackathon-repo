require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const procurementRoutes = require('./routes/procurement');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/procurement_audit';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', procurementRoutes);

// Root health endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Institutional Procurement Node.js API Gateway',
    version: '1.0.0',
    endpoints: ['/api/evaluate', '/api/audits', '/api/presets', '/api/status'],
  });
});

// MongoDB Connection with non-blocking graceful fallback
async function connectDatabase() {
  console.log(`[MongoDB] Connecting to ${MONGO_URI}...`);
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    console.log('[MongoDB] Connected successfully to audit database.');
  } catch (err) {
    console.warn(`[MongoDB] Local MongoDB connection unavailable (${err.message}).`);
    console.log('[MongoDB] Running in zero-dependency in-memory audit log mode.');
  }
}

// Start Express Server
app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 Node.js Express Gateway running on http://127.0.0.1:${PORT}`);
  console.log(`🔗 Proxying to FastAPI Compliance Core at http://127.0.0.1:8000`);
  console.log(`=======================================================`);
  await connectDatabase();
});

module.exports = app;
