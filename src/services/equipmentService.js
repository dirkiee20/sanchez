import { getIpc } from '../utils/electronUtils';

class EquipmentService {
  async getAllEquipment() {
    console.log('EquipmentService: Starting IPC call for equipment');
    const startTime = performance.now();
    try {
      const ipc = getIpc();
      // Add timeout to prevent indefinite hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('IPC equipment timeout')), 3000);
      });
      const ipcPromise = ipc.invoke('db-get-equipment');
      const result = await Promise.race([ipcPromise, timeoutPromise]);
      const endTime = performance.now();
      console.log(`EquipmentService: IPC call completed in ${endTime - startTime}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      console.log(`EquipmentService: IPC call failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  }

  async addEquipment(equipmentData, userId = null) {
    try {
      const ipc = getIpc();
      const dataWithUser = { ...equipmentData, updated_by_user_id: userId };
      return await ipc.invoke('db-add-equipment', dataWithUser);
    } catch (error) {
      throw error;
    }
  }

  async updateEquipment(id, equipmentData) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-update-equipment', id, equipmentData);
    } catch (error) {
      throw error;
    }
  }

  async deleteEquipment(id) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-delete-equipment', id);
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
const equipmentService = new EquipmentService();
export { equipmentService };
