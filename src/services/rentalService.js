import { getIpc } from '../utils/electronUtils';

class RentalService {
  async getAllRentals(options = {}) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-get-rentals', options);
    } catch (error) {
      throw error;
    }
  }

  async addRental(rentalData, userId = null) {
    try {
      const ipc = getIpc();
      // Add userId to rentalData if provided, or pass as separate arg if backend expects it
      // Let's pass it as part of rentalData or a separate argument depending on how we change backend
      // Chosen approach: Pass as separate argument to IPC for consistency or merge into object
      // Let's merge into object for add/update, and pass as 2nd arg for delete
      const dataWithUser = { ...rentalData, updated_by_user_id: userId };
      return await ipc.invoke('db-add-rental', dataWithUser);
    } catch (error) {
      throw error;
    }
  }

  async updateRental(id, rentalData, userId = null) {
    try {
      const ipc = getIpc();
      const dataWithUser = { ...rentalData, updated_by_user_id: userId };
      return await ipc.invoke('db-update-rental', id, dataWithUser);
    } catch (error) {
      throw error;
    }
  }

  async deleteRental(id, userId = null) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-delete-rental', id, userId);
    } catch (error) {
      throw error;
    }
  }

  async getAvailableEquipment() {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-get-available-equipment');
    } catch (error) {
      throw error;
    }
  }

  async getRentalDetails(rentalId) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-get-rental-details', rentalId);
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
const rentalService = new RentalService();
export { rentalService };
