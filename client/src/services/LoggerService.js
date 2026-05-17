// LoggerService - שירות לוגים מרכזי לאפליקציה
// במקום לפזר console.log בכל הקוד, כל ההדפסות עוברות דרך שירות אחד
// כך אפשר לשלוט על רמת הלוג מנקודה אחת ולשמור היסטוריה של אירועים
import ConfigService from './ConfigService';

// כל רמת לוג מיוצגת כמספר - מאפשר השוואה קלה (ERROR > WARN > INFO > DEBUG)
const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

class LoggerService {
  constructor() {
    if (LoggerService._instance) return LoggerService._instance;
    this._history = []; // שומרים היסטוריה בזיכרון - שימושי לדיבאג
    LoggerService._instance = this;
  }

  // בודק אם צריך להדפיס לפי רמת הלוג שהוגדרה בקונפיגורציה
  _shouldLog(level) {
    const configured = ConfigService.get('logLevel') || 'INFO';
    return LEVELS[level] >= (LEVELS[configured] ?? 1);
  }

  _log(level, message, data) {
    if (!this._shouldLog(level)) return;
    const entry = { timestamp: new Date().toISOString(), level, message, data };
    this._history.push(entry);
    const tag = `[${entry.timestamp}] [${level}]`;
    // כל רמה מופנית לפונקציית console המתאימה - שומר על עיצוב נכון בדפדפן
    if (level === 'ERROR') console.error(tag, message, data ?? '');
    else if (level === 'WARN')  console.warn(tag, message, data ?? '');
    else                        console.log(tag, message, data ?? '');
  }

  debug(msg, data) { this._log('DEBUG', msg, data); }
  info(msg, data)  { this._log('INFO',  msg, data); }
  warn(msg, data)  { this._log('WARN',  msg, data); }
  error(msg, data) { this._log('ERROR', msg, data); }

  getHistory()   { return [...this._history]; }
  clearHistory() { this._history = []; }
}

export default new LoggerService();
