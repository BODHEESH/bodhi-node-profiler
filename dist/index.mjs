var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/index.ts
import { performance as performance2, PerformanceObserver } from "perf_hooks";

// src/logger.ts
import winston from "winston";
import path from "path";
import fs from "fs";
var Logger = class {
  constructor(logPath) {
    this.logPath = logPath;
    this.ensureLogDirectory();
    this.initializeLogger();
  }
  ensureLogDirectory() {
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }
  initializeLogger() {
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(this.logPath, "error.log"),
          level: "error"
        }),
        new winston.transports.File({
          filename: path.join(this.logPath, "profiler.log")
        })
      ]
    });
    if (process.env.NODE_ENV !== "production") {
      this.logger.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }
  }
  log(type, data) {
    this.logger.info({
      type,
      ...data
    });
  }
  error(type, error) {
    this.logger.error({
      type,
      message: error.message,
      stack: error.stack
    });
  }
};

// src/stats.ts
import { performance } from "perf_hooks";
import os from "os";
var Stats = class {
  constructor() {
    this.eventLoopLag = 0;
    this.lastCpuCheck = Date.now();
    this.lastCpuUsage = process.cpuUsage();
    this.latestStats = {
      timestamp: Date.now(),
      cpu: {
        percentage: "0",
        system: 0,
        user: 0
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0
      },
      eventLoopDelay: 0
    };
    this.startEventLoopMonitoring();
  }
  startEventLoopMonitoring() {
    let lastCheck = performance.now();
    setInterval(() => {
      const now = performance.now();
      const delta = now - lastCheck;
      this.eventLoopLag = Math.max(0, delta - 1);
      lastCheck = now;
    }, 1);
  }
  calculateCpuUsage() {
    const now = Date.now();
    const currentCpuUsage = process.cpuUsage();
    const userDiff = currentCpuUsage.user - this.lastCpuUsage.user;
    const systemDiff = currentCpuUsage.system - this.lastCpuUsage.system;
    const timeDiff = now - this.lastCpuCheck;
    this.lastCpuUsage = currentCpuUsage;
    this.lastCpuCheck = now;
    const totalUsage = (userDiff + systemDiff) / 1e3;
    const percentage = (totalUsage / (timeDiff * os.cpus().length) * 100).toFixed(1);
    return {
      percentage,
      system: systemDiff / 1e6,
      // Convert to seconds
      user: userDiff / 1e6
    };
  }
  async collect() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpu = this.calculateCpuUsage();
      this.latestStats = {
        timestamp: Date.now(),
        cpu,
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          rss: memoryUsage.rss,
          external: memoryUsage.external
        },
        eventLoopDelay: this.eventLoopLag
      };
      return this.latestStats;
    } catch (error) {
      console.error("Error collecting stats:", error);
      throw error;
    }
  }
  getLatest() {
    return this.latestStats;
  }
};

// src/index.ts
var BodhiProfiler = class {
  constructor(options = {}) {
    this.options = {
      logPath: options.logPath || "./logs",
      sampleInterval: options.sampleInterval || 5e3,
      enableWebDashboard: options.enableWebDashboard || false,
      port: options.port || 45678
    };
    this.logger = new Logger(this.options.logPath);
    this.stats = new Stats();
    this.metrics = {
      apiResponses: /* @__PURE__ */ new Map(),
      memoryUsage: [],
      cpuUsage: [],
      eventLoopDelay: []
    };
    this.initializeObservers();
    this.startMonitoring();
  }
  initializeObservers() {
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.metrics.apiResponses.set(entry.name, entry.duration);
        this.logger.log("api", {
          route: entry.name,
          duration: entry.duration,
          timestamp: Date.now()
        });
      });
    });
    obs.observe({ entryTypes: ["measure"], buffered: true });
  }
  middleware() {
    return (req, res, next) => {
      const route = `${req.method} ${req.path}`;
      const start = performance2.now();
      res.on("finish", () => {
        const duration = performance2.now() - start;
        performance2.measure(route, { start, duration });
      });
      next();
    };
  }
  async startMonitoring() {
    setInterval(async () => {
      try {
        const stats = await this.stats.collect();
        this.metrics.memoryUsage.push(stats.memory);
        this.metrics.cpuUsage.push(stats.cpu);
        this.metrics.eventLoopDelay.push(stats.eventLoopDelay);
        this.logger.log("system", stats);
        if (this.metrics.memoryUsage.length > 720) {
          this.metrics.memoryUsage.shift();
          this.metrics.cpuUsage.shift();
          this.metrics.eventLoopDelay.shift();
        }
      } catch (error) {
        console.error("Error collecting metrics:", error);
      }
    }, this.options.sampleInterval);
    if (this.options.enableWebDashboard) {
      this.startWebDashboard();
    }
  }
  startWebDashboard() {
    const express = __require("express");
    const app = express();
    app.get("/profiler/stats", (req, res) => {
      res.json({
        metrics: this.metrics,
        currentStats: this.stats.getLatest()
      });
    });
    app.listen(this.options.port, () => {
      console.log(`Profiler dashboard available at http://localhost:${this.options.port}/profiler/stats`);
    });
  }
  getMetrics() {
    return {
      metrics: this.metrics,
      currentStats: this.stats.getLatest()
    };
  }
};
export {
  BodhiProfiler
};
