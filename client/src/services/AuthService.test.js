import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthService from './AuthService';
import Api from '../api/MockApiService';
import Storage from './StorageService';

// Mock the dependencies
vi.mock('../api/MockApiService');
vi.mock('./StorageService');
vi.mock('./LoggerService'); // Mock logger to avoid console output during tests

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should login successfully with valid credentials', () => {
    const mockUser = { id: '1', name: 'Test User', role: 'teacher', username: 'teacher1' };
    
    // Setup mock return value
    Api.findUserForAuth.mockReturnValue(mockUser);

    const result = AuthService.login('teacher1', 'pass123', 'teacher');

    expect(Api.findUserForAuth).toHaveBeenCalledWith('teacher1', 'pass123', 'teacher');
    expect(Storage.set).toHaveBeenCalledWith('auth_session', { id: '1', name: 'Test User', role: 'teacher' });
    expect(result).toEqual({ id: '1', name: 'Test User', role: 'teacher' });
  });

  it('should return null for invalid credentials', () => {
    Api.findUserForAuth.mockReturnValue(null);

    const result = AuthService.login('wrong', 'wrong', 'student');

    expect(result).toBeNull();
    expect(Storage.set).not.toHaveBeenCalled();
  });

  it('should logout by removing session from storage', () => {
    AuthService.logout();
    expect(Storage.remove).toHaveBeenCalledWith('auth_session');
  });

  it('should return current user from storage', () => {
    const mockUser = { id: '1', name: 'Test User', role: 'teacher' };
    Storage.get.mockReturnValue(mockUser);

    const result = AuthService.getCurrentUser();

    expect(Storage.get).toHaveBeenCalledWith('auth_session', null);
    expect(result).toEqual(mockUser);
  });
});
