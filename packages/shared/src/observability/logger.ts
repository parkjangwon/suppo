export interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

class Logger {
  private isDev = process.env.NODE_ENV !== "production";

  private formatMessage(
    level: string,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (this.isDev) {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    }

    return JSON.stringify(logEntry);
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage("info", message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("warn", message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    console.error(
      this.formatMessage("error", message, {
        ...context,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
      })
    );
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDev) {
      console.debug(this.formatMessage("debug", message, context));
    }
  }
}

export const logger = new Logger();
