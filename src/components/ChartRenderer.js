import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { getIpc } from '../utils/electronUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function ChartRenderer({ element, dataSources, filters }) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (element.config.dataSource && element.config.dataSource !== '') {
      fetchChartData();
    } else {
      // Clear chart data if no data source is selected
      setChartData(null);
      setError(null);
    }
  }, [element.config.dataSource, element.config, filters, element.vizType, dataSources]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchChartData = async () => {
    setLoading(true);
    setError(null);

    try {
      const ipc = getIpc();
      // Only include the selected data source for this chart element
      const selectedDataSource = dataSources.find(ds => ds.id === element.config.dataSource);

      if (!selectedDataSource) {
        setError('Selected data source not found');
        setLoading(false);
        return;
      }

      let configDataSources = [{
        id: selectedDataSource.id,
        name: selectedDataSource.name,
        fields: selectedDataSource.fields
      }];

      // For equipment charts (bar, pie, and line), we need rentals data
      if (selectedDataSource.id === 'equipment' && (element.vizType === 'bar_chart' || element.vizType === 'pie_chart' || element.vizType === 'line_chart')) {
        const rentalsDataSource = dataSources.find(ds => ds.id === 'rentals');
        if (rentalsDataSource) {
          configDataSources.push({
            id: rentalsDataSource.id,
            name: rentalsDataSource.name,
            fields: rentalsDataSource.fields
          });
        }
      }

      // For payments charts (bar, pie, and line), we need rentals and clients data to get payment amounts and client names
      if (selectedDataSource.id === 'payments' && (element.vizType === 'bar_chart' || element.vizType === 'pie_chart' || element.vizType === 'line_chart')) {
        const rentalsDataSource = dataSources.find(ds => ds.id === 'rentals');
        if (rentalsDataSource) {
          configDataSources.push({
            id: rentalsDataSource.id,
            name: rentalsDataSource.name,
            fields: rentalsDataSource.fields
          });
        }
        const clientsDataSource = dataSources.find(ds => ds.id === 'clients');
        if (clientsDataSource) {
          configDataSources.push({
            id: clientsDataSource.id,
            name: clientsDataSource.name,
            fields: clientsDataSource.fields
          });
        }
      }

      const reportConfig = {
        dataSources: configDataSources,
        filters: filters.map(f => ({
          id: f.id,
          type: f.type,
          name: f.name,
          value: f.value
        })),
        elements: []
      };

      console.log('ChartRenderer: Fetching data for', selectedDataSource.id, 'with config:', reportConfig);
      const result = await ipc.invoke('db-generate-custom-report', reportConfig);
      console.log('ChartRenderer: Received result:', result);

      if (result && result.data) {
        console.log('ChartRenderer: Processing data for chart, data length:', result.data.length);
        if (result.data.length > 0) {
          console.log('ChartRenderer: Sample data row:', result.data[0]);
          console.log('ChartRenderer: All column names:', Object.keys(result.data[0]));
        }
        const processedData = processDataForChart(result.data, element);
        console.log('ChartRenderer: Processed data:', processedData);
        setChartData(processedData);
      } else {
        console.log('ChartRenderer: No data in result');
        setError('No data available');
      }
    } catch (err) {
      console.error('Chart data fetch error:', err);
      setError(err.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const processDataForChart = (rawData, element) => {
    if (!rawData || rawData.length === 0) {
      return null;
    }

    const { vizType, config } = element;

    switch (vizType) {
      case 'bar_chart':
        return processBarChartData(rawData, config);
      case 'line_chart':
        return processLineChartData(rawData, config);
      case 'pie_chart':
        return processPieChartData(rawData, config);
      case 'data_table':
        return processTableData(rawData, config);
      default:
        return null;
    }
  };

  const processBarChartData = (data, config) => {
    // Get the selected data source to filter fields
    const selectedDataSource = dataSources.find(ds => ds.id === element.config.dataSource);

    // Special handling for payments bar charts - sum amounts by client name
    if (selectedDataSource && selectedDataSource.id === 'payments') {
      const clientPaymentData = {};

      console.log('Processing payments data for bar chart, data length:', data.length);

      // Filter data to only include rows with actual payment data
      const paymentRows = data.filter(row => {
        const paymentsPrefix = `${selectedDataSource.id}_`;
        const amountField = Object.keys(row).find(key =>
          (key.startsWith(paymentsPrefix) && key.includes('amount') && row[key] !== null && row[key] !== undefined) ||
          (key === 'amount' && row[key] !== null && row[key] !== undefined)
        );
        return amountField && (typeof row[amountField] === 'number' || (typeof row[amountField] === 'string' && !isNaN(parseFloat(row[amountField]))));
      });

      console.log('Filtered payment rows:', paymentRows.length);

      paymentRows.forEach((row, index) => {
        console.log(`Processing payment row ${index}:`, row);

        const paymentsPrefix = `${selectedDataSource.id}_`;
        const clientsPrefix = 'clients_';

        // Find client name field - try multiple patterns
        const clientNameField = Object.keys(row).find(key =>
          (key.startsWith(clientsPrefix) && key.includes('name') && typeof row[key] === 'string') ||
          (key === 'client_name' && typeof row[key] === 'string')
        );

        // Find amount field - try multiple patterns
        const amountField = Object.keys(row).find(key =>
          (key.startsWith(paymentsPrefix) && key.includes('amount')) ||
          key === 'amount'
        );

        console.log(`Row ${index} - clientNameField: ${clientNameField}, amountField: ${amountField}`);

        if (clientNameField && amountField && row[amountField] !== null && row[amountField] !== undefined) {
          const clientName = row[clientNameField] || 'Unknown';
          const amount = parseFloat(row[amountField]) || 0;

          console.log(`Row ${index} - client: ${clientName}, amount: ${amount}`);

          if (!clientPaymentData[clientName]) {
            clientPaymentData[clientName] = 0;
          }
          clientPaymentData[clientName] += amount;
        }
      });

      const labels = Object.keys(clientPaymentData);
      const values = labels.map(label => clientPaymentData[label]);

      console.log('Payment bar chart data (by client):', { labels, values, clientPaymentData });

      // Return null if no data to prevent empty chart
      if (labels.length === 0 || values.length === 0) {
        console.log('No payment data found for bar chart');
        return null;
      }

      return {
        labels,
        datasets: [{
          label: config.title || 'Payments by Client',
          data: values,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        }],
      };
    }

    // Special handling for equipment bar charts - count rentals per equipment
    if (selectedDataSource && selectedDataSource.id === 'equipment') {
      const rentalsDataSource = dataSources.find(ds => ds.id === 'rentals');
      if (rentalsDataSource) {
        // Group rentals by equipment name
        const equipmentRentals = {};

        data.forEach(row => {
          const equipmentPrefix = `${selectedDataSource.id}_`;
          const rentalsPrefix = `${rentalsDataSource.id}_`;

          // Find equipment name field - try multiple possible field names
          const equipmentNameField = Object.keys(row).find(key =>
            (key.startsWith(equipmentPrefix) && key.includes('name') && typeof row[key] === 'string') ||
            (key === 'equipment_name' && typeof row[key] === 'string')
          );

          // Check if this row has rental data (indicating a joined record)
          const hasRentalData = Object.keys(row).some(key => key.startsWith(rentalsPrefix));

          if (equipmentNameField && hasRentalData) {
            const equipmentName = row[equipmentNameField] || 'Unknown';
            equipmentRentals[equipmentName] = (equipmentRentals[equipmentName] || 0) + 1;
          }
        });

        const labels = Object.keys(equipmentRentals);
        const values = labels.map(label => equipmentRentals[label]);

        console.log('Equipment bar chart data:', { labels, values, equipmentRentals });

        return {
          labels,
          datasets: [{
            label: config.title || 'Equipment Rentals',
            data: values,
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
          }],
        };
      }
    }

    // Default behavior for other data sources - group data by a categorical field and count/sum numerical fields
    const groupedData = {};
    const categories = new Set();

    data.forEach(row => {
      const dataSourcePrefix = selectedDataSource ? `${selectedDataSource.id}_` : '';

      // Find categorical field (first string field from selected data source)
      const categoryField = Object.keys(row).find(key =>
        key.startsWith(dataSourcePrefix) &&
        typeof row[key] === 'string' &&
        !key.includes('_id') &&
        !key.includes('date') &&
        !key.includes('created_at')
      );

      // Find numerical field (first number field from selected data source)
      const valueField = Object.keys(row).find(key =>
        key.startsWith(dataSourcePrefix) &&
        (typeof row[key] === 'number' || (typeof row[key] === 'string' && !isNaN(parseFloat(row[key]))))
      );

      if (categoryField && valueField) {
        const category = row[categoryField] || 'Unknown';
        const value = parseFloat(row[valueField]) || 0;

        categories.add(category);
        if (!groupedData[category]) {
          groupedData[category] = 0;
        }
        groupedData[category] += value;
      }
    });

    const labels = Array.from(categories);
    const values = labels.map(label => groupedData[label] || 0);

    return {
      labels,
      datasets: [{
        label: config.title || 'Bar Chart',
        data: values,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      }],
    };
  };

  const processLineChartData = (data, config) => {
    // Get the selected data source to filter fields
    const selectedDataSource = dataSources.find(ds => ds.id === element.config.dataSource);

    // Special handling for payments line charts - show payment amounts over time
    if (selectedDataSource && selectedDataSource.id === 'payments') {
      const paymentTimeData = {};

      // Filter data to only include rows with actual payment data
      const paymentRows = data.filter(row => {
        const paymentsPrefix = `${selectedDataSource.id}_`;
        const amountField = Object.keys(row).find(key =>
          (key.startsWith(paymentsPrefix) && key.includes('amount') && row[key] !== null && row[key] !== undefined) ||
          (key === 'amount' && row[key] !== null && row[key] !== undefined)
        );
        return amountField && (typeof row[amountField] === 'number' || (typeof row[amountField] === 'string' && !isNaN(parseFloat(row[amountField]))));
      });

      paymentRows.forEach(row => {
        const paymentsPrefix = `${selectedDataSource.id}_`;

        // Find payment date field
        const paymentDateField = Object.keys(row).find(key =>
          key.startsWith(paymentsPrefix) &&
          (key.includes('payment_date') || key.includes('date'))
        );

        // Find amount field
        const amountField = Object.keys(row).find(key =>
          key.startsWith(paymentsPrefix) &&
          key.includes('amount')
        );

        if (paymentDateField && amountField && row[amountField] !== null && row[amountField] !== undefined) {
          const date = new Date(row[paymentDateField]).toLocaleDateString();
          const amount = parseFloat(row[amountField]) || 0;

          if (!paymentTimeData[date]) {
            paymentTimeData[date] = 0;
          }
          paymentTimeData[date] += amount;
        }
      });

      const labels = Object.keys(paymentTimeData).sort();
      const values = labels.map(date => paymentTimeData[date]);

      console.log('Payment line chart data:', { labels, values, paymentTimeData });

      return {
        labels,
        datasets: [{
          label: config.title || 'Payment Revenue',
          data: values,
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
        }],
      };
    }

    // Special handling for equipment line charts - show revenue over time per equipment
    if (selectedDataSource && selectedDataSource.id === 'equipment') {
      const rentalsDataSource = dataSources.find(ds => ds.id === 'rentals');
      if (rentalsDataSource) {
        // Group revenue by equipment and date
        const equipmentTimeData = {};

        data.forEach(row => {
          const equipmentPrefix = `${selectedDataSource.id}_`;
          const rentalsPrefix = `${rentalsDataSource.id}_`;

          // Find equipment name field
          const equipmentNameField = Object.keys(row).find(key =>
            (key.startsWith(equipmentPrefix) && key.includes('name') && typeof row[key] === 'string') ||
            (key === 'equipment_name' && typeof row[key] === 'string')
          );

          // Find date field from rentals
          const dateField = Object.keys(row).find(key =>
            key.startsWith(rentalsPrefix) &&
            (key.includes('date') || key.includes('created_at'))
          );

          // Find total amount field from rentals
          const amountField = Object.keys(row).find(key =>
            key.startsWith(rentalsPrefix) &&
            key.includes('total_amount')
          );

          // Check if this row has rental data (indicating a joined record)
          const hasRentalData = Object.keys(row).some(key => key.startsWith(rentalsPrefix));

          if (equipmentNameField && dateField && amountField && hasRentalData) {
            const equipmentName = row[equipmentNameField] || 'Unknown';
            const date = new Date(row[dateField]).toLocaleDateString();
            const amount = parseFloat(row[amountField]) || 0;

            if (!equipmentTimeData[equipmentName]) {
              equipmentTimeData[equipmentName] = {};
            }
            if (!equipmentTimeData[equipmentName][date]) {
              equipmentTimeData[equipmentName][date] = 0;
            }
            equipmentTimeData[equipmentName][date] += amount;
          }
        });

        // Get all unique dates across all equipment
        const allDates = new Set();
        Object.values(equipmentTimeData).forEach(equipmentDates => {
          Object.keys(equipmentDates).forEach(date => allDates.add(date));
        });

        const labels = Array.from(allDates).sort();

        // Create datasets for each equipment
        const datasets = Object.keys(equipmentTimeData).map((equipmentName, index) => {
          const values = labels.map(date => equipmentTimeData[equipmentName][date] || 0);

          // Generate different colors for each equipment
          const colors = [
            'rgba(59, 130, 246, 1)',   // blue
            'rgba(16, 185, 129, 1)',   // green
            'rgba(245, 158, 11, 1)',   // amber
            'rgba(239, 68, 68, 1)',    // red
            'rgba(139, 92, 246, 1)',   // violet
            'rgba(236, 72, 153, 1)',   // pink
            'rgba(6, 182, 212, 1)',    // cyan
            'rgba(34, 197, 94, 1)',    // lime
          ];

          const color = colors[index % colors.length];

          return {
            label: equipmentName,
            data: values,
            borderColor: color,
            backgroundColor: color.replace('1)', '0.1)'),
            tension: 0.4,
            fill: false,
          };
        });

        console.log('Equipment line chart data:', { labels, datasets, equipmentTimeData });

        return {
          labels,
          datasets,
        };
      }
    }

    // Default behavior for other data sources - similar to bar chart but for time series
    const timeData = {};
    const dates = new Set();

    data.forEach(row => {
      const dataSourcePrefix = selectedDataSource ? `${selectedDataSource.id}_` : '';

      // Find date field from selected data source
      const dateField = Object.keys(row).find(key =>
        key.startsWith(dataSourcePrefix) &&
        (key.includes('date') || key.includes('created_at'))
      );

      // Find numerical field from selected data source
      const valueField = Object.keys(row).find(key =>
        key.startsWith(dataSourcePrefix) &&
        (typeof row[key] === 'number' || (typeof row[key] === 'string' && !isNaN(parseFloat(row[key]))))
      );

      if (dateField && valueField) {
        const date = new Date(row[dateField]).toLocaleDateString();
        const value = parseFloat(row[valueField]) || 0;

        dates.add(date);
        if (!timeData[date]) {
          timeData[date] = 0;
        }
        timeData[date] += value;
      }
    });

    const labels = Array.from(dates).sort();
    const values = labels.map(label => timeData[label] || 0);

    return {
      labels,
      datasets: [{
        label: config.title || 'Line Chart',
        data: values,
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      }],
    };
  };

  const processPieChartData = (data, config) => {
    // Get the selected data source to filter fields
    const selectedDataSource = dataSources.find(ds => ds.id === element.config.dataSource);

    // Special handling for payments pie charts - show payment type distribution
    if (selectedDataSource && selectedDataSource.id === 'payments') {
      const paymentTypeData = {};

      // Filter data to only include rows with actual payment data
      const paymentRows = data.filter(row => {
        const paymentsPrefix = `${selectedDataSource.id}_`;
        const amountField = Object.keys(row).find(key =>
          (key.startsWith(paymentsPrefix) && key.includes('amount') && row[key] !== null && row[key] !== undefined) ||
          (key === 'amount' && row[key] !== null && row[key] !== undefined)
        );
        return amountField && (typeof row[amountField] === 'number' || (typeof row[amountField] === 'string' && !isNaN(parseFloat(row[amountField]))));
      });

      paymentRows.forEach(row => {
        const paymentsPrefix = `${selectedDataSource.id}_`;

        // Find payment type field
        const paymentTypeField = Object.keys(row).find(key =>
          key.startsWith(paymentsPrefix) &&
          key.includes('payment_type') &&
          typeof row[key] === 'string'
        );

        // Find amount field
        const amountField = Object.keys(row).find(key =>
          key.startsWith(paymentsPrefix) &&
          key.includes('amount')
        );

        if (paymentTypeField && amountField && row[amountField] !== null && row[amountField] !== undefined) {
          const paymentType = row[paymentTypeField] || 'Unknown';
          const amount = parseFloat(row[amountField]) || 0;

          if (!paymentTypeData[paymentType]) {
            paymentTypeData[paymentType] = 0;
          }
          paymentTypeData[paymentType] += amount;
        }
      });

      const labels = Object.keys(paymentTypeData);
      const values = labels.map(label => paymentTypeData[label]);

      console.log('Payment pie chart data:', { labels, values, paymentTypeData });

      const colors = [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
      ];

      return {
        labels,
        datasets: [{
          label: config.title || 'Payment Types',
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length).map(color => color.replace('0.8', '1')),
          borderWidth: 1,
        }],
      };
    }

    // Special handling for equipment pie charts - count rentals per equipment
    if (selectedDataSource && selectedDataSource.id === 'equipment') {
      const rentalsDataSource = dataSources.find(ds => ds.id === 'rentals');
      if (rentalsDataSource) {
        // Group rentals by equipment name
        const equipmentRentals = {};

        data.forEach(row => {
          const equipmentPrefix = `${selectedDataSource.id}_`;
          const rentalsPrefix = `${rentalsDataSource.id}_`;

          // Find equipment name field - try multiple possible field names
          const equipmentNameField = Object.keys(row).find(key =>
            (key.startsWith(equipmentPrefix) && key.includes('name') && typeof row[key] === 'string') ||
            (key === 'equipment_name' && typeof row[key] === 'string')
          );

          // Check if this row has rental data (indicating a joined record)
          const hasRentalData = Object.keys(row).some(key => key.startsWith(rentalsPrefix));

          if (equipmentNameField && hasRentalData) {
            const equipmentName = row[equipmentNameField] || 'Unknown';
            equipmentRentals[equipmentName] = (equipmentRentals[equipmentName] || 0) + 1;
          }
        });

        const labels = Object.keys(equipmentRentals);
        const values = labels.map(label => equipmentRentals[label]);

        console.log('Equipment pie chart data:', { labels, values, equipmentRentals });

        const colors = [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ];

        return {
          labels,
          datasets: [{
            label: config.title || 'Equipment Rentals',
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderColor: colors.slice(0, labels.length).map(color => color.replace('0.8', '1')),
            borderWidth: 1,
          }],
        };
      }
    }

    // Default behavior for other data sources - group by categories and show distribution
    const groupedData = {};
    const categories = new Set();

    data.forEach(row => {
      const dataSourcePrefix = selectedDataSource ? `${selectedDataSource.id}_` : '';

      const categoryField = Object.keys(row).find(key =>
        key.startsWith(dataSourcePrefix) &&
        typeof row[key] === 'string' &&
        !key.includes('_id') &&
        !key.includes('date') &&
        !key.includes('created_at')
      );

      if (categoryField) {
        const category = row[categoryField] || 'Unknown';
        categories.add(category);
        groupedData[category] = (groupedData[category] || 0) + 1;
      }
    });

    const labels = Array.from(categories);
    const values = labels.map(label => groupedData[label] || 0);

    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
    ];

    return {
      labels,
      datasets: [{
        label: config.title || 'Pie Chart',
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length).map(color => color.replace('0.8', '1')),
        borderWidth: 1,
      }],
    };
  };

  const processTableData = (data, config) => {
    // Return raw data for table display, filtering to only show fields from the selected data source
    if (data.length === 0) {
      return {
        columns: [],
        rows: []
      };
    }

    // Get the first row to see what fields are available
    const firstRow = data[0];
    const allColumns = Object.keys(firstRow);

    // Filter columns to only show those from the selected data source
    // The backend prefixes fields with the data source name (e.g., "payments_amount", "payments_payment_type")
    const selectedDataSource = dataSources.find(ds => ds.id === element.config.dataSource);
    if (selectedDataSource) {
      const dataSourcePrefix = `${selectedDataSource.id}_`;
      const filteredColumns = allColumns.filter(col => col.startsWith(dataSourcePrefix));

      // If we have filtered columns, use them; otherwise, show all columns
      const columnsToShow = filteredColumns.length > 0 ? filteredColumns : allColumns;

      // Ensure we have the expected fields for payments data source
      if (selectedDataSource.id === 'payments' && filteredColumns.length === 0) {
        // If no prefixed columns found, look for direct payment fields
        const paymentFields = ['amount', 'payment_type', 'payment_date', 'notes'];
        const availablePaymentFields = paymentFields.filter(field => allColumns.includes(field));
        if (availablePaymentFields.length > 0) {
          return {
            columns: availablePaymentFields,
            rows: data.slice(0, 50), // Limit to 50 rows for performance
          };
        }
      }

      return {
        columns: columnsToShow,
        rows: data.slice(0, 50), // Limit to 50 rows for performance
      };
    }

    // Fallback: show all columns
    return {
      columns: allColumns,
      rows: data.slice(0, 50), // Limit to 50 rows for performance
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        display: true,
      },
      title: {
        display: !!element.config.title,
        text: element.config.title,
        font: {
          size: 14,
          weight: 'bold',
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            // For pie charts, use context.parsed instead of context.parsed.y
            if (element.vizType === 'pie_chart') {
              if (context.parsed !== null && context.parsed !== undefined) {
                label += new Intl.NumberFormat().format(context.parsed);
              } else if (context.raw !== null && context.raw !== undefined) {
                label += new Intl.NumberFormat().format(context.raw);
              }
            } else {
              // For other charts (bar, line), use context.parsed.y
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat().format(context.parsed.y);
              } else if (context.parsed !== null) {
                label += new Intl.NumberFormat().format(context.parsed);
              }
            }
            return label;
          }
        }
      },
    },
    scales: element.vizType !== 'pie_chart' ? {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat().format(value);
          }
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0,
        }
      }
    } : {},
    interaction: {
      intersect: false,
      mode: 'index',
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart',
    },
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-secondary-600">Loading chart...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center text-red-600">
        <div className="text-center">
          <div className="text-sm font-medium mb-1">Chart Error</div>
          <div className="text-xs">{error}</div>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="h-64 flex items-center justify-center text-secondary-500">
        <div className="text-center">
          <div className="text-sm font-medium mb-1">No Data</div>
          <div className="text-xs">Configure data source and filters</div>
        </div>
      </div>
    );
  }

  if (element.vizType === 'data_table') {
    return (
      <div className="h-64 overflow-auto">
        <table className="min-w-full divide-y divide-secondary-200 text-xs">
          <thead className="bg-secondary-50">
            <tr>
              {chartData.columns.map((col, index) => (
                <th key={index} className="px-2 py-1 text-left font-medium text-secondary-700">
                  {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200">
            {chartData.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {chartData.columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-2 py-1 text-secondary-900">
                    {row[col]?.toString() || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="h-64">
      {element.vizType === 'bar_chart' && <Bar data={chartData} options={chartOptions} />}
      {element.vizType === 'line_chart' && <Line data={chartData} options={chartOptions} />}
      {element.vizType === 'pie_chart' && <Pie data={chartData} options={chartOptions} />}
    </div>
  );
}

export default ChartRenderer;