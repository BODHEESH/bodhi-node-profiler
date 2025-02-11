const BodhiProfiler = require('../src/index');

describe('BodhiProfiler', () => {
  let profiler;

  beforeEach(() => {
    profiler = new BodhiProfiler({
      logPath: './test-logs',
      sampleInterval: 1000,
      enableWebDashboard: false
    });
  });

  test('should initialize with default options', () => {
    expect(profiler.options.logPath).toBe('./test-logs');
    expect(profiler.options.sampleInterval).toBe(1000);
    expect(profiler.options.enableWebDashboard).toBe(false);
  });

  test('should have required metric collections', () => {
    const metrics = profiler.getMetrics();
    expect(metrics).toHaveProperty('metrics.apiResponses');
    expect(metrics).toHaveProperty('metrics.memoryUsage');
    expect(metrics).toHaveProperty('metrics.cpuUsage');
    expect(metrics).toHaveProperty('metrics.eventLoopDelay');
  });

  test('middleware should return a function', () => {
    const middleware = profiler.middleware();
    expect(typeof middleware).toBe('function');
  });
});
