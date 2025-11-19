import { getIpc } from '../utils/electronUtils';

class ReturnService {
  async getAllReturns(options = {}) {
    console.log('ReturnService: Starting IPC call for returns with options:', options);
    const startTime = performance.now();
    try {
      const ipc = getIpc();
      // Add timeout to prevent indefinite hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('IPC returns timeout')), 3000);
      });
      const ipcPromise = ipc.invoke('db-get-returns', options);
      const result = await Promise.race([ipcPromise, timeoutPromise]);
      const endTime = performance.now();
      console.log(`ReturnService: IPC call completed in ${endTime - startTime}ms, result:`, result);
      return result;
    } catch (error) {
      const endTime = performance.now();
      console.log(`ReturnService: IPC call failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  }

  async addReturn(returnData) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-add-return', returnData);
    } catch (error) {
      throw error;
    }
  }

  async updateReturn(id, returnData) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-update-return', id, returnData);
    } catch (error) {
      throw error;
    }
  }

  async deleteReturn(id) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-delete-return', id);
    } catch (error) {
      throw error;
    }
  }

  async getActiveRentals() {
    console.log('ReturnService: Starting IPC call for active rentals');
    const startTime = performance.now();
    try {
      const ipc = getIpc();
      // Add timeout to prevent indefinite hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('IPC active rentals timeout')), 3000);
      });
      const ipcPromise = ipc.invoke('db-get-active-rentals');
      const result = await Promise.race([ipcPromise, timeoutPromise]);
      const endTime = performance.now();
      console.log(`ReturnService: Active rentals IPC call completed in ${endTime - startTime}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      console.log(`ReturnService: Active rentals IPC call failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  }
}

// Export singleton instance
const returnService = new ReturnService();
export { returnService };
