import { getIpc } from '../utils/electronUtils';

class PaymentService {
  async getAllPayments(options = {}) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-get-payments', options);
    } catch (error) {
      throw error;
    }
  }

  async addPayment(paymentData, userId = null) {
    try {
      const ipc = getIpc();
      const dataWithUser = { ...paymentData, updated_by_user_id: userId };
      return await ipc.invoke('db-add-payment', dataWithUser);
    } catch (error) {
      throw error;
    }
  }

  async updatePayment(id, paymentData, userId = null) {
    try {
      const ipc = getIpc();
      const dataWithUser = { ...paymentData, updated_by_user_id: userId };
      return await ipc.invoke('db-update-payment', id, dataWithUser);
    } catch (error) {
      throw error;
    }
  }

  async deletePayment(id, userId = null) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-delete-payment', id, userId);
    } catch (error) {
      throw error;
    }
  }

  async getPaymentsByRental(rentalId) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-get-payments-by-rental', rentalId);
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
const paymentService = new PaymentService();
export { paymentService };