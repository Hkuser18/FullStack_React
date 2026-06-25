import Api                    from '../api';
import { saveToken, clearToken } from '../api/ServerApiService';
import Storage                from './StorageService';
import Logger                 from './LoggerService';

const SESSION_KEY = 'auth_session';

class AuthService {
  async login(username, password, role) {
    const user = await Api.login(username, password, role);
    if (user.token) saveToken(user.token);
    const session = { id: user.id, name: user.name, role: user.role };
    Storage.set(SESSION_KEY, session);
    Logger.info('AuthService.login', { username, role });
    return session;
  }

  register(userData) {
    return Api.addUser(userData).then((user) => {
      Logger.info('AuthService.register', { username: userData.username });
      return user;
    });
  }

  logout() {
    clearToken();
    Storage.remove(SESSION_KEY);
    Logger.info('AuthService.logout');
  }

  getCurrentUser() {
    return Storage.get(SESSION_KEY, null);
  }
}

export default new AuthService();
