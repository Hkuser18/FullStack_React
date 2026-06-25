import Logger from './LoggerService';

describe('LoggerService', () => {
  beforeEach(() => {
    Logger.clearHistory();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  test('info writes to console.log and stores in history', () => {
    Logger.info('hello');
    expect(console.log).toHaveBeenCalled();
    expect(Logger.getHistory()).toHaveLength(1);
    expect(Logger.getHistory()[0].level).toBe('INFO');
    expect(Logger.getHistory()[0].message).toBe('hello');
  });

  test('warn writes to console.warn', () => {
    Logger.warn('careful');
    expect(console.warn).toHaveBeenCalled();
    expect(Logger.getHistory()[0].level).toBe('WARN');
  });

  test('error writes to console.error', () => {
    Logger.error('broken');
    expect(console.error).toHaveBeenCalled();
    expect(Logger.getHistory()[0].level).toBe('ERROR');
  });

  test('debug writes to console.log when logLevel is DEBUG', () => {
    Logger.debug('trace');
    expect(console.log).toHaveBeenCalled();
    expect(Logger.getHistory()[0].level).toBe('DEBUG');
  });

  test('each history entry has timestamp, level, message, and data fields', () => {
    Logger.info('structured', { key: 'val' });
    const entry = Logger.getHistory()[0];
    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('level', 'INFO');
    expect(entry).toHaveProperty('message', 'structured');
    expect(entry).toHaveProperty('data', { key: 'val' });
  });

  test('getHistory returns a new array copy each call', () => {
    Logger.info('msg');
    expect(Logger.getHistory()).not.toBe(Logger.getHistory());
  });

  test('clearHistory empties the history', () => {
    Logger.info('a');
    Logger.info('b');
    Logger.clearHistory();
    expect(Logger.getHistory()).toHaveLength(0);
  });

  test('multiple calls accumulate in history', () => {
    Logger.info('first');
    Logger.warn('second');
    Logger.error('third');
    expect(Logger.getHistory()).toHaveLength(3);
  });
});
