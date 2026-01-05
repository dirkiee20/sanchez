import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle, XCircle, Edit, Trash2, Search, Package } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { returnService } from '../services/returnService';
import { getIpc } from '../utils/electronUtils';
import Pagination from './Pagination';
import { useAuth } from '../contexts/AuthContext';

function Returns() {
  const { user } = useAuth();
  const [returns, setReturns] = useState([]);
  const [activeRentals, setActiveRentals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingReturn, setEditingReturn] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const itemsPerPage = 10;
  const location = useLocation();

  useEffect(() => {
    // Listen for database ready signal
    const ipc = getIpc();
    if (ipc && ipc.on) {
      ipc.on('database-ready', () => {
        console.log('Returns: Database ready signal received');
        setDatabaseReady(true);
      });
    }

    // In development, assume database is ready after a short delay
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        setDatabaseReady(true);
      }, 200); // Reduced from 1000ms to 200ms
    }

    return () => {
      if (ipc && ipc.removeAllListeners) {
        ipc.removeAllListeners('database-ready');
      }
    };
  }, []);

  useEffect(() => {
    // Only load data after database is ready
    if (!databaseReady) return;
    loadData();
  }, [databaseReady]);

  useEffect(() => {
    // Check for pre-selected rental from navigation state or URL params
    const preSelectedRental = location.state?.preSelectedRental;
    if (preSelectedRental) {
      console.log('Pre-selected rental from navigation:', preSelectedRental);
      setSelectedRental(preSelectedRental);
      setShowModal(true);
      // Clear the navigation state to prevent re-triggering
      window.history.replaceState({}, document.title);
    } else if (activeRentals.length > 0) {
      // Fallback to URL params for backward compatibility
      const urlParams = new URLSearchParams(window.location.search);
      const rentalId = urlParams.get('rental_id');
      if (rentalId) {
        const preSelectedRental = activeRentals.find(r => r.id === rentalId);
        if (preSelectedRental) {
          console.log('Pre-selected rental from URL:', preSelectedRental);
          setSelectedRental(preSelectedRental);
          setShowModal(true);
          // Clear the URL param
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [location.state, activeRentals]);

  // Handle rental selection from browse modal
  useEffect(() => {
    if (selectedRental && !showModal) {
      console.log('Opening modal for selected rental:', selectedRental);
      setShowModal(true);
    }
  }, [selectedRental, showModal]);

  const loadData = async (page = 1) => {
    console.log('Returns: Starting data load');
    const startTime = performance.now();
    try {
      setLoading(true);
      // Add timeouts to prevent hanging
      const returnsPromise = returnService.getAllReturns({ page, limit: itemsPerPage });
      const returnsTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Returns data load timeout')), 5000)
      );

      const activeRentalsPromise = returnService.getActiveRentals();
      const activeRentalsTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Active rentals data load timeout')), 5000)
      );

      const [returnsResponse, activeRentalsData] = await Promise.all([
        Promise.race([returnsPromise, returnsTimeout]),
        Promise.race([activeRentalsPromise, activeRentalsTimeout])
      ]);

      console.log('Returns: Raw returns response:', returnsResponse);
      console.log('Returns: Active rentals data:', activeRentalsData);

      setReturns(returnsResponse.data || returnsResponse);
      setPagination(returnsResponse.pagination || { totalItems: returnsResponse.length, totalPages: 1 });
      setActiveRentals(activeRentalsData);
      const endTime = performance.now();
      console.log(`Returns: Data loaded in ${endTime - startTime}ms, ${returnsResponse.data?.length || returnsResponse.length} returns, ${activeRentalsData.length} active rentals`);
    } catch (error) {
      console.error('Returns: Error loading data:', error);
      const endTime = performance.now();
      console.log(`Returns: Data load failed in ${endTime - startTime}ms`);
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = returnItem.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.equipment_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = conditionFilter === 'all' || returnItem.condition === conditionFilter;
    return matchesSearch && matchesCondition;
  });

  const getConditionIcon = (condition) => {
    switch (condition) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'damaged':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'lost':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'damaged':
        return 'bg-yellow-100 text-yellow-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddReturn = () => {
    setEditingReturn(null);
    setSelectedRental(null);
    setShowModal(true);
  };

  const handleEditReturn = (returnItem) => {
    setEditingReturn(returnItem);
    setSelectedRental(null);
    setShowModal(true);
  };

  const handleSelectRental = () => {
    setShowRentalModal(true);
  };

  const handleRentalFromModalSelected = (rental) => {
    console.log('Rental selected from modal:', rental);
    setSelectedRental(rental);
    setShowRentalModal(false);
    setShowModal(true);
  };


  const handleDeleteReturn = async (id) => {
    if (window.confirm('Are you sure you want to delete this return record?')) {
      try {
        await returnService.deleteReturn(id, user?.id);
        await loadData(currentPage); // Reload the data for current page
      } catch (error) {
        console.error('Error deleting return:', error);
        alert('Error deleting return');
      }
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadData(page);
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
          <h1 className="text-3xl font-bold text-secondary-900">Returns</h1>
          <p className="text-secondary-600">Process equipment returns and track condition</p>
        </div>
        <button
          onClick={handleAddReturn}
          className="btn-primary flex items-center"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Process Return
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search returns..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
          className="input-field w-48"
        >
          <option value="all">All Conditions</option>
          <option value="good">Good</option>
          <option value="damaged">Damaged</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      {/* Returns Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Equipment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Rental Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Return Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Condition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Additional Charges
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {filteredReturns.map((returnItem) => (
                <tr key={returnItem.id} className="table-row">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-secondary-900">
                      {returnItem.client_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-secondary-900">{returnItem.equipment_name}</div>
                    <div className="text-sm text-secondary-500">{returnItem.equipment_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-secondary-900">
                      {new Date(returnItem.start_date).toLocaleDateString()} - {new Date(returnItem.end_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                    {new Date(returnItem.return_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getConditionIcon(returnItem.condition)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(returnItem.condition)}`}>
                        {returnItem.condition.charAt(0).toUpperCase() + returnItem.condition.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                    ₱{parseFloat(returnItem.additional_charges).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditReturn(returnItem)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteReturn(returnItem.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Modal */}
      {showModal && (
        <ReturnModal
          returnItem={editingReturn}
          activeRentals={activeRentals}
          preSelectedRental={selectedRental}
          onClose={() => {
            setShowModal(false);
            setSelectedRental(null);
          }}
          onSave={async (returnData) => {
            try {
              if (editingReturn) {
                await returnService.updateReturn(editingReturn.id, returnData, user?.id);
              } else {
                await returnService.addReturn(returnData, user?.id);
              }
              await loadData(currentPage); // Reload the data for current page
              setShowModal(false);
              setSelectedRental(null);
            } catch (error) {
              console.error('Error saving return:', error);

              // Handle specific error messages from backend
              let errorMessage = 'Error saving return';
              if (error.message) {
                if (error.message.includes('Payment status is')) {
                  errorMessage = error.message;
                } else if (error.message.includes('Rental not found')) {
                  errorMessage = 'The selected rental could not be found. Please refresh and try again.';
                } else if (error.message.includes('Insufficient equipment quantity')) {
                  errorMessage = 'Equipment quantity issue detected. Please contact support.';
                } else if (error.message.includes('timeout')) {
                  errorMessage = 'Request timed out. Please check your connection and try again.';
                } else {
                  errorMessage = `Error: ${error.message}`;
                }
              }

              alert(errorMessage);
            }
          }}
          onSelectRental={handleSelectRental}
        />
      )}

      {/* Rental Selection Modal */}
      {showRentalModal && (
        <RentalSelectionModal
          rentals={activeRentals}
          onClose={() => setShowRentalModal(false)}
          onSelectRental={handleRentalFromModalSelected}
        />
      )}

      {/* Pagination */}
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

// Rental Selection Modal Component
function RentalSelectionModal({ rentals, onClose, onSelectRental }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRentals = (Array.isArray(rentals) ? rentals : []).filter(rental =>
    rental.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rental.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rental.equipment_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">Select Active Rental</h2>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search active rentals..."
            className="input-field pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Rental List */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {filteredRentals.map((rental) => (
              <div
                key={rental.id}
                onClick={() => onSelectRental(rental)}
                className="p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-secondary-900">{rental.client_name}</h3>
                    <p className="text-sm text-secondary-600">{rental.equipment_name} ({rental.equipment_type})</p>
                    <p className="text-sm text-secondary-500">
                      {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-green-600 font-medium">₱{rental.rate_per_hour}/hour</p>
                  </div>
                  <Package className="h-5 w-5 text-secondary-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-secondary-200">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Return Modal Component
function ReturnModal({ returnItem, activeRentals, preSelectedRental, onClose, onSave, onSelectRental }) {
  const [formData, setFormData] = useState({
    rental_id: returnItem?.rental_id || '',
    return_date: returnItem?.return_date || new Date().toISOString().split('T')[0],
    condition: returnItem?.condition || 'good',
    damage_description: returnItem?.damage_description || '',
    additional_charges: returnItem?.additional_charges || 0,
    notes: returnItem?.notes || '',
    damaged_count: returnItem?.damaged_count || 1
  });

  const [selectedRental, setSelectedRental] = useState(null);
  const [rentalSearchTerm, setRentalSearchTerm] = useState('');
  const [showRentalSuggestions, setShowRentalSuggestions] = useState(false);
  const [selectedRentalItem, setSelectedRentalItem] = useState(
    preSelectedRental || (returnItem?.rental_id ? activeRentals.find(r => r.id === returnItem.rental_id) : null)
  );

  // Update selectedRentalItem when preSelectedRental changes (from browse modal)
  useEffect(() => {
    if (preSelectedRental) {
      console.log('Setting selectedRentalItem from preSelectedRental:', preSelectedRental);
      setSelectedRentalItem(preSelectedRental);
      setFormData(prev => ({
        ...prev,
        rental_id: preSelectedRental.id
      }));
    }
  }, [preSelectedRental]);

  // Initialize rental search term when preSelectedRental or selectedRental is available
  useEffect(() => {
    const rental = preSelectedRental || selectedRental;
    if (rental) {
      setRentalSearchTerm(`${rental.client_name} - ${rental.equipment_name}`);
    }
  }, [preSelectedRental, selectedRental]);

  useEffect(() => {
    if (formData.rental_id) {
      const rental = activeRentals.find(r => r.id === formData.rental_id);
      setSelectedRental(rental);
    }
  }, [formData.rental_id, activeRentals]);

  useEffect(() => {
    if (selectedRentalItem) {
      setFormData(prev => ({
        ...prev,
        rental_id: selectedRentalItem.id
      }));
      setRentalSearchTerm(`${selectedRentalItem.client_name} - ${selectedRentalItem.equipment_name}`);
      setShowRentalSuggestions(false);
    }
  }, [selectedRentalItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ensure rental_id is set before saving
    console.log('Submitting return with rental_id:', formData.rental_id, 'selectedRentalItem:', selectedRentalItem);
    if (!formData.rental_id || formData.rental_id === '') {
      alert('Please select a rental before processing the return.');
      return;
    }
    onSave(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRentalSearchChange = (e) => {
    const value = e.target.value;
    setRentalSearchTerm(value);
    setShowRentalSuggestions(true);

    // Clear selection if search term doesn't match current rental
    if (selectedRentalItem && !`${selectedRentalItem.client_name} - ${selectedRentalItem.equipment_name}`.toLowerCase().includes(value.toLowerCase())) {
      setSelectedRentalItem(null);
      setFormData(prev => ({
        ...prev,
        rental_id: ''
      }));
    }

    // Auto-select if exact match found
    if (value.trim()) {
      const exactMatch = activeRentals.find(rental =>
        `${rental.client_name} - ${rental.equipment_name}`.toLowerCase() === value.toLowerCase() ||
        rental.client_name.toLowerCase() === value.toLowerCase() ||
        rental.equipment_name.toLowerCase() === value.toLowerCase()
      );
      if (exactMatch) {
        setSelectedRentalItem(exactMatch);
        setFormData(prev => ({
          ...prev,
          rental_id: exactMatch.id
        }));
        setRentalSearchTerm(`${exactMatch.client_name} - ${exactMatch.equipment_name}`);
        setShowRentalSuggestions(false);
      }
    }
  };

  const handleRentalSelect = (rental) => {
    console.log('Rental selected from suggestions:', rental);
    setSelectedRentalItem(rental);
    setFormData(prev => ({
      ...prev,
      rental_id: rental.id
    }));
    setRentalSearchTerm(`${rental.client_name} - ${rental.equipment_name}`);
    setShowRentalSuggestions(false);
  };

  const filteredRentals = (Array.isArray(activeRentals) ? activeRentals : []).filter(rental =>
    rental.client_name.toLowerCase().includes(rentalSearchTerm.toLowerCase()) ||
    rental.equipment_name.toLowerCase().includes(rentalSearchTerm.toLowerCase()) ||
    rental.equipment_type.toLowerCase().includes(rentalSearchTerm.toLowerCase()) ||
    (rental.start_date && rental.start_date.toString().toLowerCase().includes(rentalSearchTerm.toLowerCase())) ||
    (rental.end_date && rental.end_date.toString().toLowerCase().includes(rentalSearchTerm.toLowerCase()))
  ).slice(0, 5); // Limit to 5 suggestions

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">
          {returnItem ? 'Edit Return' : 'Process Return'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Active Rental
            </label>
            <div className="relative">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    className="input-field w-full"
                    value={rentalSearchTerm}
                    onChange={handleRentalSearchChange}
                    onFocus={() => setShowRentalSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowRentalSuggestions(false), 150)}
                    placeholder="Search active rentals by client or equipment..."
                    disabled={!!returnItem} // Disable if editing
                  />
                  {showRentalSuggestions && rentalSearchTerm && filteredRentals.length > 0 && !returnItem && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredRentals.map((rental) => (
                        <div
                          key={rental.id}
                          className="px-4 py-2 hover:bg-secondary-50 cursor-pointer border-b border-secondary-100 last:border-b-0"
                          onClick={() => handleRentalSelect(rental)}
                        >
                          <div className="font-medium text-secondary-900">{rental.client_name}</div>
                          <div className="text-sm text-secondary-600">{rental.equipment_name} ({rental.equipment_type})</div>
                          <div className="text-sm text-secondary-500">
                            {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {!returnItem && (
                  <button
                    type="button"
                    onClick={onSelectRental}
                    className="btn-secondary px-3 py-2"
                    title="Browse All Active Rentals"
                  >
                    <Package className="h-4 w-4" />
                  </button>
                )}
              </div>
              {selectedRentalItem && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <div className="text-sm font-medium text-green-800">Selected: {selectedRentalItem.client_name}</div>
                  <div className="text-xs text-green-600">{selectedRentalItem.equipment_name} • {selectedRentalItem.equipment_type}</div>
                </div>
              )}
              {preSelectedRental && !selectedRentalItem && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <div className="text-sm font-medium text-green-800">Selected: {preSelectedRental.client_name}</div>
                  <div className="text-xs text-green-600">{preSelectedRental.equipment_name} • {preSelectedRental.equipment_type}</div>
                </div>
              )}
            </div>
          </div>

          {selectedRental && (
            <div className="bg-secondary-50 p-4 rounded-lg">
              <h4 className="font-medium text-secondary-900 mb-2">Rental Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Client:</strong> {selectedRental.client_name}</p>
                  <p><strong>Equipment:</strong> {selectedRental.equipment_name}</p>
                </div>
                <div>
                  <p><strong>Type:</strong> {selectedRental.equipment_type}</p>
                  <p><strong>Rate:</strong> ₱{selectedRental.rate_per_hour}/hour</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Return Date
              </label>
              <input
                type="date"
                name="return_date"
                required
                className="input-field"
                value={formData.return_date}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Equipment Condition
              </label>
              <select
                name="condition"
                required
                className="input-field"
                value={formData.condition}
                onChange={handleChange}
              >
                <option value="good">Good</option>
                <option value="damaged">Damaged</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>

          {formData.condition === 'damaged' && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Damage Description
              </label>
              <textarea
                name="damage_description"
                rows={3}
                className="input-field"
                value={formData.damage_description}
                onChange={handleChange}
                placeholder="Describe the damage found on the equipment..."
              />
            </div>
          )}

          {formData.condition === 'damaged' && selectedRental && selectedRental.quantity > 1 && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Number of Damaged Items
              </label>
              <input
                type="number"
                name="damaged_count"
                min="1"
                max={selectedRental.quantity}
                className="input-field"
                value={formData.damaged_count}
                onChange={handleChange}
                placeholder="How many items are damaged?"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Total rented: {selectedRental.quantity} items
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Additional Charges (₱)
              </label>
              <input
                type="number"
                name="additional_charges"
                step="0.01"
                min="0"
                className="input-field"
                value={formData.additional_charges}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Notes
              </label>
              <input
                type="text"
                name="notes"
                className="input-field"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          {formData.condition === 'damaged' && formData.additional_charges > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <h4 className="font-medium text-yellow-800">Damage Charges Applied</h4>
                  <p className="text-sm text-yellow-700">
                    Additional charges of ₱{formData.additional_charges} will be applied to the client.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {returnItem ? 'Update' : 'Process'} Return
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Returns;