import { getIpc } from '../utils/electronUtils';

class ReportService {
  async getEquipmentUtilization(options = {}) {
    console.log('ReportService: Starting equipment utilization report with options:', options);
    const startTime = performance.now();
    try {
      const ipc = getIpc();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Equipment utilization report timeout')), 10000);
      });
      const ipcPromise = ipc.invoke('db-get-equipment-utilization', options);
      const result = await Promise.race([ipcPromise, timeoutPromise]);
      const endTime = performance.now();
      console.log(`ReportService: Equipment utilization report completed in ${endTime - startTime}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      console.log(`ReportService: Equipment utilization report failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  }

  async getIncomeSummary(options = {}) {
    console.log('ReportService: Starting income summary report with options:', options);
    const startTime = performance.now();
    try {
      const ipc = getIpc();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Income summary report timeout')), 10000);
      });
      const ipcPromise = ipc.invoke('db-get-income-summary', options);
      const result = await Promise.race([ipcPromise, timeoutPromise]);
      const endTime = performance.now();
      console.log(`ReportService: Income summary report completed in ${endTime - startTime}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      console.log(`ReportService: Income summary report failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  }

  async getOverdueRentalsReport(options = {}) {
    console.log('ReportService: Starting overdue rentals report with options:', options);
    const startTime = performance.now();
    try {
      const ipc = getIpc();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Overdue rentals report timeout')), 10000);
      });
      const ipcPromise = ipc.invoke('db-get-overdue-rentals-report', options);
      const result = await Promise.race([ipcPromise, timeoutPromise]);
      const endTime = performance.now();
      console.log(`ReportService: Overdue rentals report completed in ${endTime - startTime}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      console.log(`ReportService: Overdue rentals report failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  }

  async getDamageLogsReport(options = {}) {
    console.log('ReportService: Starting damage logs report with options:', options);
    const startTime = performance.now();
    try {
      const ipc = getIpc();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Damage logs report timeout')), 10000);
      });
      const ipcPromise = ipc.invoke('db-get-damage-logs-report', options);
      const result = await Promise.race([ipcPromise, timeoutPromise]);
      const endTime = performance.now();
      console.log(`ReportService: Damage logs report completed in ${endTime - startTime}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      console.log(`ReportService: Damage logs report failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  }
}

// Export singleton instance
const reportService = new ReportService();
export { reportService };