import winston from 'winston';
import { format } from 'winston';

export class Logger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ],
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple()
        ),
      }));
    }
  }

  public info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  public error(message: string, error?: any) {
    this.logger.error(message, { error });
  }

  public warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  public debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }
}