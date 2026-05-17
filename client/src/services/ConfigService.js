class ConfigService {
  constructor() {
    if (ConfigService._instance) return ConfigService._instance;
    this._config = {
      appName: 'E-Test System',
      apiDelay: 400,
      logLevel: 'DEBUG',
      exam: {
        defaultDuration: 30,
        passingScore: 60,
        maxQuestions: 50,
      },
      storage: {
        prefix: 'etest_',
      },
    };
    ConfigService._instance = this;
  }

  get(key) {
    return key.split('.').reduce((obj, k) => obj?.[k], this._config);
  }

  set(key, value) {
    const keys = key.split('.');
    const last = keys.pop();
    const target = keys.reduce((obj, k) => obj[k], this._config);
    if (target) target[last] = value;
  }

  getAll() {
    return structuredClone(this._config);
  }
}

export default new ConfigService();
