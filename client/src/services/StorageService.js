// StorageService - שכבת הפשטה מעל localStorage של הדפדפן
// הסיבה: localStorage שומר רק מחרוזות, אז בלי שכבה כזו צריך JSON.parse/JSON.stringify
// בכל מקום בקוד. בנוסף, הקידומת מבטיחה שנתוני האפליקציה לא מתערבבים עם
// נתונים של אפליקציות אחרות באותו הדומיין
import ConfigService from './ConfigService';
import Logger from './LoggerService';

class StorageService {
  constructor() {
    if (StorageService._instance) return StorageService._instance;
    this._prefix = ConfigService.get('storage.prefix');
    StorageService._instance = this;
  }

  // מוסיף קידומת לכל מפתח כדי ליצור מרחב שמות משלנו
  _key(key) { return `${this._prefix}${key}`; }

  // שומר ערך כ-JSON - תומך בכל סוג נתון (מערך, אובייקט, מספר...)
  set(key, value) {
    try {
      localStorage.setItem(this._key(key), JSON.stringify(value));
      Logger.debug('StorageService.set', { key });
    } catch (e) {
      // יכול לקרות אם המשתמש חסם localStorage או אם אין מקום
      Logger.error('StorageService.set failed', { key, error: e.message });
    }
  }

  // שולף ערך ומפענח JSON - מחזיר fallback אם המפתח לא קיים
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._key(key));
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      Logger.error('StorageService.get failed', { key, error: e.message });
      return fallback;
    }
  }

  remove(key) {
    localStorage.removeItem(this._key(key));
    Logger.debug('StorageService.remove', { key });
  }

  has(key) {
    return localStorage.getItem(this._key(key)) !== null;
  }

  // מוחק רק את המפתחות של האפליקציה - לא פוגע בנתונים של אחרים
  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this._prefix))
      .forEach(k => localStorage.removeItem(k));
    Logger.info('StorageService.clear: all app keys removed');
  }
}

export default new StorageService();
