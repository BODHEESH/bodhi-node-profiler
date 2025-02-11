import { performance, PerformanceObserver } from 'perf_hooks';
import { Request, Response, NextFunction } from 'express';
import pidusage from 'pidusage';
import { Logger } from './logger';
import { Stats } from './stats';
import { ProfilerOptions, MetricsData, ProfilerStats } from './types';

export class BodhiProfiler {
  private options: Required<ProfilerOptions>;
  private logger: Logger;
  private stats: Stats;
  private metrics: MetricsData;

  constructor(options: ProfilerOptions = {}) {
    this.options = {
      logPath: options.logPath || './logs',
      sampleInterval: options.sampleInterval || 5000,
      enableWebDashboard: options.enableWebDashboard || false,
      port: options.port || 45678
    };

    this.logger = new Logger(this.options.logPath);
    this.stats = new Stats();
    this.metrics = {
      apiResponses: new Map(),
      memoryUsage: [],
      cpuUsage: [],
      eventLoopDelay: []
    };

    this.initializeObservers();
    this.startMonitoring();
  }

  private initializeObservers(): void {
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.metrics.apiResponses.set(entry.name, entry.duration);
        this.logger.log('api', {
          route: entry.name,
          duration: entry.duration,
          timestamp: Date.now()
        });
      });
    });
    obs.observe({ entryTypes: ['measure'], buffered: true });
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const route = `${req.method} ${req.path}`;
      const start = performance.now();

      res.on('finish', () => {
        const duration = performance.now() - start;
        performance.measure(route, { start, duration });
      });

      next();
    };
  }

  private async startMonitoring(): Promise<void> {
    setInterval(async () => {
      try {
        const stats = await this.stats.collect();
        this.metrics.memoryUsage.push(stats.memory);
        this.metrics.cpuUsage.push(stats.cpu);
        this.metrics.eventLoopDelay.push(stats.eventLoopDelay);

        this.logger.log('system', stats);

        // Keep only last hour of metrics
        if (this.metrics.memoryUsage.length > 720) {
          this.metrics.memoryUsage.shift();
          this.metrics.cpuUsage.shift();
          this.metrics.eventLoopDelay.shift();
        }
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    }, this.options.sampleInterval);

    if (this.options.enableWebDashboard) {
      this.startWebDashboard();
    }
  }

  private startWebDashboard(): void {
    const express = require('express');
    const app = express();

    app.get('/profiler/stats', (req: Request, res: Response) => {
      res.json({
        metrics: this.metrics,
        currentStats: this.stats.getLatest()
      });
    });

    app.listen(this.options.port, () => {
      console.log(`Profiler dashboard available at http://localhost:${this.options.port}/profiler/stats`);
    });
  }

  public getMetrics(): ProfilerStats {
    return {
      metrics: this.metrics,
      currentStats: this.stats.getLatest()
    };
  }
}

export * from './types';
