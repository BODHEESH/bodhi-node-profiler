import pidusage from 'pidusage';
import { performance } from 'perf_hooks';
import { SystemStats, CpuMetrics, MemoryMetrics } from './types';
import os from 'os';

export class Stats {
  private latestStats: SystemStats;
  private eventLoopLag: number;
  private lastCpuUsage: { user: number; system: number };
  private lastCpuCheck: number;

  constructor() {
    this.eventLoopLag = 0;
    this.lastCpuCheck = Date.now();
    this.lastCpuUsage = process.cpuUsage();
    this.latestStats = {
      timestamp: Date.now(),
      cpu: {
        percentage: '0',
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

  private startEventLoopMonitoring(): void {
    let lastCheck = performance.now();
    
    setInterval(() => {
      const now = performance.now();
      const delta = now - lastCheck;
      this.eventLoopLag = Math.max(0, delta - 1);
      lastCheck = now;
    }, 1);
  }

  private calculateCpuUsage(): CpuMetrics {
    const now = Date.now();
    const currentCpuUsage = process.cpuUsage();
    const userDiff = currentCpuUsage.user - this.lastCpuUsage.user;
    const systemDiff = currentCpuUsage.system - this.lastCpuUsage.system;
    const timeDiff = now - this.lastCpuCheck;

    this.lastCpuUsage = currentCpuUsage;
    this.lastCpuCheck = now;

    const totalUsage = (userDiff + systemDiff) / 1000; // Convert to ms
    const percentage = ((totalUsage / (timeDiff * os.cpus().length)) * 100).toFixed(1);

    return {
      percentage,
      system: systemDiff / 1000000, // Convert to seconds
      user: userDiff / 1000000
    };
  }

  public async collect(): Promise<SystemStats> {
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
      console.error('Error collecting stats:', error);
      throw error;
    }
  }

  public getLatest(): SystemStats {
    return this.latestStats;
  }
}
