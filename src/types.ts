export interface ProfilerOptions {
  logPath?: string;
  sampleInterval?: number;
  enableWebDashboard?: boolean;
  port?: number;
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

export interface SystemStats {
  timestamp: number;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  eventLoopDelay: number;
}

export interface MetricsData {
  apiResponses: Map<string, number>;
  memoryUsage: MemoryMetrics[];
  cpuUsage: CpuMetrics[];
  eventLoopDelay: number[];
}

export interface ProfilerStats {
  metrics: MetricsData;
  currentStats: SystemStats;
}
