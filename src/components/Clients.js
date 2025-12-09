import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clientService } from '../services/clientService';
import { getIpc } from '../utils/electronUtils';
import Pagination from './Pagination';
import { useAuth } from '../contexts/AuthContext';

function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for database ready signal
    const ipc = getIpc();
    if (ipc && ipc.on) {
      ipc.on('database-ready', () => {
        console.log('Clients: Database ready signal received');
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
    loadClients();
  }, [databaseReady]);

  const loadClients = async (page = 1) => {
    console.log('Clients: Starting data load for page:', page);
    const startTime = performance.now();
    try {
      setLoading(true);
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Clients data load timeout')), 5000)
      );
      const dataPromise = clientService.getAllClients({ page, limit: itemsPerPage });
      const response = await Promise.race([dataPromise, timeoutPromise]);

      setClients(response.data || response);
      setPagination(response.pagination || { totalItems: response.length, totalPages: 1 });
      setCurrentPage(page);

      const endTime = performance.now();
      console.log(`Clients: Data loaded in ${endTime - startTime}ms, ${response.data?.length || response.length} clients`);
    } catch (error) {
      console.error('Clients: Error loading clients:', error);
      const endTime = performance.now();
      console.log(`Clients: Data load failed in ${endTime - startTime}ms`);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = (Array.isArray(clients) ? clients : []).filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_number.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClient = () => {
    console.log('Add Client button clicked');
    setEditingClient(null);
    setShowModal(true);
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientService.deleteClient(id);
        await loadClients(currentPage); // Reload the list for current page
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('Error deleting client');
      }
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadClients(page);
  };

  const handleCreateRental = (client) => {
    // Navigate to rentals with client pre-selected
    navigate('/rentals/new', { state: { preSelectedClient: client } });
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
          <h1 className="text-3xl font-bold text-secondary-900">Clients</h1>
          <p className="text-secondary-600">Manage your client database</p>
        </div>
        <button
          onClick={handleAddClient}
          className="btn-primary flex items-center"
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-secondary-400" />
        <input
          type="text"
          placeholder="Search clients..."
          className="input-field pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Clients Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Project Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="table-row">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-secondary-900">
                        {client.name}
                      </div>
                      <div className="text-sm text-secondary-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {client.address}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-secondary-900 flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      {client.contact_number}
                    </div>
                    <div className="text-sm text-secondary-500 flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      {client.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                    {client.project_site}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditClient(client)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit Client"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleCreateRental(client)}
                        className="text-green-600 hover:text-green-900"
                        title="Create Rental for this Client"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Client"
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

      {/* Client Modal */}
      {showModal && (
        <ClientModal
          client={editingClient}
          onClose={() => setShowModal(false)}
          onSave={async (clientData) => {
            try {
              if (editingClient) {
                await clientService.updateClient(editingClient.id, clientData);
              } else {
                await clientService.addClient(clientData);
              }
              await loadClients(currentPage); // Reload the list for current page
              setShowModal(false);
            } catch (error) {
              console.error('Error saving client:', error);
              alert('Error saving client');
            }
          }}
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

// Client Modal Component
function ClientModal({ client, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    contact_number: client?.contact_number || '',
    email: client?.email || '',
    project_site: client?.project_site || '',
    address: client?.address || ''
  });
  const [errors, setErrors] = useState({});
  const [existingClients, setExistingClients] = useState([]);
  const [projectSites, setProjectSites] = useState([]);

  useEffect(() => {
    // Load existing clients for duplicate checking
    const loadExistingClients = async () => {
      try {
        const response = await clientService.getAllClients();
        const clients = response.data || response;
        setExistingClients(clients);
        // Extract unique project sites for suggestions
        const sites = [...new Set(clients.map(c => c.project_site).filter(site => site))];
        setProjectSites(sites);
      } catch (error) {
        console.error('Error loading existing clients:', error);
      }
    };
    loadExistingClients();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Required field validation
    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    }

    if (!formData.contact_number.trim()) {
      newErrors.contact_number = 'Contact number is required';
    } else if (!/^\d{10,15}$/.test(formData.contact_number.replace(/[\s\-()]/g, ''))) {
      newErrors.contact_number = 'Please enter a valid phone number (10-15 digits)';
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Check for duplicates
    const duplicateName = existingClients.find(existingClient =>
      existingClient.name.toLowerCase() === formData.name.toLowerCase() && existingClient.id !== client?.id
    );
    if (duplicateName) {
      newErrors.name = 'A client with this name already exists';
    }

    const duplicateContact = existingClients.find(existingClient =>
      existingClient.contact_number === formData.contact_number && existingClient.id !== client?.id
    );
    if (duplicateContact) {
      newErrors.contact_number = 'A client with this contact number already exists';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">
          {client ? 'Edit Client' : 'Add New Client'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Client Name
            </label>
            <input
              type="text"
              name="name"
              required
              className={`input-field ${errors.name ? 'border-red-500' : ''}`}
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Contact Number
            </label>
            <input
              type="tel"
              name="contact_number"
              required
              className={`input-field ${errors.contact_number ? 'border-red-500' : ''}`}
              value={formData.contact_number}
              onChange={handleChange}
            />
            {errors.contact_number && (
              <p className="text-red-500 text-xs mt-1">{errors.contact_number}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              className={`input-field ${errors.email ? 'border-red-500' : ''}`}
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Project Site
            </label>
            <input
              type="text"
              name="project_site"
              className="input-field"
              value={formData.project_site}
              onChange={handleChange}
              placeholder="Type project site name"
              autoComplete="off"
            />
            {formData.project_site && projectSites.filter(site =>
              site.toLowerCase().includes(formData.project_site.toLowerCase())
            ).length > 0 && (
              <div className="mt-1 text-xs text-secondary-500">
                Suggestions: {projectSites.filter(site =>
                  site.toLowerCase().includes(formData.project_site.toLowerCase())
                ).slice(0, 3).join(', ')}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Address
            </label>
            <textarea
              name="address"
              rows="3"
              className="input-field"
              value={formData.address}
              onChange={handleChange}
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
              disabled={Object.keys(errors).length > 0}
            >
              {client ? 'Update' : 'Add'} Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Clients;
