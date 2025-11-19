
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

  async createUser(username, password, role) {
    try {
      const ipc = getIpc();
      const user = await ipc.invoke('db-register', { username, password, role });
      return user;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(id, updates) {
    // This would need to be implemented in the main process
    throw new Error('User update not implemented yet');
  }

  async getAllUsers() {
    // This would need to be implemented in the main process
    throw new Error('Get all users not implemented yet');
  }

  async deleteUser(id) {
    // This would need to be implemented in the main process
    throw new Error('User deletion not implemented yet');
  }
}

// Export singleton instance
const authService = new AuthService();
export { authService };
