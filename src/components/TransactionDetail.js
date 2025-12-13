import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Package, 
  User, 
  DollarSign, 
  CreditCard, 
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Phone,
  Mail,
  MapPin,
  Clock
} from 'lucide-react';
import { rentalService } from '../services/rentalService';
import { getIpc } from '../utils/electronUtils';

function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [transactionData, setTransactionData] = useState(null);

  useEffect(() => {
    // Listen for database ready signal
    const ipc = getIpc();
    if (ipc && ipc.on) {
      ipc.on('database-ready', () => {
        console.log('TransactionDetail: Database ready signal received');
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
    loadTransactionDetails();
  }, [databaseReady, id]);

  const loadTransactionDetails = async () => {
    try {
      setLoading(true);
      const data = await rentalService.getRentalDetails(parseInt(id));
      setTransactionData(data);
    } catch (error) {
      console.error('Error loading transaction details:', error);
      alert('Error loading transaction details');
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
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!transactionData || !transactionData.rental) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Transaction not found</p>
        </div>
      </div>
    );
  }

  const { rental, payments, return: returnInfo } = transactionData;
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const outstanding = parseFloat(rental.total_amount) - totalPaid;
  const isDamageCharge = (notes) => notes && notes.includes('Damage charges from return');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-secondary-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">Transaction Details</h1>
            <p className="text-secondary-600">Rental ID: #{rental.id}</p>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <User className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-secondary-900">Client Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start space-x-3">
            <User className="h-5 w-5 text-secondary-400 mt-1" />
            <div>
              <p className="text-sm text-secondary-600">Name</p>
              <p className="font-medium text-secondary-900">{rental.client_name}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Phone className="h-5 w-5 text-secondary-400 mt-1" />
            <div>
              <p className="text-sm text-secondary-600">Contact</p>
              <p className="font-medium text-secondary-900">{rental.contact_number}</p>
            </div>
          </div>
          {rental.email && (
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-secondary-400 mt-1" />
              <div>
                <p className="text-sm text-secondary-600">Email</p>
                <p className="font-medium text-secondary-900">{rental.email}</p>
              </div>
            </div>
          )}
          {rental.address && (
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-secondary-400 mt-1" />
              <div>
                <p className="text-sm text-secondary-600">Address</p>
                <p className="font-medium text-secondary-900">{rental.address}</p>
              </div>
            </div>
          )}
          {rental.project_site && (
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-secondary-400 mt-1" />
              <div>
                <p className="text-sm text-secondary-600">Project Site</p>
                <p className="font-medium text-secondary-900">{rental.project_site}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Equipment Information */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <Package className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-secondary-900">Rented Equipment</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-secondary-600">Equipment Name</p>
            <p className="font-medium text-secondary-900 text-lg">{rental.equipment_name}</p>
          </div>
          <div>
            <p className="text-sm text-secondary-600">Equipment Type</p>
            <p className="font-medium text-secondary-900">{rental.equipment_type}</p>
          </div>
          {rental.equipment_description && (
            <div className="md:col-span-2">
              <p className="text-sm text-secondary-600">Description</p>
              <p className="font-medium text-secondary-900">{rental.equipment_description}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-secondary-600">Quantity</p>
            <p className="font-medium text-secondary-900">{rental.quantity || 1}</p>
          </div>
          <div>
            <p className="text-sm text-secondary-600">Rate per Hour</p>
            <p className="font-medium text-secondary-900">₱{parseFloat(rental.rate_per_hour).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Rental Period */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <Calendar className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-secondary-900">Rental Period</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-secondary-600">Start Date</p>
            <p className="font-medium text-secondary-900 text-lg">
              {new Date(rental.start_date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-secondary-600">End Date</p>
            <p className="font-medium text-secondary-900 text-lg">
              {new Date(rental.end_date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          {returnInfo && (
            <div>
              <p className="text-sm text-secondary-600">Return Date</p>
              <p className="font-medium text-secondary-900 text-lg">
                {new Date(returnInfo.return_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center space-x-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(rental.status)}`}>
            {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(rental.payment_status)}`}>
            Payment: {rental.payment_status.charAt(0).toUpperCase() + rental.payment_status.slice(1)}
          </span>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600">Total Amount</p>
              <p className="text-2xl font-bold text-secondary-900">₱{parseFloat(rental.total_amount).toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">₱{totalPaid.toFixed(2)}</p>
            </div>
            <CreditCard className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600">Outstanding</p>
              <p className="text-2xl font-bold text-orange-600">₱{outstanding.toFixed(2)}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <CreditCard className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-secondary-900">Payments</h2>
        </div>
        {payments.length === 0 ? (
          <p className="text-secondary-500 text-center py-4">No payments recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className={isDamageCharge(payment.notes) ? 'bg-orange-50' : ''}>
                    <td className="px-4 py-3 text-sm text-secondary-900">
                      {new Date(payment.payment_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-secondary-900">
                      ₱{parseFloat(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payment.payment_type === 'full' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-600">
                      {payment.notes ? (
                        <span className={isDamageCharge(payment.notes) ? 'text-orange-600 font-medium' : ''}>
                          {payment.notes}
                        </span>
                      ) : (
                        <span className="text-secondary-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Return Information */}
      {returnInfo && (
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <RotateCcw className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold text-secondary-900">Return Information</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-secondary-600">Return Date</p>
                <p className="font-medium text-secondary-900">
                  {new Date(returnInfo.return_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-secondary-600">Condition</p>
                <div className="flex items-center mt-1">
                  {getConditionIcon(returnInfo.condition)}
                  <span className={`ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getConditionColor(returnInfo.condition)}`}>
                    {returnInfo.condition.charAt(0).toUpperCase() + returnInfo.condition.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            {returnInfo.damage_description && (
              <div>
                <p className="text-sm text-secondary-600 mb-1">Damage Description</p>
                <p className="font-medium text-secondary-900 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  {returnInfo.damage_description}
                </p>
              </div>
            )}
            {parseFloat(returnInfo.additional_charges || 0) > 0 && (
              <div>
                <p className="text-sm text-secondary-600">Additional Charges</p>
                <p className="font-medium text-orange-600 text-lg">
                  ₱{parseFloat(returnInfo.additional_charges).toFixed(2)}
                </p>
              </div>
            )}
            {returnInfo.notes && (
              <div>
                <p className="text-sm text-secondary-600 mb-1">Return Notes</p>
                <p className="font-medium text-secondary-900 bg-secondary-50 p-3 rounded-lg border border-secondary-200">
                  {returnInfo.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Notes Section */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <FileText className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-secondary-900">All Notes</h2>
        </div>
        <div className="space-y-3">
          {payments.length === 0 && !returnInfo?.notes ? (
            <p className="text-secondary-500 text-center py-4">No notes available</p>
          ) : (
            <>
              {payments.map((payment, index) => (
                payment.notes && (
                  <div key={`payment-${payment.id}`} className={`p-4 rounded-lg border ${
                    isDamageCharge(payment.notes) 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <CreditCard className="h-4 w-4 mr-2 text-secondary-500" />
                          <span className="text-xs font-medium text-secondary-600">
                            Payment Note - {new Date(payment.payment_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-sm ${isDamageCharge(payment.notes) ? 'text-orange-800 font-medium' : 'text-secondary-900'}`}>
                          {payment.notes}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ))}
              {returnInfo?.notes && (
                <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <RotateCcw className="h-4 w-4 mr-2 text-secondary-500" />
                        <span className="text-xs font-medium text-secondary-600">
                          Return Note - {new Date(returnInfo.return_date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-secondary-900">
                        {returnInfo.notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionDetail;
