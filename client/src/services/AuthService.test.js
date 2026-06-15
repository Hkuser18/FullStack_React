import Auth from './AuthService';
import Api from '../api';
import Storage from './StorageService';

vi.mock('../api', () => ({
  default: { login: vi.fn(), addUser: vi.fn() },
}));
vi.mock('./StorageService', () => ({
  default: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
}));
vi.mock('./LoggerService', () => ({
  default: { info: vi.fn(), warn: vi.fn() },
}));

const safeUser = { id: 'u1', name: 'Alice', role: 'student', username: 'alice' };

describe('AuthService', () => {
  beforeEach(() => vi.clearAllMocks());

  test('login returns a session object on valid credentials', async () => {
    Api.login.mockResolvedValue(safeUser);
    const result = await Auth.login('alice', 'pass', 'student');
    expect(result).toEqual({ id: 'u1', name: 'Alice', role: 'student' });
  });

  test('login strips username from the returned session', async () => {
    Api.login.mockResolvedValue(safeUser);
    const result = await Auth.login('alice', 'pass', 'student');
    expect(result).not.toHaveProperty('username');
  });

  test('login persists the session to storage', async () => {
    Api.login.mockResolvedValue(safeUser);
    await Auth.login('alice', 'pass', 'student');
    expect(Storage.set).toHaveBeenCalledWith(
      'auth_session',
      { id: 'u1', name: 'Alice', role: 'student' }
    );
  });

  test('login throws on invalid credentials', async () => {
    Api.login.mockRejectedValue(new Error('Invalid credentials'));
    await expect(Auth.login('bad', 'bad', 'student')).rejects.toThrow('Invalid credentials');
  });

  test('login does not persist session on failure', async () => {
    Api.login.mockRejectedValue(new Error('Invalid credentials'));
    await Auth.login('bad', 'bad', 'student').catch(() => {});
    expect(Storage.set).not.toHaveBeenCalled();
  });

  test('logout removes the session from storage', () => {
    Auth.logout();
    expect(Storage.remove).toHaveBeenCalledWith('auth_session');
  });

  test('getCurrentUser reads from storage', () => {
    Storage.get.mockReturnValue({ id: 'u1', name: 'Alice', role: 'student' });
    expect(Auth.getCurrentUser()).toEqual({ id: 'u1', name: 'Alice', role: 'student' });
  });

  test('getCurrentUser returns null when no session exists', () => {
    Storage.get.mockReturnValue(null);
    expect(Auth.getCurrentUser()).toBeNull();
  });

  test('register calls Api.addUser and returns the new user', async () => {
    Api.addUser.mockResolvedValue({ id: 'u_new', name: 'Bob' });
    const user = await Auth.register({ username: 'bob', password: '1234', role: 'student', name: 'Bob' });
    expect(Api.addUser).toHaveBeenCalledWith({ username: 'bob', password: '1234', role: 'student', name: 'Bob' });
    expect(user).toEqual({ id: 'u_new', name: 'Bob' });
  });
});
