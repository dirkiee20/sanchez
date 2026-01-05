import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Calendar, 
  RotateCcw, 
  CreditCard, 
  FileText,
  Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Sidebar() {
  const { user } = useAuth();
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Equipment', href: '/equipment', icon: Package },
    { name: 'Rentals', href: '/rentals', icon: Calendar },
    { name: 'Returns', href: '/returns', icon: RotateCcw },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Activity Log', href: '/activity-log', icon: Shield },
  ];

  // Add Admin Settings only for admin users
  if (user?.role === 'admin') {
    navigation.push({ name: 'Admin Settings', href: '/admin-settings', icon: Shield });
  }

  return (
    <div className="w-64 bg-white shadow-lg h-screen flex flex-col">
      <div className="p-6 border-b border-secondary-200">
        <h1 className="text-xl font-bold text-secondary-900">Sanchez Rental</h1>
        <p className="text-sm text-secondary-600">Management System</p>
      </div>

      <nav className="flex-1 mt-6">
        <div className="px-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                      : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                  }`
                }
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </div>
      </nav>

    </div>
  );
}

export default Sidebar;
