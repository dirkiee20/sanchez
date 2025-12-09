import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, DollarSign, Receipt, Calendar, Edit, Trash2, Search, User, Phone } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { paymentService } from '../services/paymentService';
import { rentalService } from '../services/rentalService';
import Pagination from './Pagination';
import { useAuth } from '../contexts/AuthContext';

function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });
  const [selectedRental, setSelectedRental] = useState(null);
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [paymentStats, setPaymentStats] = useState({
    totalPayments: 0,
    thisMonth: 0,
    outstanding: 0
  });
  const itemsPerPage = 10;
  const location = useLocation();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Check for pre-selected rental from navigation state
    const preSelectedRental = location.state?.preSelectedRental;
    if (preSelectedRental) {
      setSelectedRental(preSelectedRental);
      setShowModal(true);
      // Clear the navigation state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      const [paymentsResponse, rentalsData] = await Promise.all([
        paymentService.getAllPayments({ page, limit: itemsPerPage }),
        rentalService.getAllRentals({ page: 1, limit: 1000 }) // Get all rentals for payment association
      ]);
      setPayments(paymentsResponse.data || paymentsResponse);
      setPagination(paymentsResponse.pagination || { totalItems: paymentsResponse.length, totalPages: 1 });
      setRentals(rentalsData.data || rentalsData);
      console.log('Payments loaded:', paymentsResponse.data?.length || paymentsResponse.length);
      console.log('Rentals loaded for payments:', rentalsData.data?.length || rentalsData.length);

      // Calculate dynamic payment stats
      calculatePaymentStats(paymentsResponse.data || paymentsResponse, rentalsData.data || rentalsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePaymentStats = (paymentsData, rentalsData) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    let totalPayments = 0;
    let thisMonthPayments = 0;
    let outstandingAmount = 0;

    // Calculate total payments and this month's payments
    paymentsData.forEach(payment => {
      const paymentAmount = parseFloat(payment.amount);
      totalPayments += paymentAmount;

      const paymentDate = new Date(payment.payment_date);
      if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
        thisMonthPayments += paymentAmount;
      }
    });

    // Calculate outstanding amount (total rental amounts minus payments)
    rentalsData.forEach(rental => {
      const totalPaid = paymentsData
        .filter(payment => payment.rental_id === rental.id)
        .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

      const outstanding = parseFloat(rental.total_amount) - totalPaid;
      if (outstanding > 0) {
        outstandingAmount += outstanding;
      }
    });

    setPaymentStats({
      totalPayments,
      thisMonth: thisMonthPayments,
      outstanding: outstandingAmount
    });
  };

  const filteredPayments = payments.filter(payment => {
    const rental = (Array.isArray(rentals) ? rentals : []).find(r => r.id === payment.rental_id);
    const clientName = rental?.client_name || '';
    const equipmentName = rental?.equipment_name || '';
    const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          equipmentName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getPaymentTypeColor = (type) => {
    switch (type) {
      case 'full':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddPayment = () => {
    setEditingPayment(null);
    setSelectedRental(null);
    setShowModal(true);
  };

  const handleSelectRental = () => {
    setShowRentalModal(true);
  };

  const handleRentalFromModalSelected = (rental) => {
    setSelectedRental(rental);
    setShowRentalModal(false);
    // Don't open the modal immediately - just set the rental for the Payments component
  };

  const handleRentalSelected = (rental) => {
    setSelectedRental(rental);
    setShowRentalModal(false);
    // Don't automatically open the payment modal - just set the rental for later use
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setShowModal(true);
  };

  const handleDeletePayment = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        await paymentService.deletePayment(id);
        await loadData(currentPage); // Reload the data for current page
      } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Error deleting payment');
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
          <h1 className="text-3xl font-bold text-secondary-900">Payments</h1>
          <p className="text-secondary-600">Record and track payments</p>
        </div>
        <button
          onClick={handleAddPayment}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </button>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-500 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Total Payments</p>
              <p className="text-2xl font-bold text-secondary-900">₱{paymentStats.totalPayments.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-500 rounded-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">This Month</p>
              <p className="text-2xl font-bold text-secondary-900">₱{paymentStats.thisMonth.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-500 rounded-lg">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Outstanding</p>
              <p className="text-2xl font-bold text-secondary-900">₱{paymentStats.outstanding.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Rental ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Equipment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {filteredPayments.map((payment) => {
                const rental = (Array.isArray(rentals) ? rentals : []).find(r => r.id === payment.rental_id);
                return (
                  <tr key={payment.id} className="table-row">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                      #{payment.rental_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                      {rental?.client_name || 'Unknown Client'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                      ₱{parseFloat(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentTypeColor(payment.payment_type)}`}>
                        {payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-900">
                      {rental?.equipment_name || 'Unknown Equipment'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditPayment(payment)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <PaymentModal
          payment={editingPayment}
          rentals={rentals}
          preSelectedRental={selectedRental}
          onClose={() => {
            setShowModal(false);
            setSelectedRental(null);
          }}
          onSave={async (paymentData) => {
            try {
              if (editingPayment) {
                await paymentService.updatePayment(editingPayment.id, paymentData);
              } else {
                await paymentService.addPayment(paymentData);
              }
              await loadData(currentPage); // Reload the data for current page
              setShowModal(false);
              setSelectedRental(null);
            } catch (error) {
              console.error('Error saving payment:', error);
              alert('Error saving payment');
            }
          }}
          onSelectRental={handleSelectRental}
        />
      )}

      {/* Rental Selection Modal */}
      {showRentalModal && (
        <RentalSelectionModal
          rentals={rentals}
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
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">Select Rental for Payment</h2>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search rentals..."
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
                    <p className="text-sm text-green-600 font-medium">₱{rental.total_amount}</p>
                  </div>
                  <DollarSign className="h-5 w-5 text-secondary-400" />
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

// Payment Modal Component
function PaymentModal({ payment, rentals, preSelectedRental, onClose, onSave, onSelectRental }) {
  const [formData, setFormData] = useState({
    rental_id: payment?.rental_id || '',
    amount: payment?.amount || '',
    payment_type: payment?.payment_type || 'full',
    payment_date: payment?.payment_date || new Date().toISOString().split('T')[0],
    notes: payment?.notes || ''
  });
  const [rentalSearchTerm, setRentalSearchTerm] = useState('');
  const [showRentalSuggestions, setShowRentalSuggestions] = useState(false);
  const [selectedRental, setSelectedRental] = useState(
    preSelectedRental || (payment?.rental_id ? rentals.find(r => r.id === payment.rental_id) : null)
  );

  // Initialize rental search term when preSelectedRental is available
  useEffect(() => {
    if (preSelectedRental) {
      setRentalSearchTerm(`${preSelectedRental.client_name} - ${preSelectedRental.equipment_name} - ₱${preSelectedRental.total_amount}`);
      setSelectedRental(preSelectedRental);
    }
  }, [preSelectedRental]);

  useEffect(() => {
    if (selectedRental) {
      setFormData(prev => ({
        ...prev,
        rental_id: selectedRental.id
      }));
      setRentalSearchTerm(`${selectedRental.client_name} - ${selectedRental.equipment_name} - ₱${selectedRental.total_amount}`);
      setShowRentalSuggestions(false);
    }
  }, [selectedRental]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Ensure rental_id is set before saving
    if (!formData.rental_id || formData.rental_id === '') {
      alert('Please select a rental before recording the payment.');
      return;
    }

    // Check if rental is already fully paid
    try {
      const existingPayments = await paymentService.getPaymentsByRental(formData.rental_id);
      const selectedRental = rentals.find(r => r.id === formData.rental_id);
      if (selectedRental) {
        const totalPaid = existingPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
        const totalAmount = parseFloat(selectedRental.total_amount);

        if (totalPaid >= totalAmount) {
          alert('This rental has already been fully paid. You cannot record additional payments.');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      // Continue with payment if we can't check status
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
    if (selectedRental && !`${selectedRental.client_name} - ${selectedRental.equipment_name} - ₱${selectedRental.total_amount}`.toLowerCase().includes(value.toLowerCase())) {
      setSelectedRental(null);
      setFormData(prev => ({
        ...prev,
        rental_id: ''
      }));
    }

    // Auto-select if exact match found
    if (value.trim()) {
      const exactMatch = rentals.find(rental =>
        `${rental.client_name} - ${rental.equipment_name} - ₱${rental.total_amount}`.toLowerCase() === value.toLowerCase() ||
        rental.client_name.toLowerCase() === value.toLowerCase() ||
        rental.equipment_name.toLowerCase() === value.toLowerCase()
      );
      if (exactMatch) {
        setSelectedRental(exactMatch);
        setFormData(prev => ({
          ...prev,
          rental_id: exactMatch.id
        }));
        setRentalSearchTerm(`${exactMatch.client_name} - ${exactMatch.equipment_name} - ₱${exactMatch.total_amount}`);
        setShowRentalSuggestions(false);
      }
    }
  };

  const handleRentalSelect = (rental) => {
    setSelectedRental(rental);
    setRentalSearchTerm(`${rental.client_name} - ${rental.equipment_name} - ₱${rental.total_amount}`);
    setShowRentalSuggestions(false);
  };

  const filteredRentals = (Array.isArray(rentals) ? rentals : []).filter(rental =>
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
          {payment ? 'Edit Payment' : 'Record Payment'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Rental
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
                      onBlur={() => setTimeout(() => setShowRentalSuggestions(false), 200)}
                      placeholder="Search rentals by client or equipment..."
                    />
                    {showRentalSuggestions && rentalSearchTerm && filteredRentals.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredRentals.map((rental) => (
                          <div
                            key={rental.id}
                            className="px-4 py-2 hover:bg-secondary-50 cursor-pointer border-b border-secondary-100 last:border-b-0"
                            onClick={() => handleRentalSelect(rental)}
                          >
                            <div className="font-medium text-secondary-900">{rental.client_name}</div>
                            <div className="text-sm text-secondary-600">{rental.equipment_name} ({rental.equipment_type})</div>
                            <div className="text-sm text-green-600 font-medium">₱{rental.total_amount}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onSelectRental}
                    className="btn-secondary px-3 py-2"
                    title="Browse All Rentals"
                  >
                    <DollarSign className="h-4 w-4" />
                  </button>
                </div>
                {selectedRental && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-sm font-medium text-green-800">Selected: {selectedRental.client_name}</div>
                    <div className="text-xs text-green-600">{selectedRental.equipment_name} • ₱{selectedRental.total_amount}</div>
                  </div>
                )}
                {preSelectedRental && !selectedRental && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-sm font-medium text-green-800">Selected: {preSelectedRental.client_name}</div>
                    <div className="text-xs text-green-600">{preSelectedRental.equipment_name} • ₱{preSelectedRental.total_amount}</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Amount (₱)
              </label>
              <input
                type="number"
                name="amount"
                step="0.01"
                required
                className="input-field"
                value={formData.amount}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Payment Type
              </label>
              <select
                name="payment_type"
                className="input-field"
                value={formData.payment_type}
                onChange={handleChange}
              >
                <option value="full">Full Payment</option>
                <option value="partial">Partial Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                name="payment_date"
                required
                className="input-field"
                value={formData.payment_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              rows="3"
              className="input-field"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Optional notes about the payment"
            />
          </div>

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
              {payment ? 'Update' : 'Record'} Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Payments;
