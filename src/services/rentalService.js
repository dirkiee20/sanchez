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

  async addRental(rentalData) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-add-rental', rentalData);
    } catch (error) {
      throw error;
    }
  }

  async updateRental(id, rentalData) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-update-rental', id, rentalData);
    } catch (error) {
      throw error;
    }
  }

  async deleteRental(id) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-delete-rental', id);
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
}

// Export singleton instance
const rentalService = new RentalService();
export { rentalService };
