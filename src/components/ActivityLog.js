import React, { useState, useEffect, useCallback } from 'react';
import { activityLogService } from '../services/activityLogService';
import Pagination from './Pagination';
import { Clock, User, Activity } from 'lucide-react';

function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });
  const itemsPerPage = 20;

  const loadLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await activityLogService.getAuditLogs({ page, limit: itemsPerPage });
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs(currentPage);
  }, [currentPage, loadLogs]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const formatValue = (value) => {
    if (!value) return '-';
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return (
          <div className="text-sm text-secondary-600">
            {Object.entries(parsed).map(([key, val]) => (
              <div key={key} className="flex items-start">
                <span className="font-medium mr-2">{key.replace(/_/g, ' ')}:</span>
                <span>{String(val)}</span>
              </div>
            ))}
          </div>
        );
      }
      return <span>{value}</span>;
    } catch (e) {
      return <span>{value}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Activity Log</h1>
          <p className="text-secondary-600">System audit trail and history</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {logs.map((log) => (
                <tr key={log.id} className="table-row">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-secondary-400" />
                      {log.username || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                    <div className="flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-primary-500" />
                      <span className="font-medium">{log.action}</span>
                    </div>
                    <div className="text-xs text-secondary-500 mt-1">
                      {log.table_name} #{log.record_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary-900">
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-medium text-secondary-500 uppercase">Changes:</span>
                        {formatValue(log.new_values)}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-secondary-500">
                    No activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
        totalItems={pagination.totalItems}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
}

export default ActivityLog;
