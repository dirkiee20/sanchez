import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { getElectronAPI } from '../utils/electronUtils';

ChartJS.register(ArcElement, Tooltip, Legend);

const PaymentChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const electronAPI = getElectronAPI();
        const data = await electronAPI.invoke('db-get-payment-status-chart-data', selectedPeriod);
        setChartData(data);
      } catch (error) {
        console.error('Error fetching payment chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Payment Status</h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Payment Status</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  // Define colors for different payment statuses
  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return { bg: 'rgba(16, 185, 129, 0.8)', border: 'rgb(16, 185, 129)' };
      case 'partial':
        return { bg: 'rgba(245, 158, 11, 0.8)', border: 'rgb(245, 158, 11)' };
      case 'unpaid':
        return { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgb(239, 68, 68)' };
      default:
        return { bg: 'rgba(156, 163, 175, 0.8)', border: 'rgb(156, 163, 175)' };
    }
  };

  const data = {
    labels: chartData.map(item => {
      const status = item.payment_status;
      const capitalized = status.charAt(0).toUpperCase() + status.slice(1);
      return `${capitalized} (${item.count})`;
    }),
    datasets: [
      {
        data: chartData.map(item => item.count || 0),
        backgroundColor: chartData.map(item => getStatusColor(item.payment_status).bg),
        borderColor: chartData.map(item => getStatusColor(item.payment_status).border),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const item = chartData[context.dataIndex];
            const status = item.payment_status.charAt(0).toUpperCase() + item.payment_status.slice(1);
            const count = item.count;
            const amount = parseFloat(item.total_amount).toLocaleString();
            const avg = parseFloat(item.avg_amount).toLocaleString();
            return [
              `${status}: ${count} rentals`,
              `Total: ₱${amount}`,
              `Average: ₱${avg}`
            ];
          }
        }
      }
    },
    cutout: '60%',
  };

  const totalRentals = chartData.reduce((sum, item) => sum + (item.count || 0), 0);
  const totalAmount = chartData.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);

  const periodOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'all', label: 'All Time' }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Payment Status Distribution</h3>
        <div className="flex space-x-2">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedPeriod(option.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totalRentals}</div>
          <div className="text-sm text-gray-500">Total Rentals</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">₱{totalAmount.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Amount</div>
        </div>
      </div>
      <div className="h-80">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
};

export default PaymentChart;