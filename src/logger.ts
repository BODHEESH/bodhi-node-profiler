import winston from 'winston';
import path from 'path';
import fs from 'fs';

export class Logger {
  private logger!: winston.Logger; // Using definite assignment assertion
  private logPath: string;

  constructor(logPath: string) {
    this.logPath = logPath;
    this.ensureLogDirectory();
    this.initializeLogger();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }

  private initializeLogger(): void {
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(this.logPath, 'error.log'),
          level: 'error'
        }),
        new winston.transports.File({
          filename: path.join(this.logPath, 'profiler.log')
        })
      ]
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }
  }

  public log(type: string, data: Record<string, any>): void {
    this.logger.info({
      type,
      ...data
    });
  }

  public error(type: string, error: Error): void {
    this.logger.error({
      type,
      message: error.message,
      stack: error.stack
    });
  }
}
