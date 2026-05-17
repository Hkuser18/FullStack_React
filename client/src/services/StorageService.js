import ConfigService from './ConfigService';
import Logger from './LoggerService';

class StorageService {
  constructor() {
    if (StorageService._instance) return StorageService._instance;
    this._prefix = ConfigService.get('storage.prefix');
    StorageService._instance = this;
  }

  _key(key) { return `${this._prefix}${key}`; }

  set(key, value) {
    try {
      localStorage.setItem(this._key(key), JSON.stringify(value));
      Logger.debug('StorageService.set', { key });
    } catch (e) {
      Logger.error('StorageService.set failed', { key, error: e.message });
    }
  }

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

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this._prefix))
      .forEach(k => localStorage.removeItem(k));
    Logger.info('StorageService.clear: all app keys removed');
  }
}

export default new StorageService();
