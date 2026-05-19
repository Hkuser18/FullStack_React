import Config from './ConfigService';

describe('ConfigService', () => {
  test('get returns a top-level value', () => {
    expect(Config.get('appName')).toBe('E-Test System');
  });

  test('get supports dot-notation for nested values', () => {
    expect(Config.get('exam.defaultDuration')).toBe(30);
    expect(Config.get('exam.passingScore')).toBe(60);
    expect(Config.get('storage.prefix')).toBe('etest_');
  });

  test('get returns undefined for an unknown key', () => {
    expect(Config.get('nonexistent')).toBeUndefined();
  });

  test('get returns undefined for an unknown nested key', () => {
    expect(Config.get('exam.nonexistent')).toBeUndefined();
  });

  test('set updates a nested value', () => {
    Config.set('exam.maxQuestions', 100);
    expect(Config.get('exam.maxQuestions')).toBe(100);
    Config.set('exam.maxQuestions', 50); // restore
  });

  test('getAll returns a deep clone — mutating it does not affect the original', () => {
    const all = Config.getAll();
    expect(all.appName).toBe('E-Test System');
    all.appName = 'Mutated';
    expect(Config.get('appName')).toBe('E-Test System');
  });
});
