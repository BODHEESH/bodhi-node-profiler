import { Request, Response, NextFunction } from 'express';

interface ProfilerOptions {
  logPath?: string;
  sampleInterval?: number;
  enableWebDashboard?: boolean;
  port?: number;
}

interface MetricsData {
  apiResponses: Map<string, number>;
  memoryUsage: MemoryMetrics[];
  cpuUsage: CpuMetrics[];
  eventLoopDelay: number[];
}

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
}

interface CpuMetrics {
  percentage: string;
  system: number;
  user: number;
}

interface ProfilerStats {
  metrics: MetricsData;
  currentStats: {
    timestamp: number;
    cpu: CpuMetrics;
    memory: MemoryMetrics;
    eventLoopDelay: number;
  };
}

declare class BodhiProfiler {
  constructor(options?: ProfilerOptions);
  
  middleware(): (req: Request, res: Response, next: NextFunction) => void;
  
  getMetrics(): ProfilerStats;
  
  startMonitoring(): void;
  
  startWebDashboard(): void;
}

export { type CpuMetrics, type MemoryMetrics, type MetricsData, type ProfilerOptions, type ProfilerStats, BodhiProfiler as default };
