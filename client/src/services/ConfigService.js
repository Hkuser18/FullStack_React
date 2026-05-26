// ConfigService - שירות הגדרות מרכזי לכל האפליקציה
// משתמשים בדפוס Singleton כדי שתמיד יהיה מופע אחד בלבד - כך כל הרכיבים
// רואים את אותן הגדרות ואין סתירות בין ערכים שונים
class ConfigService {
  constructor() {
    // אם כבר נוצר מופע - מחזירים אותו ולא יוצרים חדש
    if (ConfigService._instance) return ConfigService._instance;
    this._config = {
      appName: 'E-Test System',
      apiDelay: 400,        // עיכוב מלאכותי במילישניות - מדמה קריאת API אמיתית
      logLevel: 'DEBUG',    // בסביבת פיתוח רוצים לראות הכל, בייצור נעלה ל-WARN
      exam: {
        defaultDuration: 30, // זמן ברירת מחדל למבחן בדקות
        passingScore: 60,    // ציון עובר ברירת מחדל באחוזים
        maxQuestions: 50,
      },
      storage: {
        prefix: 'etest_',  // קידומת לכל מפתחות localStorage - מונע התנגשות עם אפליקציות אחרות
      },
    };
    ConfigService._instance = this;
  }

  // גישה להגדרה לפי מסלול עם נקודות - לדוגמה: get('exam.defaultDuration')
  get(key) {
    return key.split('.').reduce((obj, k) => obj?.[k], this._config);
  }

  // עדכון הגדרה לפי מסלול - שינוי בזמן ריצה ללא אתחול מחדש
  set(key, value) {
    const keys = key.split('.');
    const last = keys.pop();
    const target = keys.reduce((obj, k) => obj[k], this._config);
    if (target) target[last] = value;
  }

  // מחזיר עותק עמוק של כל ההגדרות - כדי שלא ישנו את האובייקט המקורי
  getAll() {
    return structuredClone(this._config);
  }
}

export default new ConfigService();
