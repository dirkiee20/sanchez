import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  Calendar,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { getIpc } from '../utils/electronUtils';
import RevenueChart from './RevenueChart';
import EquipmentChart from './EquipmentChart';
import PaymentChart from './PaymentChart';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalEquipment: 0,
    activeRentals: 0,
    totalRevenue: 0,
    overdueRentals: 0,
    availableEquipment: 0,
    availableEquipmentQuantity: 0,
    trends: {
      totalClients: '0%',
      totalEquipment: '0%',
      activeRentals: '0%',
      totalRevenue: '0%',
      overdueRentals: '0%',
      availableEquipment: '0%'
    }
  });

  const [recentRentals, setRecentRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(false);

  useEffect(() => {
    // Listen for database ready signal
    const ipc = getIpc();
    if (ipc && ipc.on) {
      ipc.on('database-ready', () => {
        console.log('Dashboard: Database ready signal received');
        setDatabaseReady(true);
      });
    }

    // In development, assume database is ready after a short delay
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        console.log('Dashboard: Setting database ready for development');
        setDatabaseReady(true);
      }, 1000); // Increased to 1000ms to ensure electronAPI is available
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

    const loadDashboardData = async () => {
      console.log('Dashboard: Starting data load');
      const startTime = performance.now();
      try {
        setLoading(true);
        const ipc = getIpc();

        // Fetch dashboard statistics with timeout
        console.log('Dashboard: Fetching dashboard stats');
        const statsStart = performance.now();
        const statsPromise = ipc.invoke('db-get-dashboard-stats');
        const statsTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Dashboard stats timeout')), 5000)
        );
        const dashboardStats = await Promise.race([statsPromise, statsTimeout]);
        const statsEnd = performance.now();
        console.log(`Dashboard: Stats loaded in ${statsEnd - statsStart}ms`);
        setStats(dashboardStats);

        // Fetch recent rentals with timeout
        console.log('Dashboard: Fetching recent rentals');
        const rentalsStart = performance.now();
        const rentalsPromise = ipc.invoke('db-get-recent-rentals', 3);
        const rentalsTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Recent rentals timeout')), 5000)
        );
        const recentRentalsData = await Promise.race([rentalsPromise, rentalsTimeout]);
        const rentalsEnd = performance.now();
        console.log(`Dashboard: Recent rentals loaded in ${rentalsEnd - rentalsStart}ms`);
        setRecentRentals(recentRentalsData);

        // Fetch all rentals to recalculate active count
        console.log('Dashboard: Fetching all rentals for active count recalculation');
        const allRentalsStart = performance.now();
        const allRentalsPromise = ipc.invoke('db-get-rentals');
        const allRentalsTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('All rentals timeout')), 5000)
        );
        const allRentalsData = await Promise.race([allRentalsPromise, allRentalsTimeout]);
        const allRentalsEnd = performance.now();
        console.log(`Dashboard: All rentals loaded in ${allRentalsEnd - allRentalsStart}ms`);

        // Recalculate active rentals count
        const rentalsArray = allRentalsData.data || allRentalsData || [];
        const activeRentalsCount = (Array.isArray(rentalsArray) ? rentalsArray : []).filter(rental => rental.status === 'active').length;

        // Update stats with recalculated active rentals count
        setStats(prevStats => ({
          ...prevStats,
          activeRentals: activeRentalsCount
        }));

        // Fetch equipment to calculate total available quantity
        console.log('Dashboard: Fetching equipment for quantity calculation');
        const equipmentStart = performance.now();
        const equipmentPromise = ipc.invoke('db-get-equipment');
        const equipmentTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Equipment data timeout')), 5000)
        );
        const equipmentData = await Promise.race([equipmentPromise, equipmentTimeout]);
        const equipmentEnd = performance.now();
        console.log(`Dashboard: Equipment loaded in ${equipmentEnd - equipmentStart}ms`);

        // Calculate total available quantity
        const totalAvailableQuantity = (equipmentData || []).reduce((sum, item) => {
          return sum + (item.status === 'available' ? (item.quantity_available || 0) : 0);
        }, 0);

        // Update stats with calculated quantity
        setStats(prevStats => ({
          ...prevStats,
          availableEquipmentQuantity: totalAvailableQuantity
        }));

        setLoading(false);
        const endTime = performance.now();
        console.log(`Dashboard: Total data load completed in ${endTime - startTime}ms`);
      } catch (error) {
        console.error('Dashboard: Error loading dashboard data:', error);
        setLoading(false);
        const endTime = performance.now();
        console.log(`Dashboard: Data load failed in ${endTime - startTime}ms`);
      }
    };

    loadDashboardData();
  }, [databaseReady]);

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      change: stats.trends?.totalClients || '0%'
    },
    {
      title: 'Total Equipment',
      value: stats.totalEquipment,
      icon: Package,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      change: stats.trends?.totalEquipment || '0%'
    },
    {
      title: 'Active Rentals',
      value: stats.activeRentals,
      icon: Calendar,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      change: stats.trends?.activeRentals || '0%'
    },
    {
      title: 'Total Revenue',
      value: `₱${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      change: stats.trends?.totalRevenue || '0%'
    },
    {
      title: 'Overdue Rentals',
      value: stats.overdueRentals,
      icon: AlertTriangle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      change: stats.trends?.overdueRentals || '0%'
    },
    {
      title: 'Available Equipment',
      value: stats.availableEquipmentQuantity,
      icon: CheckCircle,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      change: stats.trends?.availableEquipment || '0%'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Dashboard</h1>
        <p className="text-secondary-600">Overview of your rental business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-600">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
                  <p className={`text-sm flex items-center mt-1 ${
                    stat.title === 'Overdue Rentals' ?
                      (stat.change.startsWith('+') ? 'text-red-600' :
                       stat.change.startsWith('-') ? 'text-green-600' : 'text-gray-600') :
                      (stat.change.startsWith('+') ? 'text-green-600' :
                       stat.change.startsWith('-') ? 'text-red-600' : 'text-gray-600')
                  }`}>
                    <TrendingUp className={`h-4 w-4 mr-1 ${
                      stat.change.startsWith('-') ? 'rotate-180' : ''
                    }`} />
                    {stat.change} from last month
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      {databaseReady && (
        <div className="grid grid-cols-1 xl:grid-cols-8 gap-6">
          <div className="xl:col-span-8">
            <RevenueChart />
          </div>
          <div className="xl:col-span-5">
            <EquipmentChart />
          </div>
          <div className="xl:col-span-3">
            <PaymentChart />
          </div>
        </div>
      )}

      {/* Recent Rentals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Recent Rentals</h3>
          <div className="space-y-4">
            {recentRentals.map((rental) => (
              <div key={rental.id} className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                <div>
                  <p className="font-medium text-secondary-900">{rental.client_name}</p>
                  <p className="text-sm text-secondary-600">{rental.equipment_name}</p>
                  <p className="text-xs text-secondary-500">
                    {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center">
                  {rental.status === 'active' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Clock className="h-3 w-3 mr-1" />
                      Active
                    </span>
                  ) : rental.status === 'overdue' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Overdue
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {rental.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/rentals')}
              className="w-full btn-primary text-left"
            >
              <Calendar className="h-4 w-4 mr-2 inline" />
              New Rental
            </button>
            <button
              onClick={() => navigate('/clients')}
              className="w-full btn-secondary text-left"
            >
              <Users className="h-4 w-4 mr-2 inline" />
              Add Client
            </button>
            <button
              onClick={() => navigate('/equipment')}
              className="w-full btn-secondary text-left"
            >
              <Package className="h-4 w-4 mr-2 inline" />
              Add Equipment
            </button>
            <button
              onClick={() => navigate('/payments')}
              className="w-full btn-secondary text-left"
            >
              <DollarSign className="h-4 w-4 mr-2 inline" />
              Record Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
