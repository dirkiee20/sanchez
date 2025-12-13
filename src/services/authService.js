
import { getIpc } from '../utils/electronUtils';

class AuthService {
  constructor() {
    this.currentUser = null;
  }

  async login(username, password) {
    console.log('AuthService: Starting IPC login call');
    const startTime = performance.now();
    try {
      const ipc = getIpc();
      // Add timeout to IPC call to prevent indefinite hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('IPC login timeout')), 3000); // 3 second timeout
      });
      const loginPromise = ipc.invoke('db-login', username, password);
      const user = await Promise.race([loginPromise, timeoutPromise]);
      this.currentUser = user;
      const endTime = performance.now();
      console.log(`AuthService: IPC login completed in ${endTime - startTime}ms`);
      return user;
    } catch (error) {
      const endTime = performance.now();
      console.log(`AuthService: IPC login failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  }

  async logout() {
    // For single-unit application, don't clear currentUser from database
    // Just clear the in-memory reference
    this.currentUser = null;
  }

  async getCurrentUser() {
    return this.currentUser || null;
  }

  async createUser(username, password, role, adminUserId) {
    try {
      const ipc = getIpc();
      const user = await ipc.invoke('db-register', { username, password, role }, adminUserId);
      return user;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(id, updates) {
    // This would need to be implemented in the main process
    throw new Error('User update not implemented yet');
  }

  async getAllUsers(adminUserId) {
    try {
      const ipc = getIpc();
      const users = await ipc.invoke('db-get-users', adminUserId);
      return users;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(userId, adminUserId) {
    try {
      const ipc = getIpc();
      const result = await ipc.invoke('db-delete-user', userId, adminUserId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async resetUserPassword(userId, newPassword, adminUserId) {
    try {
      const ipc = getIpc();
      const result = await ipc.invoke('db-reset-user-password', userId, newPassword, adminUserId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async promoteUserToAdmin(userId, adminUserId) {
    try {
      const ipc = getIpc();
      const result = await ipc.invoke('db-promote-user-to-admin', userId, adminUserId);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
const authService = new AuthService();
export { authService };
