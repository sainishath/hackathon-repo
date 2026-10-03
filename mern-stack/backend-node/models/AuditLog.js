const mongoose = require('mongoose');

// In-memory fallback array for zero-downtime offline audit logging
const inMemoryAuditLogs = [];

const AuditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  rawText: {
    type: String,
    default: '',
  },
  extractedInput: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  decisionStatus: {
    type: String,
    required: true,
  },
  matchedRuleId: {
    type: String,
    default: 'NO_RULE_MATCH',
  },
  approver: {
    type: String,
    default: 'Competent Authority',
  },
  providerUsed: {
    type: String,
    default: 'deterministic-mock',
  },
  summary: {
    type: String,
    default: '',
  },
  complianceMemo: {
    type: String,
    default: '',
  },
  latencyMs: {
    type: Number,
    default: 0,
  },
});

let AuditLogModel;
try {
  AuditLogModel = mongoose.model('AuditLog', AuditLogSchema);
} catch (e) {
  AuditLogModel = mongoose.models.AuditLog;
}

// Wrapper utility supporting both MongoDB and In-Memory fallback
async function saveAuditLog(entry) {
  const isMongoReady = mongoose.connection.readyState === 1;
  const logItem = {
    ...entry,
    _id: isMongoReady ? undefined : `mem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: entry.timestamp || new Date(),
  };

  if (isMongoReady) {
    try {
      const doc = new AuditLogModel(logItem);
      return await doc.save();
    } catch (err) {
      console.warn('[AuditLogger] MongoDB save failed, falling back to memory:', err.message);
    }
  }

  // In-memory fallback
  inMemoryAuditLogs.unshift(logItem);
  if (inMemoryAuditLogs.length > 200) inMemoryAuditLogs.pop();
  return logItem;
}

async function getRecentAuditLogs(limit = 50) {
  const isMongoReady = mongoose.connection.readyState === 1;
  if (isMongoReady) {
    try {
      const docs = await AuditLogModel.find().sort({ timestamp: -1 }).limit(limit).lean();
      if (docs && docs.length > 0) return docs;
    } catch (err) {
      console.warn('[AuditLogger] MongoDB fetch failed, using memory:', err.message);
    }
  }
  return inMemoryAuditLogs.slice(0, limit);
}

module.exports = {
  AuditLogModel,
  saveAuditLog,
  getRecentAuditLogs,
  inMemoryAuditLogs,
};
