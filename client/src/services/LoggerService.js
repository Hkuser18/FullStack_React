import ConfigService from './ConfigService';

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

class LoggerService {
  constructor() {
    if (LoggerService._instance) return LoggerService._instance;
    this._history = [];
    LoggerService._instance = this;
  }

  _shouldLog(level) {
    const configured = ConfigService.get('logLevel') || 'INFO';
    return LEVELS[level] >= (LEVELS[configured] ?? 1);
  }

  _log(level, message, data) {
    if (!this._shouldLog(level)) return;
    const entry = { timestamp: new Date().toISOString(), level, message, data };
    this._history.push(entry);
    const tag = `[${entry.timestamp}] [${level}]`;
    if (level === 'ERROR') console.error(tag, message, data ?? '');
    else if (level === 'WARN')  console.warn(tag, message, data ?? '');
    else                        console.log(tag, message, data ?? '');
  }

  debug(msg, data) { this._log('DEBUG', msg, data); }
  info(msg, data)  { this._log('INFO',  msg, data); }
  warn(msg, data)  { this._log('WARN',  msg, data); }
  error(msg, data) { this._log('ERROR', msg, data); }

  getHistory()  { return [...this._history]; }
  clearHistory() { this._history = []; }
}

export default new LoggerService();
