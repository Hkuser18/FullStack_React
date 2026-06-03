import Storage from './StorageService';

vi.mock('./LoggerService', () => ({
  default: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe('StorageService', () => {
  beforeEach(() => localStorage.clear());

  test('set and get round-trip an object', () => {
    Storage.set('user', { name: 'Alice', role: 'student' });
    expect(Storage.get('user')).toEqual({ name: 'Alice', role: 'student' });
  });

  test('set and get round-trip a primitive', () => {
    Storage.set('count', 42);
    expect(Storage.get('count')).toBe(42);
  });

  test('get returns null by default when key is missing', () => {
    expect(Storage.get('missing')).toBeNull();
  });

  test('get returns the provided fallback when key is missing', () => {
    expect(Storage.get('missing', 'default')).toBe('default');
  });

  test('remove deletes a stored key', () => {
    Storage.set('toDelete', 'value');
    Storage.remove('toDelete');
    expect(Storage.get('toDelete')).toBeNull();
  });

  test('has returns true for an existing key', () => {
    Storage.set('present', true);
    expect(Storage.has('present')).toBe(true);
  });

  test('has returns false for a missing key', () => {
    expect(Storage.has('absent')).toBe(false);
  });

  test('clear removes all app-prefixed keys', () => {
    Storage.set('key1', 'a');
    Storage.set('key2', 'b');
    Storage.clear();
    expect(Storage.has('key1')).toBe(false);
    expect(Storage.has('key2')).toBe(false);
  });

  test('clear does not remove keys belonging to other apps', () => {
    localStorage.setItem('other_app_key', 'untouched');
    Storage.set('mykey', 'val');
    Storage.clear();
    expect(localStorage.getItem('other_app_key')).toBe('untouched');
  });
});
