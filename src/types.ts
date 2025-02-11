export interface LogRotationConfig {
    maxFiles?: string | number;    // e.g., '7d' or number of files
    maxSize?: string;             // e.g., '5m'
    datePattern?: string;         // e.g., 'YYYY-MM-DD'
    archiveFolder?: string;       // Path to archive folder
    compress?: boolean;           // Whether to compress old logs
}

export interface LogCleanupConfig {
    enabled?: boolean;
    maxAge?: string;              // e.g., '30d'
}

export interface MetricThresholdConfig {
    enabled?: boolean;
    threshold?: number;
}

export interface ApiMetricsConfig {
    responseTime?: MetricThresholdConfig & { enabled?: boolean; threshold?: number };
    errorRate?: boolean;
    throughput?: { enabled?: boolean; interval?: string };
}

export interface MetricsConfig {
    cpu?: MetricThresholdConfig;
    memory?: MetricThresholdConfig;
    eventLoop?: MetricThresholdConfig;
    api?: ApiMetricsConfig;
}

export interface LoggingConfig {
    console?: boolean;
    file?: boolean;
    format?: 'json' | 'text';
    rotation?: LogRotationConfig;
    cleanup?: LogCleanupConfig;
}

export interface ProfilerOptions {
    serviceName?: string;
    enableWebDashboard?: boolean;
    port?: number;
    logPath?: string;
    sampleInterval?: number;
    logging?: LoggingConfig;
    metrics?: MetricsConfig;
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

export interface ProfilerStats {
    timestamp: number;
    cpu: {
        usage: number;
        system: number;
        user: number;
    };
    memory: {
        used: number;
        total: number;
        rss: number;
        heapUsed: number;
        heapTotal: number;
    };
    eventLoop: {
        latency: number;
        lag: number;
    };
    api?: {
        responseTime: number;
        errorRate: number;
        requestsPerSecond: number;
    };
}
