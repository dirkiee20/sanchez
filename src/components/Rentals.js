import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Package, Edit, Trash2, Search, Clock, AlertTriangle, User, Phone, RotateCcw, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { rentalService } from '../services/rentalService';
import { clientService } from '../services/clientService';
import Pagination from './Pagination';
import { useAuth } from '../contexts/AuthContext';

function Rentals() {
  const { user } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [clients, setClients] = useState([]);
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRental, setEditingRental] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const itemsPerPage = 10;
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a pre-selected client from navigation
    const preSelectedClient = location.state?.preSelectedClient;
    if (preSelectedClient) {
      setSelectedClient(preSelectedClient);
      setShowModal(true);
      // Clear the navigation state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const loadData = async (page = 1, status = statusFilter) => {
      try {
        setLoading(true);
        const options = { page, limit: itemsPerPage };
        if (status !== 'all') {
          options.status = status;
        }
        console.log('Frontend: Loading rentals with options:', options);
        const [rentalsResponse, clientsData, equipmentData] = await Promise.all([
          rentalService.getAllRentals(options),
          clientService.getAllClients(),
          rentalService.getAvailableEquipment()
        ]);
        console.log('Frontend: Raw rentals response:', rentalsResponse);
        setRentals(rentalsResponse.data || rentalsResponse);
        setPagination(rentalsResponse.pagination || { totalItems: rentalsResponse.length, totalPages: 1 });
        console.log('Frontend: Rentals loaded:', rentalsResponse.data?.length || rentalsResponse.length, 'Total items:', rentalsResponse.pagination?.totalItems || rentalsResponse.length);
        console.log('Frontend: Pagination info:', rentalsResponse.pagination);
        setClients(clientsData);
        setAvailableEquipment(equipmentData);
      } catch (error) {
        console.error('Frontend: Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [statusFilter, itemsPerPage]);

  const filteredRentals = (Array.isArray(rentals) ? rentals : []).filter(rental => {
    const matchesSearch = rental.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          rental.equipment_name.toLowerCase().includes(searchTerm.toLowerCase());
    // Status filtering is now done server-side, so we only filter by search term here
    return matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'returned':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-green-500" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'returned':
        return <Package className="h-4 w-4 text-blue-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddRental = () => {
    setEditingRental(null);
    setSelectedClient(null);
    setShowModal(true);
  };

  const handleSelectClient = () => {
    setShowClientModal(true);
  };

  const handleSelectEquipment = () => {
    setShowEquipmentModal(true);
  };

  const handleClientFromModalSelected = (client) => {
    setSelectedClient(client);
    setShowClientModal(false);
    setShowModal(true);
  };

  const handleEquipmentFromModalSelected = (equipment) => {
    setSelectedEquipment(equipment);
    setShowEquipmentModal(false);
    setShowModal(true);
  };

  const handleEditRental = (rental) => {
    setEditingRental(rental);
    setShowModal(true);
  };

  const handleDeleteRental = async (id) => {
    if (window.confirm('Are you sure you want to delete this rental?')) {
      try {
        await rentalService.deleteRental(id);
        // Reload the data for current page
        const loadData = async (page = 1, status = statusFilter) => {
          try {
            setLoading(true);
            const options = { page, limit: itemsPerPage };
            if (status !== 'all') {
              options.status = status;
            }
            console.log('Frontend: Loading rentals with options:', options);
            const [rentalsResponse, clientsData, equipmentData] = await Promise.all([
              rentalService.getAllRentals(options),
              clientService.getAllClients(),
              rentalService.getAvailableEquipment()
            ]);
            console.log('Frontend: Raw rentals response:', rentalsResponse);
            setRentals(rentalsResponse.data || rentalsResponse);
            setPagination(rentalsResponse.pagination || { totalItems: rentalsResponse.length, totalPages: 1 });
            console.log('Frontend: Rentals loaded:', rentalsResponse.data?.length || rentalsResponse.length, 'Total items:', rentalsResponse.pagination?.totalItems || rentalsResponse.length);
            console.log('Frontend: Pagination info:', rentalsResponse.pagination);
            setClients(clientsData);
            setAvailableEquipment(equipmentData);
          } catch (error) {
            console.error('Frontend: Error loading data:', error);
          } finally {
            setLoading(false);
          }
        };
        await loadData(currentPage, statusFilter);
      } catch (error) {
        console.error('Error deleting rental:', error);
        alert('Error deleting rental');
      }
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    const loadData = async (pageNum = 1, status = statusFilter) => {
      try {
        setLoading(true);
        const options = { page: pageNum, limit: itemsPerPage };
        if (status !== 'all') {
          options.status = status;
        }
        console.log('Frontend: Loading rentals with options:', options);
        const [rentalsResponse, clientsData, equipmentData] = await Promise.all([
          rentalService.getAllRentals(options),
          clientService.getAllClients(),
          rentalService.getAvailableEquipment()
        ]);
        console.log('Frontend: Raw rentals response:', rentalsResponse);
        setRentals(rentalsResponse.data || rentalsResponse);
        setPagination(rentalsResponse.pagination || { totalItems: rentalsResponse.length, totalPages: 1 });
        console.log('Frontend: Rentals loaded:', rentalsResponse.data?.length || rentalsResponse.length, 'Total items:', rentalsResponse.pagination?.totalItems || rentalsResponse.length);
        console.log('Frontend: Pagination info:', rentalsResponse.pagination);
        setClients(clientsData);
        setAvailableEquipment(equipmentData);
      } catch (error) {
        console.error('Frontend: Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData(page, statusFilter);
  };

  const handleProcessReturn = (rental) => {
    // Navigate to returns page with pre-selected rental using React Router
    navigate('/returns', { state: { preSelectedRental: rental } });
  };

  const handleProcessPayment = (rental) => {
    // Navigate to payments page with pre-selected rental
    navigate('/payments', { state: { preSelectedRental: rental } });
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
          <h1 className="text-3xl font-bold text-secondary-900">Rentals</h1>
          <p className="text-secondary-600">Manage rental transactions</p>
        </div>
        <button
          onClick={handleAddRental}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Rental
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search rentals..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
            const loadData = async (page = 1, status = e.target.value) => {
              try {
                setLoading(true);
                const options = { page, limit: itemsPerPage };
                if (status !== 'all') {
                  options.status = status;
                }
                console.log('Frontend: Loading rentals with options:', options);
                const [rentalsResponse, clientsData, equipmentData] = await Promise.all([
                  rentalService.getAllRentals(options),
                  clientService.getAllClients(),
                  rentalService.getAvailableEquipment()
                ]);
                console.log('Frontend: Raw rentals response:', rentalsResponse);
                setRentals(rentalsResponse.data || rentalsResponse);
                setPagination(rentalsResponse.pagination || { totalItems: rentalsResponse.length, totalPages: 1 });
                console.log('Frontend: Rentals loaded:', rentalsResponse.data?.length || rentalsResponse.length, 'Total items:', rentalsResponse.pagination?.totalItems || rentalsResponse.length);
                console.log('Frontend: Pagination info:', rentalsResponse.pagination);
                setClients(clientsData);
                setAvailableEquipment(equipmentData);
              } catch (error) {
                console.error('Frontend: Error loading data:', error);
              } finally {
                setLoading(false);
              }
            };
            loadData(1, e.target.value);
          }}
          className="input-field w-48"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      {/* Rentals Table */}
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
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Rate/Hour
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {filteredRentals.map((rental) => (
                <tr key={rental.id} className="table-row">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-secondary-900">
                      {rental.client_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-secondary-900">{rental.equipment_name}</div>
                    <div className="text-sm text-secondary-500">{rental.equipment_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-secondary-900">
                      {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                    ₱{rental.rate_per_day}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                    {rental.quantity ?? 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                    ₱{parseFloat(rental.total_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(rental.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rental.status)}`}>
                        {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(rental.payment_status)}`}>
                      {rental.payment_status ? rental.payment_status.charAt(0).toUpperCase() + rental.payment_status.slice(1) : 'Unpaid'}
                    </span>
                    {rental.total_paid > 0 && (
                      <div className="text-xs text-secondary-500 mt-1">
                        ₱{parseFloat(rental.total_paid).toFixed(2)} / ₱{parseFloat(rental.total_amount).toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditRental(rental)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit Rental"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {rental.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleProcessReturn(rental)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Process Return"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleProcessPayment(rental)}
                            className="text-green-600 hover:text-green-900"
                            title="Process Payment"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteRental(rental.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Rental"
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

      {/* Rental Modal */}
      {showModal && (
        <RentalModal
          rental={editingRental}
          clients={clients}
          availableEquipment={availableEquipment}
          preSelectedClient={selectedClient}
          preSelectedEquipment={selectedEquipment}
          onClose={() => {
            setShowModal(false);
            setSelectedClient(null);
            setSelectedEquipment(null);
          }}
          onSave={async (rentalData) => {
            try {
              if (editingRental) {
                await rentalService.updateRental(editingRental.id, rentalData);
              } else {
                await rentalService.addRental(rentalData);
              }
              // Reload the data for current page
              const loadData = async (page = 1, status = statusFilter) => {
                try {
                  setLoading(true);
                  const options = { page, limit: itemsPerPage };
                  if (status !== 'all') {
                    options.status = status;
                  }
                  console.log('Frontend: Loading rentals with options:', options);
                  const [rentalsResponse, clientsData, equipmentData] = await Promise.all([
                    rentalService.getAllRentals(options),
                    clientService.getAllClients(),
                    rentalService.getAvailableEquipment()
                  ]);
                  console.log('Frontend: Raw rentals response:', rentalsResponse);
                  setRentals(rentalsResponse.data || rentalsResponse);
                  setPagination(rentalsResponse.pagination || { totalItems: rentalsResponse.length, totalPages: 1 });
                  console.log('Frontend: Rentals loaded:', rentalsResponse.data?.length || rentalsResponse.length, 'Total items:', rentalsResponse.pagination?.totalItems || rentalsResponse.length);
                  console.log('Frontend: Pagination info:', rentalsResponse.pagination);
                  setClients(clientsData);
                  setAvailableEquipment(equipmentData);
                } catch (error) {
                  console.error('Frontend: Error loading data:', error);
                } finally {
                  setLoading(false);
                }
              };
              await loadData(currentPage, statusFilter);
              setShowModal(false);
              setSelectedClient(null);
              setSelectedEquipment(null);
            } catch (error) {
              console.error('Error saving rental:', error);
              alert('Error saving rental');
            }
          }}
          onSelectClient={handleSelectClient}
          onSelectEquipment={handleSelectEquipment}
        />
      )}

      {/* Client Selection Modal */}
      {showClientModal && (
        <ClientSelectionModal
          clients={clients}
          onClose={() => setShowClientModal(false)}
          onSelectClient={handleClientFromModalSelected}
        />
      )}

      {/* Equipment Selection Modal */}
      {showEquipmentModal && (
        <EquipmentSelectionModal
          equipment={availableEquipment}
          onClose={() => setShowEquipmentModal(false)}
          onSelectEquipment={handleEquipmentFromModalSelected}
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

// Client Selection Modal Component
function ClientSelectionModal({ clients, onClose, onSelectClient }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = ((Array.isArray(clients) ? clients : clients?.data) || []).filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_number.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">Select Client</h2>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search clients..."
            className="input-field pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                onClick={() => onSelectClient(client)}
                className="p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-secondary-900">{client.name}</h3>
                    <p className="text-sm text-secondary-600 flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      {client.contact_number}
                    </p>
                    <p className="text-sm text-secondary-600">{client.project_site}</p>
                  </div>
                  <User className="h-5 w-5 text-secondary-400" />
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

// Equipment Selection Modal Component
function EquipmentSelectionModal({ equipment, onClose, onSelectEquipment }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEquipment = (Array.isArray(equipment) ? equipment : []).filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">Select Equipment</h2>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search equipment..."
            className="input-field pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Equipment List */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {filteredEquipment.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectEquipment(item)}
                className="p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-secondary-900">{item.name}</h3>
                    <p className="text-sm text-secondary-600">{item.type}</p>
                    <p className="text-sm text-secondary-600">{item.description}</p>
                    <p className="text-sm text-green-600 font-medium">₱{item.rate_per_day}/day</p>
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

// Rental Modal Component
function RentalModal({ rental, clients, availableEquipment, preSelectedClient, preSelectedEquipment, onClose, onSave, onSelectClient, onSelectEquipment }) {
  const [formData, setFormData] = useState({
    client_id: rental?.client_id || preSelectedClient?.id || '',
    equipment_id: rental?.equipment_id || '',
    start_date: rental?.start_date || '',
    end_date: rental?.end_date || '',
    rate_per_day: rental?.rate_per_day || '',
    total_amount: rental?.total_amount || '',
    quantity: rental?.quantity || 1,
    status: rental?.status || 'active'
  });

  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState(
    preSelectedClient || (rental?.client_id ? ((Array.isArray(clients) ? clients : clients?.data) || []).find(c => c.id === rental.client_id) : null)
  );

  // Initialize client when preSelectedClient is available
  useEffect(() => {
    if (preSelectedClient) {
      setSelectedClient(preSelectedClient);
      setClientSearchTerm(preSelectedClient.name);
    }
  }, [preSelectedClient]);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [showEquipmentSuggestions, setShowEquipmentSuggestions] = useState(false);
  const [selectedEquipmentItem, setSelectedEquipmentItem] = useState(
    preSelectedEquipment || (rental?.equipment_id ? availableEquipment.find(e => e.id === rental.equipment_id) : null)
  );

  // Initialize equipment search term when preSelectedEquipment is available
  useEffect(() => {
    if (preSelectedEquipment) {
      setEquipmentSearchTerm(preSelectedEquipment.name);
    }
  }, [preSelectedEquipment]);

  useEffect(() => {
    if (formData.equipment_id) {
      const equipment = availableEquipment.find(e => e.id === formData.equipment_id);
      setSelectedEquipment(equipment);
      if (equipment) {
        setFormData(prev => ({
          ...prev,
          rate_per_day: equipment.rate_per_day
        }));
      }
    }
  }, [formData.equipment_id, availableEquipment]);

  // Fix race condition: Ensure equipment data is loaded before setting form data
  useEffect(() => {
    if (preSelectedEquipment && availableEquipment.length > 0) {
      const equipment = availableEquipment.find(e => e.id === preSelectedEquipment.id);
      if (equipment) {
        setSelectedEquipmentItem(equipment);
        setFormData(prev => ({
          ...prev,
          equipment_id: equipment.id,
          rate_per_day: equipment.rate_per_day
        }));
        setEquipmentSearchTerm(equipment.name);
      }
    }
  }, [preSelectedEquipment, availableEquipment]);

  useEffect(() => {
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        client_id: selectedClient.id
      }));
      setClientSearchTerm(selectedClient.name);
      setShowClientSuggestions(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    if (selectedEquipmentItem) {
      setFormData(prev => ({
        ...prev,
        equipment_id: selectedEquipmentItem.id,
        rate_per_day: selectedEquipmentItem.rate_per_day
      }));
      setEquipmentSearchTerm(selectedEquipmentItem.name);
      setShowEquipmentSuggestions(false);
    }
  }, [selectedEquipmentItem]);

  useEffect(() => {
    if (formData.start_date && formData.end_date && formData.rate_per_day) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      // compute hours inclusive to the end of day for endDate
      const millis = (endDate.setHours(23,59,59,999) - startDate.setHours(0,0,0,0));
      const hours = Math.max(1, Math.ceil(millis / (1000 * 60 * 60)));
      const total = hours * parseFloat(formData.rate_per_day) * (parseInt(formData.quantity, 10) || 1);
      setFormData(prev => ({
        ...prev,
        total_amount: Number.isFinite(total) ? total.toFixed(2) : '0.00'
      }));
    }
  }, [formData.start_date, formData.end_date, formData.rate_per_day, formData.quantity]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting rental with formData:', formData);
    console.log('Selected client:', selectedClient);
    console.log('Selected equipment:', selectedEquipmentItem);
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleClientSearchChange = (e) => {
    const value = e.target.value;
    setClientSearchTerm(value);
    setShowClientSuggestions(true);

    // Clear selection if search term doesn't match current client
    if (selectedClient && !selectedClient.name.toLowerCase().includes(value.toLowerCase())) {
      setSelectedClient(null);
      setFormData(prev => ({
        ...prev,
        client_id: ''
      }));
    }

    // Auto-select if exact match found
    if (value.trim()) {
      const clientsArray = (Array.isArray(clients) ? clients : clients?.data) || [];
      const exactMatch = clientsArray.find(client =>
        client.name.toLowerCase() === value.toLowerCase() ||
        client.contact_number === value ||
        client.email.toLowerCase() === value.toLowerCase()
      );
      if (exactMatch) {
        setSelectedClient(exactMatch);
      }
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    // Close suggestions and populate the field immediately
    setShowClientSuggestions(false);
  };

  const handleEquipmentSearchChange = (e) => {
    const value = e.target.value;
    setEquipmentSearchTerm(value);
    setShowEquipmentSuggestions(true);

    // Clear selection if search term doesn't match current equipment
    if (selectedEquipmentItem && !selectedEquipmentItem.name.toLowerCase().includes(value.toLowerCase())) {
      setSelectedEquipmentItem(null);
      setFormData(prev => ({
        ...prev,
        equipment_id: '',
        rate_per_day: ''
      }));
    }

    // Auto-select if exact match found
    if (value.trim()) {
      const exactMatch = availableEquipment.find(equipment =>
        equipment.name.toLowerCase() === value.toLowerCase() ||
        equipment.type.toLowerCase() === value.toLowerCase()
      );
      if (exactMatch) {
        setSelectedEquipmentItem(exactMatch);
      }
    }
  };

  const handleEquipmentSelect = (equipment) => {
    setSelectedEquipmentItem(equipment);
  };

  const filteredClients = ((Array.isArray(clients) ? clients : clients?.data) || []).filter(client =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.contact_number.includes(clientSearchTerm) ||
    client.email.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.project_site.toLowerCase().includes(clientSearchTerm.toLowerCase())
  ).slice(0, 5); // Limit to 5 suggestions

  const filteredEquipment = (Array.isArray(availableEquipment) ? availableEquipment : []).filter(equipment =>
    equipment.name.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equipment.type.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equipment.description.toLowerCase().includes(equipmentSearchTerm.toLowerCase())
  ).slice(0, 5); // Limit to 5 suggestions

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">
          {rental ? 'Edit Rental' : 'New Rental'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Client
              </label>
              <div className="relative">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      className="input-field w-full"
                      value={clientSearchTerm}
                      onChange={handleClientSearchChange}
                      onFocus={() => setShowClientSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                      placeholder="Search clients by name, contact, or project site..."
                    />
                    {showClientSuggestions && clientSearchTerm && filteredClients.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredClients.map((client) => (
                          <div
                            key={client.id}
                            className="px-4 py-2 hover:bg-secondary-50 cursor-pointer border-b border-secondary-100 last:border-b-0"
                            onClick={() => handleClientSelect(client)}
                          >
                            <div className="font-medium text-secondary-900">{client.name}</div>
                            <div className="text-sm text-secondary-600 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {client.contact_number}
                            </div>
                            <div className="text-sm text-secondary-500">{client.project_site}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onSelectClient}
                    className="btn-secondary px-3 py-2"
                    title="Browse All Clients"
                  >
                    <User className="h-4 w-4" />
                  </button>
                </div>
                {selectedClient && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-sm font-medium text-green-800">Selected: {selectedClient.name}</div>
                    <div className="text-xs text-green-600">{selectedClient.contact_number} • {selectedClient.project_site}</div>
                  </div>
                )}
                {preSelectedClient && !selectedClient && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-sm font-medium text-green-800">Selected: {preSelectedClient.name}</div>
                    <div className="text-xs text-green-600">{preSelectedClient.contact_number} • {preSelectedClient.project_site}</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Equipment
              </label>
              <div className="relative">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      className="input-field w-full"
                      value={equipmentSearchTerm}
                      onChange={handleEquipmentSearchChange}
                      onFocus={() => setShowEquipmentSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowEquipmentSuggestions(false), 200)}
                      placeholder="Search equipment by name, type, or description..."
                    />
                    {showEquipmentSuggestions && equipmentSearchTerm && filteredEquipment.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredEquipment.map((equipment) => (
                          <div
                            key={equipment.id}
                            className="px-4 py-2 hover:bg-secondary-50 cursor-pointer border-b border-secondary-100 last:border-b-0"
                            onClick={() => handleEquipmentSelect(equipment)}
                          >
                            <div className="font-medium text-secondary-900">{equipment.name}</div>
                            <div className="text-sm text-secondary-600">{equipment.type}</div>
                            <div className="text-sm text-green-600 font-medium">₱{equipment.rate_per_day}/day</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onSelectEquipment}
                    className="btn-secondary px-3 py-2"
                    title="Browse All Equipment"
                  >
                    <Package className="h-4 w-4" />
                  </button>
                </div>
                {selectedEquipmentItem && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="text-sm font-medium text-blue-800">Selected: {selectedEquipmentItem.name}</div>
                    <div className="text-xs text-blue-600">{selectedEquipmentItem.type} • ₱{selectedEquipmentItem.rate_per_day}/day</div>
                  </div>
                )}
                {preSelectedEquipment && !selectedEquipmentItem && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="text-sm font-medium text-blue-800">Selected: {preSelectedEquipment.name}</div>
                    <div className="text-xs text-blue-600">{preSelectedEquipment.type} • ₱{preSelectedEquipment.rate_per_day}/day</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                required
                className="input-field"
                value={formData.start_date}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                required
                className="input-field"
                value={formData.end_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Rate per Hour (₱)
              </label>
              <input
                type="number"
                name="rate_per_day"
                step="0.01"
                required
                className="input-field"
                value={formData.rate_per_day}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                min="1"
                className="input-field"
                value={formData.quantity}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Total Amount (₱)
              </label>
              <input
                type="number"
                name="total_amount"
                step="0.01"
                required
                className="input-field"
                value={formData.total_amount}
                onChange={handleChange}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Status
              </label>
              <select
                name="status"
                className="input-field"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="overdue">Overdue</option>
                <option value="returned">Returned</option>
              </select>
            </div>
          </div>

          {selectedEquipment && (
            <div className="bg-secondary-50 p-4 rounded-lg">
              <h4 className="font-medium text-secondary-900 mb-2">Selected Equipment Details</h4>
              <p className="text-sm text-secondary-600">
                <strong>Type:</strong> {selectedEquipment.type}
              </p>
              <p className="text-sm text-secondary-600">
                <strong>Description:</strong> {selectedEquipment.description}
              </p>
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
              {rental ? 'Update' : 'Create'} Rental
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Rentals;
