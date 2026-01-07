import { getIpc } from '../utils/electronUtils';

class ClientService {
  async getAllClients(options = {}) {
    console.log('ClientService: Starting IPC call for clients with options:', options);
    const startTime = performance.now();
    try {
      const ipc = getIpc();
      // Add timeout to prevent indefinite hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('IPC clients timeout')), 3000);
      });
      const ipcPromise = ipc.invoke('db-get-clients', options);
      const result = await Promise.race([ipcPromise, timeoutPromise]);
      const endTime = performance.now();
      console.log(`ClientService: IPC call completed in ${endTime - startTime}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      console.log(`ClientService: IPC call failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  }

  async addClient(clientData, userId = null) {
    try {
      const ipc = getIpc();
      const dataWithUser = { ...clientData, updated_by_user_id: userId };
      return await ipc.invoke('db-add-client', dataWithUser);
    } catch (error) {
      throw error;
    }
  }

  async updateClient(id, clientData) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-update-client', id, clientData);
    } catch (error) {
      throw error;
    }
  }

  async deleteClient(id) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-delete-client', id);
    } catch (error) {
      throw error;
    }
  }

  async getClientProfile(clientId) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-get-client-profile', clientId);
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
const clientService = new ClientService();
export { clientService };
