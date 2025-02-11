import express from 'express';
import { ProfilerOptions, ProfilerStats, LoggingConfig, MetricsConfig } from './types';
import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import pidusage from 'pidusage';
import os from 'os';

export class BodhiProfiler {
    private options: ProfilerOptions;
    private logger: winston.Logger;
    private stats: ProfilerStats;
    private startTime: number;

    constructor(options: ProfilerOptions = {}) {
        this.options = {
            serviceName: 'app',
            enableWebDashboard: true,
            port: 45678,
            logPath: './logs/profiler',
            sampleInterval: 5000,
            logging: {
                console: false,
                file: true,
                format: 'json',
                rotation: {
                    maxFiles: '7d',
                    maxSize: '5m',
                    datePattern: 'YYYY-MM-DD',
                    compress: true
                },
                cleanup: {
                    enabled: true,
                    maxAge: '30d'
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
                        threshold: 1000
                    },
                    errorRate: true,
                    throughput: {
                        enabled: true,
                        interval: '1m'
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

    private setupLogger() {
        const logDir = this.options.logPath!;
        const archiveDir = path.join(path.dirname(logDir), 'archive');

        // Ensure directories exist
        [logDir, archiveDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        const formats = [
            winston.format.timestamp(),
            winston.format.json()
        ];

        const transports: winston.transport[] = [];

        if (this.options.logging?.file) {
            transports.push(
                new winston.transports.DailyRotateFile({
                    dirname: logDir,
                    filename: 'profiler-%DATE%.log',
                    datePattern: this.options.logging.rotation?.datePattern || 'YYYY-MM-DD',
                    maxSize: this.options.logging.rotation?.maxSize || '5m',
                    maxFiles: this.options.logging.rotation?.maxFiles || '7d',
                    zippedArchive: this.options.logging.rotation?.compress || true
                })
            );
        }

        if (this.options.logging?.console) {
            transports.push(new winston.transports.Console());
        }

        this.logger = winston.createLogger({
            format: winston.format.combine(...formats),
            transports
        });
    }

    private shouldLogMetric(type: keyof MetricsConfig, value: number): boolean {
        const config = this.options.metrics?.[type] as any;
        if (!config?.enabled) return false;
        return value >= (config.threshold || 0);
    }

    private async collectMetrics() {
        try {
            const stats = await pidusage(process.pid);
            const heapStats = process.memoryUsage();
            
            const currentStats: ProfilerStats = {
                timestamp: Date.now(),
                cpu: {
                    usage: stats.cpu,
                    system: stats.cpu * 0.3, // Estimated
                    user: stats.cpu * 0.7    // Estimated
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

            // Only log if thresholds are exceeded
            if (this.shouldLogMetric('cpu', currentStats.cpu.usage) ||
                this.shouldLogMetric('memory', (currentStats.memory.used / currentStats.memory.total) * 100) ||
                this.shouldLogMetric('eventLoop', currentStats.eventLoop.latency)) {
                this.logger.info('metrics', currentStats);
            }

            this.stats = currentStats;
        } catch (error) {
            this.logger.error('Error collecting metrics:', error);
        }
    }

    public cleanupLogs() {
        if (!this.options.logging?.cleanup?.enabled) return;

        const archiveDir = path.join(path.dirname(this.options.logPath!), 'archive');
        if (!fs.existsSync(archiveDir)) return;

        const maxAge = this.options.logging.cleanup.maxAge || '30d';
        const maxAgeMs = this.parseTimeString(maxAge);
        const now = Date.now();

        fs.readdirSync(archiveDir)
            .forEach(file => {
                const filePath = path.join(archiveDir, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > maxAgeMs) {
                    fs.unlinkSync(filePath);
                }
            });
    }

    private parseTimeString(time: string): number {
        const unit = time.slice(-1);
        const value = parseInt(time.slice(0, -1));
        switch (unit) {
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'm': return value * 60 * 1000;
            case 's': return value * 1000;
            default: return value;
        }
    }

    private initializeStats(): ProfilerStats {
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

    private startMetricsCollection() {
        setInterval(() => {
            this.collectMetrics();
        }, this.options.sampleInterval);
    }

    private setupDashboard() {
        const app = express();

        app.get('/profiler/stats', (req, res) => {
            res.json(this.stats);
        });

        app.listen(this.options.port, () => {
            console.log(`Profiler dashboard available at http://localhost:${this.options.port}/profiler/stats`);
        });
    }

    private getEventLoopLag(): number {
        // This method is not implemented in the provided code
        // You need to implement it according to your requirements
        return 0;
    }

    public middleware() {
        return (req: any, res: any, next: any) => {
            const start = Date.now();
            const route = `${req.method} ${req.path}`;

            // Add response finish handler
            res.on('finish', () => {
                const duration = Date.now() - start;
                
                // Only log if threshold is exceeded
                if (this.options.metrics?.api?.responseTime?.threshold &&
                    duration >= this.options.metrics.api.responseTime.threshold) {
                    this.logger.info('api-response', {
                        route,
                        duration,
                        status: res.statusCode,
                        method: req.method
                    });
                }

                // Update stats
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
}

export * from './types';
