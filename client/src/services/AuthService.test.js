import Auth from './AuthService';
import Api from '../api/MockApiService';
import Storage from './StorageService';

vi.mock('../api/MockApiService', () => ({
  default: { findUserForAuth: vi.fn(), addUser: vi.fn() },
}));
vi.mock('./StorageService', () => ({
  default: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
}));
vi.mock('./LoggerService', () => ({
  default: { info: vi.fn() },
}));

const seedUser = { id: 'u1', name: 'Alice', role: 'student', username: 'alice', password: 'pass' };

describe('AuthService', () => {
  beforeEach(() => vi.clearAllMocks());

  test('login returns a user object on valid credentials', () => {
    Api.findUserForAuth.mockReturnValue(seedUser);
    const result = Auth.login('alice', 'pass', 'student');
    expect(result).toEqual({ id: 'u1', name: 'Alice', role: 'student' });
  });

  test('login strips the password from the returned user', () => {
    Api.findUserForAuth.mockReturnValue(seedUser);
    const result = Auth.login('alice', 'pass', 'student');
    expect(result).not.toHaveProperty('password');
  });

  test('login persists the session to storage', () => {
    Api.findUserForAuth.mockReturnValue(seedUser);
    Auth.login('alice', 'pass', 'student');
    expect(Storage.set).toHaveBeenCalledWith(
      'auth_session',
      { id: 'u1', name: 'Alice', role: 'student' }
    );
  });

  test('login returns null for invalid credentials', () => {
    Api.findUserForAuth.mockReturnValue(null);
    expect(Auth.login('bad', 'bad', 'student')).toBeNull();
  });

  test('login does not persist session on failure', () => {
    Api.findUserForAuth.mockReturnValue(null);
    Auth.login('bad', 'bad', 'student');
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
