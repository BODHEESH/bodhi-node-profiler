const express = require('express');
const { BodhiProfiler } = require('../dist');

const app = express();

// Initialize profiler
const profiler = new BodhiProfiler({
  logPath: './logs',
  sampleInterval: 1000,
  enableWebDashboard: true,
  port: 3001
});

// Add profiler middleware
app.use(profiler.middleware());

// Test routes
app.get('/fast', (req, res) => {
  res.json({ message: 'Fast response' });
});

app.get('/slow', async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  res.json({ message: 'Slow response' });
});

app.get('/memory-intensive', (req, res) => {
  const array = new Array(1000000).fill('test');
  res.json({ message: 'Memory intensive operation', size: array.length });
});

app.get('/cpu-intensive', (req, res) => {
  let result = 0;
  for (let i = 0; i < 1000000; i++) {
    result += Math.sqrt(i);
  }
  res.json({ message: 'CPU intensive operation', result });
});

app.get('/metrics', (req, res) => {
  const metrics = profiler.getMetrics();
  res.json(metrics);
});

const port = 3000;
app.listen(port, () => {
  console.log(`Test app running on http://localhost:${port}`);
  console.log(`Profiler dashboard available at http://localhost:3001/profiler/stats`);
  console.log('\nAvailable test endpoints:');
  console.log('- GET /fast - Quick response');
  console.log('- GET /slow - Delayed response (500ms)');
  console.log('- GET /memory-intensive - Memory usage test');
  console.log('- GET /cpu-intensive - CPU usage test');
  console.log('- GET /metrics - View current metrics');
});
