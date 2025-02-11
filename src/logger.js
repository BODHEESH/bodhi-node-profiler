const winston = require('winston');
const path = require('path');
const fs = require('fs');

class Logger {
  constructor(logPath) {
    this.logPath = logPath;
    this.ensureLogDirectory();
    this.initializeLogger();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }

  initializeLogger() {
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

    // Add console output in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }
  }

  log(type, data) {
    this.logger.info({
      type,
      ...data
    });
  }

  error(type, error) {
    this.logger.error({
      type,
      message: error.message,
      stack: error.stack
    });
  }
}

module.exports = Logger;
