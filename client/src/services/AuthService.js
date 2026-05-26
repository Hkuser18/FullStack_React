import Api     from '../api/MockApiService';
import Storage  from './StorageService';
import Logger   from './LoggerService';

const SESSION_KEY = 'auth_session';

class AuthService {
  login(username, password, role) {
    const match = Api.findUserForAuth(username, password, role);
    if (!match) return null;
    const user = { id: match.id, name: match.name, role: match.role };
    Storage.set(SESSION_KEY, user);
    Logger.info('AuthService.login', { username, role });
    return user;
  }

  register(userData) {
    return Api.addUser(userData).then((user) => {
      Logger.info('AuthService.register', { username: userData.username });
      return user;
    });
  }

  logout() {
    Storage.remove(SESSION_KEY);
    Logger.info('AuthService.logout');
  }

  getCurrentUser() {
    return Storage.get(SESSION_KEY, null);
  }
}

export default new AuthService();
