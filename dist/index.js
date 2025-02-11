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
var import_express = __toESM(require("express"));
var import_winston = __toESM(require("winston"));
var import_winston_daily_rotate_file = require("winston-daily-rotate-file");
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_pidusage = __toESM(require("pidusage"));
var import_os = __toESM(require("os"));
var BodhiProfiler = class {
  constructor(options = {}) {
    this.options = {
      serviceName: "app",
      enableWebDashboard: true,
      port: 45678,
      logPath: "./logs/profiler",
      sampleInterval: 5e3,
      logging: {
        console: false,
        file: true,
        format: "json",
        rotation: {
          maxFiles: "7d",
          maxSize: "5m",
          datePattern: "YYYY-MM-DD",
          compress: true
        },
        cleanup: {
          enabled: true,
          maxAge: "30d"
        }
      },
      metrics: {
        cpu: {
          enabled: true,
          threshold: 70
        },
        memory: {
          enabled: true,
          threshold: 80
        },
        eventLoop: {
          enabled: true,
          threshold: 100
        },
        api: {
          responseTime: {
            enabled: true,
            threshold: 1e3
          },
          errorRate: true,
          throughput: {
            enabled: true,
            interval: "1m"
          }
        }
      },
      ...options
    };
    this.setupLogger();
    this.startTime = Date.now();
    this.stats = this.initializeStats();
    this.startMetricsCollection();
    if (this.options.enableWebDashboard) {
      this.setupDashboard();
    }
  }
  setupLogger() {
    var _a, _b, _c, _d, _e, _f;
    const logDir = this.options.logPath;
    const archiveDir = import_path.default.join(import_path.default.dirname(logDir), "archive");
    [logDir, archiveDir].forEach((dir) => {
      if (!import_fs.default.existsSync(dir)) {
        import_fs.default.mkdirSync(dir, { recursive: true });
      }
    });
    const formats = [
      import_winston.default.format.timestamp(),
      import_winston.default.format.json()
    ];
    const transports = [];
    if ((_a = this.options.logging) == null ? void 0 : _a.file) {
      transports.push(
        new import_winston.default.transports.DailyRotateFile({
          dirname: logDir,
          filename: "profiler-%DATE%.log",
          datePattern: ((_b = this.options.logging.rotation) == null ? void 0 : _b.datePattern) || "YYYY-MM-DD",
          maxSize: ((_c = this.options.logging.rotation) == null ? void 0 : _c.maxSize) || "5m",
          maxFiles: ((_d = this.options.logging.rotation) == null ? void 0 : _d.maxFiles) || "7d",
          zippedArchive: ((_e = this.options.logging.rotation) == null ? void 0 : _e.compress) || true
        })
      );
    }
    if ((_f = this.options.logging) == null ? void 0 : _f.console) {
      transports.push(new import_winston.default.transports.Console());
    }
    this.logger = import_winston.default.createLogger({
      format: import_winston.default.format.combine(...formats),
      transports
    });
  }
  shouldLogMetric(type, value) {
    var _a;
    const config = (_a = this.options.metrics) == null ? void 0 : _a[type];
    if (!(config == null ? void 0 : config.enabled)) return false;
    return value >= (config.threshold || 0);
  }
  async collectMetrics() {
    try {
      const stats = await (0, import_pidusage.default)(process.pid);
      const heapStats = process.memoryUsage();
      const currentStats = {
        timestamp: Date.now(),
        cpu: {
          usage: stats.cpu,
          system: stats.cpu * 0.3,
          // Estimated
          user: stats.cpu * 0.7
          // Estimated
        },
        memory: {
          used: stats.memory,
          total: import_os.default.totalmem(),
          rss: heapStats.rss,
          heapUsed: heapStats.heapUsed,
          heapTotal: heapStats.heapTotal
        },
        eventLoop: {
          latency: this.getEventLoopLag(),
          lag: this.getEventLoopLag()
        }
      };
      if (this.shouldLogMetric("cpu", currentStats.cpu.usage) || this.shouldLogMetric("memory", currentStats.memory.used / currentStats.memory.total * 100) || this.shouldLogMetric("eventLoop", currentStats.eventLoop.latency)) {
        this.logger.info("metrics", currentStats);
      }
      this.stats = currentStats;
    } catch (error) {
      this.logger.error("Error collecting metrics:", error);
    }
  }
  cleanupLogs() {
    var _a, _b;
    if (!((_b = (_a = this.options.logging) == null ? void 0 : _a.cleanup) == null ? void 0 : _b.enabled)) return;
    const archiveDir = import_path.default.join(import_path.default.dirname(this.options.logPath), "archive");
    if (!import_fs.default.existsSync(archiveDir)) return;
    const maxAge = this.options.logging.cleanup.maxAge || "30d";
    const maxAgeMs = this.parseTimeString(maxAge);
    const now = Date.now();
    import_fs.default.readdirSync(archiveDir).forEach((file) => {
      const filePath = import_path.default.join(archiveDir, file);
      const stats = import_fs.default.statSync(filePath);
      if (now - stats.mtimeMs > maxAgeMs) {
        import_fs.default.unlinkSync(filePath);
      }
    });
  }
  parseTimeString(time) {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1));
    switch (unit) {
      case "d":
        return value * 24 * 60 * 60 * 1e3;
      case "h":
        return value * 60 * 60 * 1e3;
      case "m":
        return value * 60 * 1e3;
      case "s":
        return value * 1e3;
      default:
        return value;
    }
  }
  initializeStats() {
    return {
      timestamp: Date.now(),
      cpu: {
        usage: 0,
        system: 0,
        user: 0
      },
      memory: {
        used: 0,
        total: 0,
        rss: 0,
        heapUsed: 0,
        heapTotal: 0
      },
      eventLoop: {
        latency: 0,
        lag: 0
      }
    };
  }
  startMetricsCollection() {
    setInterval(() => {
      this.collectMetrics();
    }, this.options.sampleInterval);
  }
  setupDashboard() {
    const app = (0, import_express.default)();
    app.get("/profiler/stats", (req, res) => {
      res.json(this.stats);
    });
    app.listen(this.options.port, () => {
      console.log(`Profiler dashboard available at http://localhost:${this.options.port}/profiler/stats`);
    });
  }
  getEventLoopLag() {
    return 0;
  }
  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      const route = `${req.method} ${req.path}`;
      res.on("finish", () => {
        var _a, _b, _c;
        const duration = Date.now() - start;
        if (((_c = (_b = (_a = this.options.metrics) == null ? void 0 : _a.api) == null ? void 0 : _b.responseTime) == null ? void 0 : _c.threshold) && duration >= this.options.metrics.api.responseTime.threshold) {
          this.logger.info("api-response", {
            route,
            duration,
            status: res.statusCode,
            method: req.method
          });
        }
        if (this.stats) {
          this.stats = {
            ...this.stats,
            api: {
              responseTime: duration,
              errorRate: res.statusCode >= 400 ? 1 : 0,
              requestsPerSecond: 1
            }
          };
        }
      });
      next();
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BodhiProfiler
});
