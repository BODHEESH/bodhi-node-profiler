// src/index.ts
import express from "express";
import winston from "winston";
import "winston-daily-rotate-file";
import path from "path";
import fs from "fs";
import pidusage from "pidusage";
import os from "os";
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
    const archiveDir = path.join(path.dirname(logDir), "archive");
    [logDir, archiveDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    const formats = [
      winston.format.timestamp(),
      winston.format.json()
    ];
    const transports = [];
    if ((_a = this.options.logging) == null ? void 0 : _a.file) {
      transports.push(
        new winston.transports.DailyRotateFile({
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
      transports.push(new winston.transports.Console());
    }
    this.logger = winston.createLogger({
      format: winston.format.combine(...formats),
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
      const stats = await pidusage(process.pid);
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
          total: os.totalmem(),
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
    const archiveDir = path.join(path.dirname(this.options.logPath), "archive");
    if (!fs.existsSync(archiveDir)) return;
    const maxAge = this.options.logging.cleanup.maxAge || "30d";
    const maxAgeMs = this.parseTimeString(maxAge);
    const now = Date.now();
    fs.readdirSync(archiveDir).forEach((file) => {
      const filePath = path.join(archiveDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
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
    const app = express();
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
export {
  BodhiProfiler
};
