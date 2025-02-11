import { Request, Response, NextFunction } from 'express';

export interface ProfilerOptions {
  logPath?: string;
  sampleInterval?: number;
  enableWebDashboard?: boolean;
  port?: number;
}

export interface MetricsData {
  apiResponses: Map<string, number>;
  memoryUsage: MemoryMetrics[];
  cpuUsage: CpuMetrics[];
  eventLoopDelay: number[];
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
}

export interface CpuMetrics {
  percentage: string;
  system: number;
  user: number;
}

export interface ProfilerStats {
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

export default BodhiProfiler;
