

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabledInProduction: boolean;
  enabledForAdmins: boolean;
  minLevel: LogLevel;
}

class Logger {
  private config: LoggerConfig = {
    enabledInProduction: false,
    enabledForAdmins: true,
    minLevel: 'info',
  };

  private isAdmin: boolean = false;
  private isDevelopment: boolean = __DEV__;

  setIsAdmin(isAdmin: boolean) {
    this.isAdmin = isAdmin;
  }

  setConfig(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
  }

  private shouldLog(): boolean {
    if (this.isDevelopment) {
      return true;
    }

    if (this.config.enabledForAdmins && this.isAdmin) {
      return true;
    }

    return this.config.enabledInProduction;
  }

  private formatMessage(level: LogLevel, tag: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}`;
    
    if (data !== undefined) {
      try {
        formatted += ` ${JSON.stringify(data, null, 2)}`;
      } catch {
        formatted += ` [Circular or non-serializable data]`;
      }
    }
    
    return formatted;
  }

  debug(tag: string, message: string, data?: any) {
    if (!this.shouldLog()) return;
    
    const formatted = this.formatMessage('debug', tag, message, data);
    console.debug(formatted);
  }

  info(tag: string, message: string, data?: any) {
    if (!this.shouldLog()) return;
    
    const formatted = this.formatMessage('info', tag, message, data);
    console.log(formatted);
  }

  warn(tag: string, message: string, data?: any) {
    if (!this.shouldLog()) return;
    
    const formatted = this.formatMessage('warn', tag, message, data);
    console.warn(formatted);
  }

  error(tag: string, message: string, error?: any) {
    if (!this.shouldLog()) return;
    
    const formatted = this.formatMessage('error', tag, message, error);
    console.error(formatted);
    
    if (error?.stack) {
      console.error(error.stack);
    }
  }

  logAPICall(tag: string, method: string, endpoint: string, data?: any) {
    if (!this.shouldLog()) return;
    
    this.info(tag, `API ${method} ${endpoint}`, data);
  }

  logAPIResponse(tag: string, endpoint: string, response: any) {
    if (!this.shouldLog()) return;
    
    this.info(tag, `API Response ${endpoint}`, response);
  }

  logAPIError(tag: string, endpoint: string, error: any) {
    if (!this.shouldLog()) return;
    
    this.error(tag, `API Error ${endpoint}`, error);
  }
}

export const logger = new Logger();

export const devLog = {
  debug: (tag: string, message: string, data?: any) => logger.debug(tag, message, data),
  info: (tag: string, message: string, data?: any) => logger.info(tag, message, data),
  warn: (tag: string, message: string, data?: any) => logger.warn(tag, message, data),
  error: (tag: string, message: string, error?: any) => logger.error(tag, message, error),
};

export default logger;
