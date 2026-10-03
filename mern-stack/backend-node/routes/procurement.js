const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const { saveAuditLog, getRecentAuditLogs } = require('../models/AuditLog');

const router = express.Router();
const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://127.0.0.1:8000';

// POST /api/evaluate - Proxy to FastAPI, log to MongoDB, return rich response
router.post('/evaluate', async (req, res) => {
  const startTime = Date.now();
  const payload = req.body || {};

  try {
    const fastApiResp = await axios.post(`${FASTAPI_BASE_URL}/api/evaluate`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const evalData = fastApiResp.data;
    const latencyMs = Date.now() - startTime;

    // Extract fields for MongoDB audit log
    const auditRecord = {
      rawText: payload.text || (payload.item_description ? `${payload.item_description} (${payload.estimated_value_inr} INR)` : ''),
      extractedInput: evalData.extracted_input || payload,
      decisionStatus: evalData.decision?.status || 'UNKNOWN',
      matchedRuleId: evalData.decision?.matched_rule_id || 'NO_RULE_MATCH',
      approver: evalData.decision?.approver || 'Not Determined',
      providerUsed: evalData._provider_used || evalData.provider_used || 'deterministic-mock',
      summary: evalData.summary || '',
      complianceMemo: evalData.compliance_memo || '',
      latencyMs: evalData.latency_ms || latencyMs,
    };

    // Asynchronously save audit record
    saveAuditLog(auditRecord).catch((err) => {
      console.warn('[AuditLogger] Async audit save warning:', err.message);
    });

    // Attach gateway telemetry
    evalData.gateway = {
      proxy: 'Express.js Gateway',
      port: 5000,
      mongoConnected: mongoose.connection.readyState === 1,
    };

    res.json(evalData);
  } catch (err) {
    console.error('[ProcurementRouter] Evaluate failed:', err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data || { detail: `FastAPI gateway error: ${err.message}` };
    res.status(status).json(detail);
  }
});

// GET /api/audits - Retrieve last 50 evaluation audit records
router.get('/audits', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = await getRecentAuditLogs(limit);
    res.json({
      status: 'success',
      total: logs.length,
      mongoConnected: mongoose.connection.readyState === 1,
      logs,
    });
  } catch (err) {
    console.error('[ProcurementRouter] Failed to fetch audits:', err.message);
    res.status(500).json({ error: 'Failed to retrieve audit records' });
  }
});

// GET /api/presets - Proxy preset benchmark scenarios
router.get('/presets', async (req, res) => {
  try {
    const resp = await axios.get(`${FASTAPI_BASE_URL}/api/presets`, { timeout: 5000 });
    res.json(resp.data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch presets from FastAPI' });
  }
});

// GET /api/clause/:id - Proxy clause retrieval
router.get('/clause/:id', async (req, res) => {
  try {
    const resp = await axios.get(`${FASTAPI_BASE_URL}/api/clause/${encodeURIComponent(req.params.id)}`, { timeout: 5000 });
    res.json(resp.data);
  } catch (err) {
    res.status(err.response?.status || 502).json(err.response?.data || { error: 'Clause lookup failed' });
  }
});

// GET /api/form/:id - Proxy form template
router.get('/form/:id', async (req, res) => {
  try {
    const resp = await axios.get(`${FASTAPI_BASE_URL}/api/form/${encodeURIComponent(req.params.id)}`, { timeout: 5000 });
    res.json(resp.data);
  } catch (err) {
    res.status(err.response?.status || 502).json(err.response?.data || { error: 'Form lookup failed' });
  }
});

// GET /api/benchmarks - Proxy benchmark telemetry
router.get('/benchmarks', async (req, res) => {
  try {
    const resp = await axios.get(`${FASTAPI_BASE_URL}/api/benchmarks`, { timeout: 10000 });
    res.json(resp.data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch benchmarks from FastAPI' });
  }
});

// GET /api/status - Live health status
router.get('/status', async (req, res) => {
  let fastApiOnline = false;
  try {
    const r = await axios.get(`${FASTAPI_BASE_URL}/`, { timeout: 2000 });
    fastApiOnline = r.status === 200;
  } catch (e) {
    fastApiOnline = false;
  }

  res.json({
    gateway: 'Node.js Express Gateway',
    port: 5000,
    fastApi: {
      url: FASTAPI_BASE_URL,
      online: fastApiOnline,
    },
    mongodb: {
      connected: mongoose.connection.readyState === 1,
      state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    },
  });
});

module.exports = router;
