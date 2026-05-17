// NotifyService - שירות הודעות מבוסס על תבנית Observer (Pub/Sub)
// הרעיון: השירות לא יודע איך ההתראות מוצגות - הוא רק שולח אירועים.
// הרכיב NotifyToast נרשם כמנוי ואחראי על הצגת ה-Toast.
// יתרון: אפשר להחליף את אופן התצוגה בלי לשנות את הקוד שמשתמש בשירות
import Logger from './LoggerService';

export const NotifyType = {
  SUCCESS: 'success',
  ERROR:   'danger',   // Bootstrap מכנה אדום כ-danger
  WARNING: 'warning',
  INFO:    'info',
};

class NotifyService {
  constructor() {
    if (NotifyService._instance) return NotifyService._instance;
    this._listeners = []; // רשימת הפונקציות שנרשמו להאזנה
    NotifyService._instance = this;
  }

  // מחזיר פונקציית ביטול הרשמה - מאפשר ניקוי נכון ב-useEffect של React
  subscribe(listener) {
    this._listeners.push(listener);
    return () => { this._listeners = this._listeners.filter(l => l !== listener); };
  }

  // שולח את ההודעה לכל הרשומים
  _emit(notification) {
    this._listeners.forEach(l => l(notification));
  }

  show(message, type = NotifyType.INFO, duration = 3000) {
    // id ייחודי מבוסס זמן - מאפשר מחיקה של toast ספציפי
    const notification = { id: Date.now(), message, type, duration };
    Logger.info(`Notify: ${message}`, { type });
    this._emit(notification);
  }

  // מתודות נוחות - עוטפות show עם סוג ומשך ברירת מחדל מתאים
  success(msg, duration = 3000) { this.show(msg, NotifyType.SUCCESS, duration); }
  error(msg,   duration = 4000) { this.show(msg, NotifyType.ERROR,   duration); } // שגיאות נשארות קצת יותר
  warning(msg, duration = 3500) { this.show(msg, NotifyType.WARNING, duration); }
  info(msg,    duration = 3000) { this.show(msg, NotifyType.INFO,    duration); }
}

export default new NotifyService();
