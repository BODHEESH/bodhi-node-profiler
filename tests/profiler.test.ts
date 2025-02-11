import { BodhiProfiler } from '../src';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

describe('BodhiProfiler', () => {
  const testLogPath = path.join(__dirname, 'test-logs');
  let profiler: BodhiProfiler;

  beforeEach(() => {
    // Clean up test logs
    if (fs.existsSync(testLogPath)) {
      fs.rmSync(testLogPath, { recursive: true });
    }

    profiler = new BodhiProfiler({
      logPath: testLogPath,
      sampleInterval: 1000,
      enableWebDashboard: false
    });
  });

  afterEach(() => {
    // Clean up test logs
    if (fs.existsSync(testLogPath)) {
      fs.rmSync(testLogPath, { recursive: true });
    }
  });

  test('should initialize with default options', () => {
    const defaultProfiler = new BodhiProfiler();
    const metrics = defaultProfiler.getMetrics();
    
    expect(metrics).toHaveProperty('metrics.apiResponses');
    expect(metrics).toHaveProperty('metrics.memoryUsage');
    expect(metrics).toHaveProperty('metrics.cpuUsage');
    expect(metrics).toHaveProperty('metrics.eventLoopDelay');
  });

  test('should create log directory', () => {
    expect(fs.existsSync(testLogPath)).toBeTruthy();
  });

  test('should track API response times', async () => {
    const app = express();
    app.use(profiler.middleware());

    app.get('/test', (req, res) => {
      setTimeout(() => {
        res.json({ success: true });
      }, 100);
    });

    await request(app)
      .get('/test')
      .expect(200);

    const metrics = profiler.getMetrics();
    expect(metrics.metrics.apiResponses.size).toBeGreaterThan(0);
    expect(metrics.metrics.apiResponses.get('GET /test')).toBeGreaterThan(90);
  });

  test('should collect memory metrics', async () => {
    const metrics = profiler.getMetrics();
    expect(metrics.currentStats.memory.heapUsed).toBeGreaterThan(0);
    expect(metrics.currentStats.memory.heapTotal).toBeGreaterThan(0);
    expect(metrics.currentStats.memory.rss).toBeGreaterThan(0);
  });

  test('should collect CPU metrics', async () => {
    const metrics = profiler.getMetrics();
    expect(metrics.currentStats.cpu.percentage).toBeDefined();
    expect(parseFloat(metrics.currentStats.cpu.percentage)).toBeGreaterThanOrEqual(0);
  });

  test('should detect event loop delays', async () => {
    // Create artificial event loop delay
    const blockEventLoop = () => {
      const start = Date.now();
      while (Date.now() - start < 100) {} // Block for 100ms
    };

    blockEventLoop();
    
    const metrics = profiler.getMetrics();
    expect(metrics.currentStats.eventLoopDelay).toBeGreaterThan(0);
  });

  test('should write logs to file', async () => {
    const app = express();
    app.use(profiler.middleware());

    await request(app)
      .get('/test-logging')
      .expect(404);

    // Wait for logs to be written
    await new Promise(resolve => setTimeout(resolve, 100));

    const logFile = path.join(testLogPath, 'profiler.log');
    expect(fs.existsSync(logFile)).toBeTruthy();
    
    const logContent = fs.readFileSync(logFile, 'utf-8');
    expect(logContent).toContain('GET /test-logging');
  });

  test('should handle web dashboard when enabled', async () => {
    const dashboardProfiler = new BodhiProfiler({
      logPath: testLogPath,
      enableWebDashboard: true,
      port: 3002
    });

    const metrics = dashboardProfiler.getMetrics();
    expect(metrics).toBeDefined();

    // Test dashboard endpoint
    const app = express();
    app.get('/profiler/stats', (req, res) => {
      res.json(dashboardProfiler.getMetrics());
    });

    const response = await request(app)
      .get('/profiler/stats')
      .expect(200);

    expect(response.body).toHaveProperty('metrics');
    expect(response.body).toHaveProperty('currentStats');
  });
});
