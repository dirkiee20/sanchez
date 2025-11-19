import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { getElectronAPI } from '../utils/electronUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const RevenueChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('monthly');

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('RevenueChart: Starting data fetch');
        console.log('RevenueChart: isElectron():', !!(window && window.process && window.process.type));
        console.log('RevenueChart: window.electronAPI:', window.electronAPI);

        const electronAPI = getElectronAPI();
        console.log('RevenueChart: getElectronAPI() returned:', electronAPI);

        if (!electronAPI || !electronAPI.invoke) {
          console.error('RevenueChart: electronAPI or invoke method is undefined');
          setLoading(false);
          return;
        }

        const data = await electronAPI.invoke('db-get-revenue-chart-data', timePeriod);
        console.log('RevenueChart: Received data:', data);

        // Log X and Y data in list format
        console.log('RevenueChart: X (periods) and Y (revenue) data:');
        data.forEach((item, index) => {
          console.log(`${index + 1}. Period: ${item.period}, Revenue: ₱${parseFloat(item.revenue || 0).toLocaleString()}, Rentals: ${item.rental_count || 0}`);
        });

        setChartData(data);
      } catch (error) {
        console.error('Error fetching revenue chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timePeriod]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  const data = {
    labels: chartData.map(item => {
      const period = item.period || item.month;
      if (timePeriod === 'daily') {
        const date = new Date(period);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timePeriod === 'weekly') {
        const [year, week] = period.split('-');
        const yearNum = parseInt(year);
        const weekNum = parseInt(week);

        // Calculate the first day of the year
        const firstDayOfYear = new Date(yearNum, 0, 1);
        // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
        const firstDayOfWeek = firstDayOfYear.getDay();

        // Calculate the start date of the week
        // Weeks are 1-indexed, so week 1 starts on Jan 1st or the Monday closest to it
        const daysToAdd = (weekNum - 1) * 7;
        const weekStart = new Date(firstDayOfYear);
        weekStart.setDate(firstDayOfYear.getDate() + daysToAdd - firstDayOfWeek + 1); // +1 to start on Monday

        // Calculate end date (6 days later)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        // Format as "Jan 01-07"
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startMonth = monthNames[weekStart.getMonth()];
        const endMonth = monthNames[weekEnd.getMonth()];

        const startDay = weekStart.getDate().toString().padStart(2, '0');
        const endDay = weekEnd.getDate().toString().padStart(2, '0');

        if (startMonth === endMonth) {
          return `${startMonth} ${startDay}-${endDay}`;
        } else {
          return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
        }
      } else if (timePeriod === 'yearly') {
        return period;
      } else { // monthly
        const [year, month] = period.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    }),
    datasets: [
      {
        label: 'Revenue (₱)',
        data: chartData.map(item => parseFloat(item.revenue || item.month) || 0),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Rental Count',
        data: chartData.map(item => item.rental_count || 0),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.datasetIndex === 0) {
              label += '₱' + context.parsed.y.toLocaleString();
            } else {
              label += context.parsed.y + ' rentals';
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: timePeriod === 'daily' ? 'Date' : timePeriod === 'weekly' ? 'Week' : timePeriod === 'yearly' ? 'Year' : 'Month'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Revenue (₱)'
        },
        ticks: {
          callback: function(value) {
            return '₱' + value.toLocaleString();
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Rental Count'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{timePeriod === 'daily' ? 'Revenue Trend (Last 30 Days)' : timePeriod === 'weekly' ? 'Revenue Trend (Last 12 Weeks)' : timePeriod === 'yearly' ? 'Revenue Trend (Last 5 Years)' : 'Revenue Trend (Last 12 Months)'}</h3>
        <div className="flex space-x-2">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
      <div className="h-96">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default RevenueChart;