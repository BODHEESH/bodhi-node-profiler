const pidusage = require('pidusage');
const { performance } = require('perf_hooks');

class Stats {
  constructor() {
    this.latestStats = {};
    this.eventLoopLag = 0;
    this.startEventLoopMonitoring();
  }

  startEventLoopMonitoring() {
    let lastCheck = performance.now();
    
    setInterval(() => {
      const now = performance.now();
      const delta = now - lastCheck;
      this.eventLoopLag = Math.max(0, delta - 1); // Expected 1ms interval
      lastCheck = now;
    }, 1);
  }

  async collect() {
    try {
      const stats = await pidusage(process.pid);
      const memoryUsage = process.memoryUsage();

      this.latestStats = {
        timestamp: Date.now(),
        cpu: {
          percentage: stats.cpu.toFixed(1),
          system: stats.system,
          user: stats.user
        },
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          rss: stats.memory,
          external: memoryUsage.external
        },
        eventLoopDelay: this.eventLoopLag
      };

      return this.latestStats;
    } catch (error) {
      console.error('Error collecting stats:', error);
      throw error;
    }
  }

  getLatest() {
    return this.latestStats;
  }
}

module.exports = Stats;
