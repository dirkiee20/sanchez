import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, Wrench, CheckCircle, XCircle } from 'lucide-react';
import { equipmentService } from '../services/equipmentService';
import { getIpc } from '../utils/electronUtils';
import { useAuth } from '../contexts/AuthContext';

function Equipment() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(false);

  useEffect(() => {
    // Listen for database ready signal
    const ipc = getIpc();
    if (ipc && ipc.on) {
      ipc.on('database-ready', () => {
        console.log('Equipment: Database ready signal received');
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
    loadEquipment();
  }, [databaseReady]);

  const loadEquipment = async () => {
    console.log('Equipment: Starting data load');
    const startTime = performance.now();
    try {
      setLoading(true);
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Equipment data load timeout')), 5000)
      );
      const dataPromise = equipmentService.getAllEquipment();
      const data = await Promise.race([dataPromise, timeoutPromise]);
      setEquipment(data);
      const endTime = performance.now();
      console.log(`Equipment: Data loaded in ${endTime - startTime}ms, ${data.length} equipment items`);
    } catch (error) {
      console.error('Equipment: Error loading equipment:', error);
      const endTime = performance.now();
      console.log(`Equipment: Data load failed in ${endTime - startTime}ms`);
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const uniqueTypes = [...new Set(equipment.map(item => item.type))];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rented':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'rented':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddEquipment = () => {
    setEditingEquipment(null);
    setShowModal(true);
  };

  const handleEditEquipment = (item) => {
    setEditingEquipment(item);
    setShowModal(true);
  };

  const handleDeleteEquipment = async (id) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      try {
        await equipmentService.deleteEquipment(id);
        await loadEquipment(); // Reload the list
      } catch (error) {
        console.error('Error deleting equipment:', error);
        alert('Error deleting equipment');
      }
    }
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
          <h1 className="text-3xl font-bold text-secondary-900">Equipment</h1>
          <p className="text-secondary-600">Manage your equipment inventory</p>
        </div>
        <button
          onClick={handleAddEquipment}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Equipment
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search equipment..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field w-48"
        >
          <option value="all">All Types</option>
          {uniqueTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-48"
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="rented">Rented</option>
        </select>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.map((item) => (
          <div key={item.id} className="card p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">{item.name}</h3>
                <p className="text-sm text-secondary-600">{item.type}</p>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(item.status)}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-secondary-600">Rate per hour:</span>
                <span className="text-sm font-medium text-secondary-900">₱{item.rate_per_hour}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-secondary-600">Quantity (avail/total):</span>
                <span className="text-sm font-medium text-secondary-900">{item.quantity_available ?? 0}/{item.quantity_total ?? 0}</span>
              </div>
              {(item.maintenance_quantity ?? 0) > 0 && (
                <div className="text-sm text-secondary-600">
                  {item.maintenance_quantity ?? 0} out of {item.quantity_total ?? 0} is under maintenance
                </div>
              )}
              <p className="text-sm text-secondary-600">{item.description}</p>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditEquipment(item)}
                  className="text-primary-600 hover:text-primary-900"
                >
                  <Edit className="h-4 w-4" />
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => handleDeleteEquipment(item.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Equipment Modal */}
      {showModal && (
        <EquipmentModal
          equipment={editingEquipment}
          onClose={() => setShowModal(false)}
          onSave={async (equipmentData) => {
            try {
              if (editingEquipment) {
                await equipmentService.updateEquipment(editingEquipment.id, equipmentData);
              } else {
                await equipmentService.addEquipment(equipmentData);
              }
              await loadEquipment(); // Reload the list
              setShowModal(false);
            } catch (error) {
              console.error('Error saving equipment:', error);
              alert('Error saving equipment');
            }
          }}
        />
      )}
    </div>
  );
}

// Equipment Modal Component
function EquipmentModal({ equipment, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: equipment?.name || '',
    type: equipment?.type || '',
    rate_per_hour: equipment?.rate_per_hour || '',
    description: equipment?.description || '',
    quantity_total: equipment?.quantity_total ?? 1,
    quantity_available: equipment?.quantity_available ?? equipment?.quantity_total ?? 1
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">
          {equipment ? 'Edit Equipment' : 'Add New Equipment'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Equipment Name
            </label>
            <input
              type="text"
              name="name"
              required
              className="input-field"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Type
            </label>
            <input
              type="text"
              name="type"
              required
              className="input-field"
              value={formData.type}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Rate per Hour (₱)
            </label>
            <input
              type="number"
              name="rate_per_hour"
              step="0.01"
              required
              className="input-field"
              value={formData.rate_per_hour}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Total Quantity
              </label>
              <input
                type="number"
                name="quantity_total"
                min="1"
                required
                className="input-field"
                value={formData.quantity_total}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Available Quantity
              </label>
              <input
                type="number"
                name="quantity_available"
                min="0"
                required
                className="input-field"
                value={formData.quantity_available}
                onChange={handleChange}
              />
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows="3"
              className="input-field"
              value={formData.description}
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
            >
              {equipment ? 'Update' : 'Add'} Equipment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Equipment;
