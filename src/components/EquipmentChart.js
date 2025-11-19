import React, { useEffect, useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { getElectronAPI } from '../utils/electronUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Calculate utilization percentage
const calculateUtilization = (rented, total) => {
  if (!total || total === 0) return 0;
  return Math.round((rented / total) * 100);
};

const EquipmentChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [chartKey, setChartKey] = useState(0); // Force chart re-render

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('EquipmentChart: Starting data fetch for period:', selectedPeriod);
        setLoading(true);
        console.log('EquipmentChart: isElectron():', !!(window && window.process && window.process.type));
        console.log('EquipmentChart: window.electronAPI:', window.electronAPI);

        const electronAPI = getElectronAPI();
        console.log('EquipmentChart: getElectronAPI() returned:', electronAPI);

        if (!electronAPI || !electronAPI.invoke) {
          console.error('EquipmentChart: electronAPI or invoke method is undefined');
          setLoading(false);
          return;
        }

        console.log('EquipmentChart: Fetching data for period:', selectedPeriod);
        const data = await electronAPI.invoke('db-get-equipment-chart-data', selectedPeriod);
        console.log('EquipmentChart: Received data:', data);
        console.log('EquipmentChart: Data length:', data?.length);

        // Log detailed data in list format
        console.log('EquipmentChart: Equipment type and counts data:');
        data.forEach((item, index) => {
          console.log(`${index + 1}. Type: ${item.equipment_type}, Total: ${item.total_equipment || 0}, Rented: ${item.currently_rented || 0}, Rentals: ${item.total_rentals || 0}`);
        });

        // Create a new array to ensure state reference changes
        setChartData([...data]);
        setChartKey(prev => prev + 1); // Force chart re-render
      } catch (error) {
        console.error('Error fetching equipment chart data:', error);
        setChartData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  // Memoize chart data to create new object reference when chartData changes
  const data = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    return {
      labels: chartData.map(item => item.equipment_type),
      datasets: [
        {
          label: 'Total Equipment',
          data: chartData.map(item => item.total_equipment || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
        {
          label: 'Currently Rented',
          data: chartData.map(item => item.currently_rented || 0),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
        },
        {
          label: 'Total Rentals',
          data: chartData.map(item => item.total_rentals || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
        },
        {
          label: 'Utilization %',
          data: chartData.map(item => calculateUtilization(item.currently_rented || 0, item.total_equipment || 0)),
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 1,
          yAxisID: 'y1',
        },
      ],
    };
  }, [chartData]);

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
            if (context.datasetIndex === 3) {
              label += context.parsed.y + '%';
            } else {
              label += context.parsed.y;
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
          text: 'Equipment Type'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Count'
        },
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Utilization %'
        },
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const periodOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'all', label: 'All Time' }
  ];

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Equipment Utilization</h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0 || !data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Equipment Utilization</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Equipment Utilization by Type</h3>
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
      <div className="h-96">
        <Bar key={chartKey} data={data} options={options} redraw />
      </div>
    </div>
  );
};

export default EquipmentChart;
