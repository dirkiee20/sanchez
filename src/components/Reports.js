import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp, AlertTriangle, DollarSign, BarChart3, PieChart, Activity, Package, Users, CreditCard, Wrench } from 'lucide-react';
import { reportService } from '../services/reportService';
import { getIpc } from '../utils/electronUtils';
import { useAuth } from '../contexts/AuthContext';

function Reports() {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [databaseReady, setDatabaseReady] = useState(false);
  // Only standard reports now

  const reportTypes = [
    {
      id: 'equipment-utilization',
      name: 'Equipment Utilization',
      description: 'Track equipment usage and availability',
      icon: TrendingUp
    },
    {
      id: 'income-summary',
      name: 'Income Summary',
      description: 'Revenue and payment reports',
      icon: DollarSign
    },
    {
      id: 'overdue-rentals',
      name: 'Overdue Rentals',
      description: 'List of overdue equipment returns',
      icon: AlertTriangle
    },
    {
      id: 'damage-logs',
      name: 'Damage Logs',
      description: 'Equipment damage and repair records',
      icon: FileText
    }
  ];

  useEffect(() => {
    // Listen for database ready signal
    const ipc = getIpc();
    if (ipc && ipc.on) {
      ipc.on('database-ready', () => {
        console.log('Reports: Database ready signal received');
        setDatabaseReady(true);
      });
    }

    // In development, assume database is ready after a short delay
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        setDatabaseReady(true);
      }, 200);
    }

    return () => {
      if (ipc && ipc.removeAllListeners) {
        ipc.removeAllListeners('database-ready');
      }
    };
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      alert('Please select a report type');
      return;
    }

    if (!databaseReady) {
      alert('Database is not ready. Please wait for the application to initialize.');
      return;
    }

    console.log('Reports: Generating report:', selectedReport);
    const startTime = performance.now();
    setLoading(true);
    setReportData(null);

    try {
      const options = {};
      if (dateRange.startDate && dateRange.endDate) {
        options.startDate = dateRange.startDate;
        options.endDate = dateRange.endDate;
      }

      let data;
      switch (selectedReport) {
        case 'equipment-utilization':
          data = await reportService.getEquipmentUtilization(options);
          break;
        case 'income-summary':
          data = await reportService.getIncomeSummary(options);
          break;
        case 'overdue-rentals':
          data = await reportService.getOverdueRentalsReport(options);
          break;
        case 'damage-logs':
          data = await reportService.getDamageLogsReport(options);
          break;
        default:
          throw new Error('Unknown report type');
      }

      setReportData({ type: selectedReport, ...data });
      const endTime = performance.now();
      console.log(`Reports: Report generated in ${endTime - startTime}ms`);
    } catch (error) {
      console.error('Reports: Error generating report:', error);
      alert(`Error generating report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData) {
      alert('Please generate a report first');
      return;
    }

    try {
      const ipc = getIpc();
      const filePath = await ipc.invoke('db-export-report-pdf', selectedReport, reportData, dateRange);
      if (filePath) {
        alert(`PDF report exported successfully to: ${filePath}`);
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert(`Error exporting PDF: ${error.message}`);
    }
  };

  const handleExportExcel = async () => {
    if (!reportData) {
      alert('Please generate a report first');
      return;
    }

    try {
      const ipc = getIpc();
      const filePath = await ipc.invoke('db-export-report-excel', selectedReport, reportData, dateRange);
      if (filePath) {
        alert(`Excel report exported successfully to: ${filePath}`);
      }
    } catch (error) {
      console.error('Excel export error:', error);
      alert(`Error exporting Excel: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Reports</h1>
        <p className="text-secondary-600">Generate and export business reports</p>
      </div>

      {/* Report Selection */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">Select Report Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <div
                key={report.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                  selectedReport === report.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
                onClick={() => setSelectedReport(report.id)}
              >
                <div className="flex items-center mb-2">
                  <Icon className="h-5 w-5 text-primary-600 mr-2" />
                  <h3 className="font-medium text-secondary-900">{report.name}</h3>
                </div>
                <p className="text-sm text-secondary-600">{report.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">Date Range</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              className="input-field"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              className="input-field"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="card p-6">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleGenerateReport}
            className="btn-primary flex items-center"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </button>

          <button
            onClick={handleExportPDF}
            className="btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>

          <button
            onClick={handleExportExcel}
            className="btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Report Preview */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">Report Preview</h2>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-secondary-600">Generating report...</span>
          </div>
        ) : reportData ? (
          <ReportVisualization data={reportData} userRole={user?.role} />
        ) : (
          <div className="bg-secondary-50 rounded-lg p-4">
            <p className="text-secondary-600 text-center">
              Select a report type and click "Generate Report" to view results
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Report Visualization Component
function ReportVisualization({ data, userRole }) {
  const renderEquipmentUtilization = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Utilization by Type */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Utilization by Equipment Type
          </h3>
          <div className="space-y-3">
            {data.utilizationByType.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-secondary-50 rounded">
                <div>
                  <p className="font-medium">{item.equipment_type}</p>
                  <p className="text-sm text-secondary-600">
                    {item.currently_rented}/{item.total_equipment} rented
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-600">₱{item.total_revenue}</p>
                  <p className="text-sm text-secondary-500">₱{item.avg_daily_rate}/day</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Rented Equipment */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Most Rented Equipment
          </h3>
          <div className="space-y-3">
            {data.mostRented.slice(0, 5).map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-secondary-50 rounded">
                <div>
                  <p className="font-medium">{item.equipment_name}</p>
                  <p className="text-sm text-secondary-600">{item.equipment_type}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.rental_count} rentals</p>
                  <p className="text-sm text-secondary-500">₱{item.total_revenue}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Monthly Utilization Trend
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Month</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Rentals</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Revenue</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Equipment Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {data.utilizationOverTime.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2">{item.month}</td>
                  <td className="px-4 py-2">{item.rentals_count}</td>
                  <td className="px-4 py-2">₱{item.monthly_revenue}</td>
                  <td className="px-4 py-2">{item.unique_equipment_used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderIncomeSummary = () => (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className={`grid grid-cols-1 ${userRole === 'admin' ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-4`}>
        {userRole === 'admin' && (
          <div className="card p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-600">₱{data.overallStats.total_revenue}</p>
            <p className="text-sm text-secondary-600">Total Revenue</p>
          </div>
        )}
        <div className="card p-4 text-center">
          <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <p className="text-2xl font-bold text-blue-600">₱{data.overallStats.total_paid}</p>
          <p className="text-sm text-secondary-600">Total Paid</p>
        </div>
        {userRole === 'admin' && (
          <div className="card p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <p className="text-2xl font-bold text-red-600">₱{data.overallStats.total_outstanding}</p>
            <p className="text-sm text-secondary-600">Outstanding</p>
          </div>
        )}
        <div className="card p-4 text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 text-purple-600" />
          <p className="text-2xl font-bold text-purple-600">{data.overallStats.total_rentals}</p>
          <p className="text-sm text-secondary-600">Total Rentals</p>
        </div>
      </div>

      {/* Revenue by Type */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4">Revenue by Equipment Type</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Rentals</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Revenue</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Avg Revenue</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Payment Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {data.revenueByType.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 font-medium">{item.equipment_type}</td>
                  <td className="px-4 py-2">{item.rental_count}</td>
                  <td className="px-4 py-2">₱{item.total_revenue}</td>
                  <td className="px-4 py-2">₱{item.avg_revenue_per_rental}</td>
                  <td className="px-4 py-2">{item.payment_completion_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4">Monthly Revenue Trend</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Month</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Rentals</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Revenue</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Paid</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Avg Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {data.monthlyRevenue.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2">{item.month}</td>
                  <td className="px-4 py-2">{item.rental_count}</td>
                  <td className="px-4 py-2">₱{item.total_revenue}</td>
                  <td className="px-4 py-2">₱{item.total_paid}</td>
                  <td className="px-4 py-2">₱{item.avg_rental_value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderOverdueRentals = () => (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
          <p className="text-2xl font-bold text-red-600">{data.overdueSummary.total_overdue}</p>
          <p className="text-sm text-secondary-600">Overdue Rentals</p>
        </div>
        <div className="card p-4 text-center">
          <Calendar className="h-8 w-8 mx-auto mb-2 text-orange-600" />
          <p className="text-2xl font-bold text-orange-600">{data.overdueSummary.avg_days_overdue} days</p>
          <p className="text-sm text-secondary-600">Avg Days Overdue</p>
        </div>
        <div className="card p-4 text-center">
          <DollarSign className="h-8 w-8 mx-auto mb-2 text-red-600" />
          <p className="text-2xl font-bold text-red-600">₱{data.overdueSummary.total_overdue_charges}</p>
          <p className="text-sm text-secondary-600">Overdue Charges</p>
        </div>
      </div>

      {/* Overdue Rentals List */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4">Overdue Rentals</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Client</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Equipment</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Days Overdue</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Overdue Charges</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {data.overdueRentals.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2">
                    <div>
                      <p className="font-medium">{item.client_name}</p>
                      <p className="text-sm text-secondary-600">{item.contact_number}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2">{item.equipment_name}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                      {item.days_overdue} days
                    </span>
                  </td>
                  <td className="px-4 py-2">₱{item.overdue_charges}</td>
                  <td className="px-4 py-2">₱{item.outstanding_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDamageLogs = () => (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
          <p className="text-2xl font-bold text-red-600">{data.damageSummary.total_damaged_returns}</p>
          <p className="text-sm text-secondary-600">Damaged Returns</p>
        </div>
        <div className="card p-4 text-center">
          <DollarSign className="h-8 w-8 mx-auto mb-2 text-red-600" />
          <p className="text-2xl font-bold text-red-600">₱{data.damageSummary.total_damage_costs}</p>
          <p className="text-sm text-secondary-600">Total Damage Costs</p>
        </div>
        <div className="card p-4 text-center">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-600" />
          <p className="text-2xl font-bold text-orange-600">₱{data.damageSummary.avg_damage_cost}</p>
          <p className="text-sm text-secondary-600">Avg Damage Cost</p>
        </div>
      </div>

      {/* Damage Logs */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4">Damage Incident Logs</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Client</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Equipment</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Damage Description</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Additional Charges</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {data.damageLogs.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 font-medium">{item.client_name}</td>
                  <td className="px-4 py-2">{item.equipment_name}</td>
                  <td className="px-4 py-2">{item.damage_description || 'No description'}</td>
                  <td className="px-4 py-2">₱{item.additional_charges}</td>
                  <td className="px-4 py-2">{new Date(item.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance Status */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4">Equipment Maintenance Status</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Equipment</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Damage Incidents</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Total Repair Cost</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Last Damage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {data.maintenanceStatus.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2">
                    <div>
                      <p className="font-medium">{item.equipment_name}</p>
                      <p className="text-sm text-secondary-600">{item.equipment_type}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      item.status === 'maintenance' ? 'bg-red-100 text-red-800' :
                      item.status === 'available' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{item.damage_incidents}</td>
                  <td className="px-4 py-2">₱{item.total_repair_costs}</td>
                  <td className="px-4 py-2">{item.last_damage_date ? new Date(item.last_damage_date).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  switch (data.type) {
    case 'equipment-utilization':
      return renderEquipmentUtilization();
    case 'income-summary':
      return renderIncomeSummary();
    case 'overdue-rentals':
      return renderOverdueRentals();
    case 'damage-logs':
      return renderDamageLogs();
    default:
      return <div>Unknown report type</div>;
  }
}

export default Reports;
