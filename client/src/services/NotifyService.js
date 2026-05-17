import Logger from './LoggerService';

export const NotifyType = {
  SUCCESS: 'success',
  ERROR:   'danger',
  WARNING: 'warning',
  INFO:    'info',
};

class NotifyService {
  constructor() {
    if (NotifyService._instance) return NotifyService._instance;
    this._listeners = [];
    NotifyService._instance = this;
  }

  subscribe(listener) {
    this._listeners.push(listener);
    return () => { this._listeners = this._listeners.filter(l => l !== listener); };
  }

  _emit(notification) {
    this._listeners.forEach(l => l(notification));
  }

  show(message, type = NotifyType.INFO, duration = 3000) {
    const notification = { id: Date.now(), message, type, duration };
    Logger.info(`Notify: ${message}`, { type });
    this._emit(notification);
  }

  success(msg, duration = 3000) { this.show(msg, NotifyType.SUCCESS, duration); }
  error(msg,   duration = 4000) { this.show(msg, NotifyType.ERROR,   duration); }
  warning(msg, duration = 3500) { this.show(msg, NotifyType.WARNING, duration); }
  info(msg,    duration = 3000) { this.show(msg, NotifyType.INFO,    duration); }
}

export default new NotifyService();
