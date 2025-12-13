import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign, 
  RotateCcw, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Package,
  CreditCard,
  FileText,
  Eye
} from 'lucide-react';
import { clientService } from '../services/clientService';
import { getIpc } from '../utils/electronUtils';

function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('rentals'); // 'rentals', 'payments', 'returns'

  useEffect(() => {
    // Listen for database ready signal
    const ipc = getIpc();
    if (ipc && ipc.on) {
      ipc.on('database-ready', () => {
        console.log('ClientProfile: Database ready signal received');
        setDatabaseReady(true);
      });
    }

    // In development, assume database is ready after a short delay
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        setDatabaseReady(true);
      }, 200);
    }

    return () => {
      if (ipc && ipc.removeAllListeners) {
        ipc.removeAllListeners('database-ready');
      }
    };
  }, []);

  useEffect(() => {
    if (!databaseReady || !id) return;
    loadClientProfile();
  }, [databaseReady, id]);

  const loadClientProfile = async () => {
    try {
      setLoading(true);
      const data = await clientService.getClientProfile(parseInt(id));
      setProfileData(data);
    } catch (error) {
      console.error('Error loading client profile:', error);
      alert('Error loading client profile');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'returned':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!profileData || !profileData.client) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Client not found</p>
        </div>
      </div>
    );
  }

  const { client, rentals, payments, returns } = profileData;
  const totalRentals = rentals.length;
  const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const totalDamages = returns
    .filter(r => r.condition === 'damaged' && parseFloat(r.additional_charges || 0) > 0)
    .reduce((sum, r) => sum + parseFloat(r.additional_charges || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/clients')}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-secondary-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">{client.name}</h1>
            <p className="text-secondary-600">Client Profile & Transaction History</p>
          </div>
        </div>
      </div>

      {/* Client Information Card */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">Client Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start space-x-3">
            <User className="h-5 w-5 text-secondary-400 mt-1" />
            <div>
              <p className="text-sm text-secondary-600">Name</p>
              <p className="font-medium text-secondary-900">{client.name}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Phone className="h-5 w-5 text-secondary-400 mt-1" />
            <div>
              <p className="text-sm text-secondary-600">Contact Number</p>
              <p className="font-medium text-secondary-900">{client.contact_number}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-secondary-400 mt-1" />
            <div>
              <p className="text-sm text-secondary-600">Email</p>
              <p className="font-medium text-secondary-900">{client.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-secondary-400 mt-1" />
            <div>
              <p className="text-sm text-secondary-600">Address</p>
              <p className="font-medium text-secondary-900">{client.address || '—'}</p>
            </div>
          </div>
          {client.project_site && (
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-secondary-400 mt-1" />
              <div>
                <p className="text-sm text-secondary-600">Project Site</p>
                <p className="font-medium text-secondary-900">{client.project_site}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600">Total Rentals</p>
              <p className="text-2xl font-bold text-secondary-900">{totalRentals}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600">Total Payments</p>
              <p className="text-2xl font-bold text-secondary-900">₱{totalPayments.toFixed(2)}</p>
            </div>
            <CreditCard className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600">Total Damage Charges</p>
              <p className="text-2xl font-bold text-secondary-900">₱{totalDamages.toFixed(2)}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('rentals')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rentals'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
            }`}
          >
            Rentals ({rentals.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
            }`}
          >
            Payments ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'returns'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
            }`}
          >
            Returns ({returns.length})
          </button>
        </nav>
      </div>

      {/* Rentals Tab */}
      {activeTab === 'rentals' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Equipment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {rentals.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-secondary-500">
                      No rentals found
                    </td>
                  </tr>
                ) : (
                  rentals.map((rental) => (
                    <tr key={rental.id} className="hover:bg-secondary-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-secondary-900">{rental.equipment_name}</div>
                        <div className="text-sm text-secondary-500">{rental.equipment_type}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-900">
                        {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-secondary-900">
                        ₱{parseFloat(rental.total_amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rental.status)}`}>
                          {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(rental.payment_status)}`}>
                          {rental.payment_status.charAt(0).toUpperCase() + rental.payment_status.slice(1)}
                        </span>
                        {rental.total_paid > 0 && (
                          <div className="text-xs text-secondary-500 mt-1">
                            ₱{parseFloat(rental.total_paid).toFixed(2)} / ₱{parseFloat(rental.total_amount).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/rentals/${rental.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Transaction Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Equipment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-secondary-500">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => {
                    const isDamageCharge = payment.notes && payment.notes.includes('Damage charges from return');
                    return (
                      <tr key={payment.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 text-sm text-secondary-900">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-secondary-900">
                          {payment.equipment_name}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-secondary-900">
                          ₱{parseFloat(payment.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payment.payment_type === 'full' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-secondary-600">
                          {payment.notes ? (
                            <span className={isDamageCharge ? 'text-orange-600 font-medium' : ''}>
                              {payment.notes}
                            </span>
                          ) : (
                            <span className="text-secondary-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Returns Tab */}
      {activeTab === 'returns' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Equipment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Condition</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Damage Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Additional Charges</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-secondary-500">
                      No returns found
                    </td>
                  </tr>
                ) : (
                  returns.map((returnItem) => {
                    const hasCharges = parseFloat(returnItem.additional_charges || 0) > 0;
                    return (
                      <tr key={returnItem.id} className={`hover:bg-secondary-50 ${hasCharges ? 'bg-orange-50' : ''}`}>
                        <td className="px-6 py-4 text-sm text-secondary-900">
                          {new Date(returnItem.return_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-secondary-900">{returnItem.equipment_name}</div>
                          <div className="text-sm text-secondary-500">{returnItem.equipment_type}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {getConditionIcon(returnItem.condition)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(returnItem.condition)}`}>
                              {returnItem.condition.charAt(0).toUpperCase() + returnItem.condition.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-secondary-900">
                          {returnItem.damage_description || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {hasCharges ? (
                            <span className="text-orange-600">₱{parseFloat(returnItem.additional_charges).toFixed(2)}</span>
                          ) : (
                            <span className="text-secondary-400">₱0.00</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientProfile;
