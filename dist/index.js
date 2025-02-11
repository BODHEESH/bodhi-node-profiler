"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BodhiProfiler: () => BodhiProfiler
});
module.exports = __toCommonJS(index_exports);
var import_perf_hooks2 = require("perf_hooks");

// src/logger.ts
var import_winston = __toESM(require("winston"));
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var Logger = class {
  constructor(logPath) {
    this.logPath = logPath;
    this.ensureLogDirectory();
    this.initializeLogger();
  }
  ensureLogDirectory() {
    if (!import_fs.default.existsSync(this.logPath)) {
      import_fs.default.mkdirSync(this.logPath, { recursive: true });
    }
  }
  initializeLogger() {
    this.logger = import_winston.default.createLogger({
      format: import_winston.default.format.combine(
        import_winston.default.format.timestamp(),
        import_winston.default.format.json()
      ),
      transports: [
        new import_winston.default.transports.File({
          filename: import_path.default.join(this.logPath, "error.log"),
          level: "error"
        }),
        new import_winston.default.transports.File({
          filename: import_path.default.join(this.logPath, "profiler.log")
        })
      ]
    });
    if (process.env.NODE_ENV !== "production") {
      this.logger.add(new import_winston.default.transports.Console({
        format: import_winston.default.format.simple()
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
var import_perf_hooks = require("perf_hooks");
var import_os = __toESM(require("os"));
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
    let lastCheck = import_perf_hooks.performance.now();
    setInterval(() => {
      const now = import_perf_hooks.performance.now();
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
    const percentage = (totalUsage / (timeDiff * import_os.default.cpus().length) * 100).toFixed(1);
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
    const obs = new import_perf_hooks2.PerformanceObserver((list) => {
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
      const start = import_perf_hooks2.performance.now();
      res.on("finish", () => {
        const duration = import_perf_hooks2.performance.now() - start;
        import_perf_hooks2.performance.measure(route, { start, duration });
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
    const express = require("express");
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BodhiProfiler
});
