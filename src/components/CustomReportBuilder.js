import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { getIpc } from '../utils/electronUtils';
import ChartRenderer from './ChartRenderer';
import {
  Database,
  Filter,
  BarChart3,
  Table,
  PieChart,
  TrendingUp,
  Calendar,
  DollarSign,
  Save,
  Play,
  Trash2,
  Settings
} from 'lucide-react';

function CustomReportBuilder() {
  const [reportElements, setReportElements] = useState([]);
  const [selectedDataSources, setSelectedDataSources] = useState([]);
  const [filters, setFilters] = useState([]);
  const [reportName, setReportName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Available data sources
  const dataSources = [
    { id: 'clients', name: 'Clients', icon: Database, fields: ['name', 'contact_number', 'email', 'project_site'] },
    { id: 'equipment', name: 'Equipment', icon: Database, fields: ['name', 'type', 'rate_per_day', 'status', 'quantity_total'] },
    { id: 'rentals', name: 'Rentals', icon: Database, fields: ['start_date', 'end_date', 'total_amount', 'status', 'payment_status'] },
    { id: 'payments', name: 'Payments', icon: Database, fields: ['amount', 'payment_type', 'payment_date', 'notes'] },
    { id: 'returns', name: 'Returns', icon: Database, fields: ['return_date', 'condition', 'additional_charges'] }
  ];

  // Available filters
  const availableFilters = [
    { id: 'date_range', name: 'Date Range', type: 'date', icon: Calendar },
    { id: 'amount_range', name: 'Amount Range', type: 'number', icon: DollarSign },
    { id: 'status_filter', name: 'Status Filter', type: 'select', icon: Filter },
    { id: 'text_search', name: 'Text Search', type: 'text', icon: Filter }
  ];

  // Available visualizations
  const visualizations = [
    { id: 'bar_chart', name: 'Bar Chart', icon: BarChart3, type: 'chart' },
    { id: 'pie_chart', name: 'Pie Chart', icon: PieChart, type: 'chart' },
    { id: 'line_chart', name: 'Line Chart', icon: TrendingUp, type: 'chart' },
    { id: 'data_table', name: 'Data Table', icon: Table, type: 'table' }
  ];

  const addDataSource = useCallback((dataSource) => {
    if (!selectedDataSources.find(ds => ds.id === dataSource.id)) {
      setSelectedDataSources(prev => [...prev, dataSource]);
    }
  }, [selectedDataSources]);

  const removeDataSource = useCallback((dataSourceId) => {
    setSelectedDataSources(prev => prev.filter(ds => ds.id !== dataSourceId));
  }, []);

  const addFilter = useCallback((filterType) => {
    const newFilter = {
      id: Date.now(),
      type: filterType.id,
      name: filterType.name,
      value: filterType.type === 'date' ? { start: '', end: '' } :
             filterType.type === 'number' ? { min: '', max: '' } :
             filterType.type === 'select' ? [] : ''
    };
    setFilters(prev => [...prev, newFilter]);
  }, []);

  const updateFilter = useCallback((filterId, value) => {
    setFilters(prev => prev.map(filter =>
      filter.id === filterId ? { ...filter, value } : filter
    ));
  }, []);

  const removeFilter = useCallback((filterId) => {
    setFilters(prev => prev.filter(filter => filter.id !== filterId));
  }, []);

  const addVisualization = useCallback((vizType) => {
    const newElement = {
      id: Date.now(),
      type: 'visualization',
      vizType: vizType.id,
      name: vizType.name,
      config: {
        title: '',
        xAxis: '',
        yAxis: '',
        dataSource: '',
        filters: []
      }
    };
    setReportElements(prev => [...prev, newElement]);
  }, []);

  const updateVisualization = useCallback((elementId, config) => {
    setReportElements(prev => prev.map(element =>
      element.id === elementId ? { ...element, config: { ...element.config, ...config } } : element
    ));
  }, []);

  const removeElement = useCallback((elementId) => {
    setReportElements(prev => prev.filter(element => element.id !== elementId));
  }, []);

  const generateReport = async () => {
    if (selectedDataSources.length === 0) {
      alert('Please select at least one data source');
      return;
    }

    setIsGenerating(true);
    try {
      const ipc = getIpc();
      const reportConfig = {
        name: reportName,
        dataSources: selectedDataSources.map(ds => ({
          id: ds.id,
          name: ds.name,
          fields: ds.fields
        })),
        filters: filters.map(f => ({
          id: f.id,
          type: f.type,
          name: f.name,
          value: f.value
        })),
        elements: reportElements.map(el => ({
          id: el.id,
          type: el.type,
          vizType: el.vizType,
          name: el.name,
          config: el.config
        }))
      };

      console.log('Generating custom report with config:', reportConfig);
      const result = await ipc.invoke('db-generate-custom-report', reportConfig);

      alert(`Custom report generated successfully! Found ${result.recordCount} records from: ${result.dataSources.join(', ')}`);
      console.log('Custom report result:', result);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveReportTemplate = () => {
    if (!reportName.trim()) {
      alert('Please enter a report name');
      return;
    }

    const template = {
      name: reportName,
      dataSources: selectedDataSources,
      filters,
      elements: reportElements,
      createdAt: new Date().toISOString()
    };

    // Save to localStorage for now (could be saved to database)
    const savedTemplates = JSON.parse(localStorage.getItem('reportTemplates') || '[]');
    savedTemplates.push(template);
    localStorage.setItem('reportTemplates', JSON.stringify(savedTemplates));

    alert('Report template saved successfully!');
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">Custom Report Builder</h1>
            <p className="text-secondary-600">Create custom reports by dragging and dropping elements</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Report Name"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="input-field"
            />
            <button
              onClick={saveReportTemplate}
              className="btn-secondary flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </button>
            <button
              onClick={generateReport}
              disabled={isGenerating}
              className="btn-primary flex items-center"
            >
              <Play className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Tools */}
          <div className="col-span-3 space-y-6">
            {/* Data Sources */}
            <div className="card p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Data Sources
              </h3>
              <div className="space-y-2">
                {dataSources.map((source) => {
                  const Icon = source.icon;
                  const isSelected = selectedDataSources.find(ds => ds.id === source.id);
                  return (
                    <div
                      key={source.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'
                      }`}
                      onClick={() => isSelected ? removeDataSource(source.id) : addDataSource(source)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Icon className="h-4 w-4 mr-2 text-primary-600" />
                          <span className="font-medium">{source.name}</span>
                        </div>
                        {isSelected && <span className="text-primary-600">✓</span>}
                      </div>
                      <div className="text-xs text-secondary-500 mt-1">
                        {source.fields.join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filters
              </h3>
              <div className="space-y-2">
                {availableFilters.map((filter) => {
                  const Icon = filter.icon;
                  return (
                    <div
                      key={filter.id}
                      className="p-3 border border-secondary-200 rounded-lg cursor-pointer hover:border-secondary-300 transition-colors"
                      onClick={() => addFilter(filter)}
                    >
                      <div className="flex items-center">
                        <Icon className="h-4 w-4 mr-2 text-primary-600" />
                        <span className="font-medium">{filter.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visualizations */}
            <div className="card p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Visualizations
              </h3>
              <div className="space-y-2">
                {visualizations.map((viz) => {
                  const Icon = viz.icon;
                  return (
                    <div
                      key={viz.id}
                      className="p-3 border border-secondary-200 rounded-lg cursor-pointer hover:border-secondary-300 transition-colors"
                      onClick={() => addVisualization(viz)}
                    >
                      <div className="flex items-center">
                        <Icon className="h-4 w-4 mr-2 text-primary-600" />
                        <span className="font-medium">{viz.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Canvas */}
          <div className="col-span-9">
            {/* Active Filters */}
            {filters.length > 0 && (
              <div className="card p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Active Filters</h3>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <div key={filter.id} className="flex items-center bg-secondary-100 rounded-lg p-2">
                      <span className="text-sm font-medium mr-2">{filter.name}:</span>
                      {filter.type === 'date_range' && (
                        <div className="flex gap-1">
                          <input
                            type="date"
                            placeholder="Start"
                            value={filter.value.start || ''}
                            onChange={(e) => updateFilter(filter.id, { ...filter.value, start: e.target.value })}
                            className="text-xs p-1 border rounded"
                          />
                          <input
                            type="date"
                            placeholder="End"
                            value={filter.value.end || ''}
                            onChange={(e) => updateFilter(filter.id, { ...filter.value, end: e.target.value })}
                            className="text-xs p-1 border rounded"
                          />
                        </div>
                      )}
                      {filter.type === 'amount_range' && (
                        <div className="flex gap-1">
                          <input
                            type="number"
                            placeholder="Min"
                            value={filter.value.min || ''}
                            onChange={(e) => updateFilter(filter.id, { ...filter.value, min: e.target.value })}
                            className="text-xs p-1 border rounded w-16"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={filter.value.max || ''}
                            onChange={(e) => updateFilter(filter.id, { ...filter.value, max: e.target.value })}
                            className="text-xs p-1 border rounded w-16"
                          />
                        </div>
                      )}
                      {filter.type === 'status_filter' && (
                        <select
                          multiple
                          value={filter.value || []}
                          onChange={(e) => {
                            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                            updateFilter(filter.id, selectedOptions);
                          }}
                          className="text-xs p-1 border rounded max-h-20"
                        >
                          <option value="active">Active</option>
                          <option value="returned">Returned</option>
                          <option value="overdue">Overdue</option>
                          <option value="paid">Paid</option>
                          <option value="partial">Partial</option>
                          <option value="unpaid">Unpaid</option>
                          <option value="available">Available</option>
                          <option value="rented">Rented</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="good">Good</option>
                          <option value="damaged">Damaged</option>
                          <option value="lost">Lost</option>
                        </select>
                      )}
                      {filter.type === 'text_search' && (
                        <input
                          type="text"
                          placeholder="Search..."
                          value={filter.value || ''}
                          onChange={(e) => updateFilter(filter.id, e.target.value)}
                          className="text-xs p-1 border rounded"
                        />
                      )}
                      <button
                        onClick={() => removeFilter(filter.id)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Report Canvas */}
            <div className="card p-6 min-h-96">
              <h3 className="text-lg font-semibold mb-4">Report Canvas</h3>
              {reportElements.length === 0 ? (
                <div className="text-center py-12 text-secondary-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Drag visualizations here to build your report</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportElements.map((element, index) => (
                    <div key={element.id} className="border border-secondary-200 rounded-lg p-4 bg-secondary-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          {element.vizType === 'bar_chart' && <BarChart3 className="h-5 w-5 mr-2 text-primary-600" />}
                          {element.vizType === 'pie_chart' && <PieChart className="h-5 w-5 mr-2 text-primary-600" />}
                          {element.vizType === 'line_chart' && <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />}
                          {element.vizType === 'data_table' && <Table className="h-5 w-5 mr-2 text-primary-600" />}
                          <span className="font-medium">{element.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {/* Configure element */}}
                            className="text-secondary-500 hover:text-secondary-700"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeElement(element.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Element Configuration */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={element.config.title}
                            onChange={(e) => updateVisualization(element.id, { title: e.target.value })}
                            className="input-field text-sm"
                            placeholder="Chart title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Data Source
                          </label>
                          <select
                            value={element.config.dataSource}
                            onChange={(e) => updateVisualization(element.id, { dataSource: e.target.value })}
                            className="input-field text-sm"
                          >
                            <option value="">Select data source</option>
                            {selectedDataSources.map(ds => (
                              <option key={ds.id} value={ds.id}>{ds.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Live Chart Preview */}
                      <div className="mt-4 h-64 bg-secondary-50 rounded-lg border border-secondary-200 p-2">
                        <ChartRenderer
                          element={element}
                          dataSources={selectedDataSources}
                          filters={filters}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}

export default CustomReportBuilder;