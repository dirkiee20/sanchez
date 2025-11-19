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

  async addPayment(paymentData) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-add-payment', paymentData);
    } catch (error) {
      throw error;
    }
  }

  async updatePayment(id, paymentData) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-update-payment', id, paymentData);
    } catch (error) {
      throw error;
    }
  }

  async deletePayment(id) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-delete-payment', id);
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