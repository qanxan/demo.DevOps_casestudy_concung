'use strict';

const express = require('express');

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// App metadata (dung de verify rolling update / image versioning)
// ---------------------------------------------------------------------------
const APP_VERSION = process.env.APP_VERSION || 'dev';
const APP_ENV = process.env.APP_ENV || 'local';
const startTime = Date.now();

// ---------------------------------------------------------------------------
// Business routes
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    service: 'casestudy-demo-app',
    version: APP_VERSION,
    env: APP_ENV,
    message: 'Con Cung DevOps Case Study - demo application',
  });
});

// Endpoint nghiep vu mau de co gi do test
app.get('/api/products', (req, res) => {
  res.json([
    { id: 1, name: 'Sua bot', price: 350000 },
    { id: 2, name: 'Ta / Bim', price: 250000 },
    { id: 3, name: 'Do choi', price: 150000 },
  ]);
});

// ---------------------------------------------------------------------------
// Health probes cho Kubernetes
//   - /health/live  : liveness  (process con song khong)
//   - /health/ready : readiness (san sang nhan traffic chua)
// ---------------------------------------------------------------------------
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'UP', uptime_s: Math.floor((Date.now() - startTime) / 1000) });
});

let ready = false;
// Gia lap warm-up: san sang sau 3s (connect DB, load cache...)
setTimeout(() => { ready = true; }, process.env.NODE_ENV === 'test' ? 0 : 3000);

app.get('/health/ready', (req, res) => {
  if (ready) {
    return res.status(200).json({ status: 'READY' });
  }
  return res.status(503).json({ status: 'NOT_READY' });
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

// Chi listen khi chay truc tiep (khong listen khi import trong test)
if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[${APP_ENV}] app v${APP_VERSION} listening on :${PORT}`);
  });
}

module.exports = app;
