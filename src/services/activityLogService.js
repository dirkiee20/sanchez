import { getIpc } from '../utils/electronUtils';

class ActivityLogService {
  async getAuditLogs(options = {}) {
    try {
      const ipc = getIpc();
      return await ipc.invoke('db-get-audit-logs', options);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }
}

const activityLogService = new ActivityLogService();
export { activityLogService };
