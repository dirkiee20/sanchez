import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { UserPlus, Trash2, AlertCircle, CheckCircle, Eye, EyeOff, Users, Key, Copy, ArrowUp } from 'lucide-react';

function AdminSettings() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdPassword, setCreatedPassword] = useState('');
  const [createdUsername, setCreatedUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [resetUsername, setResetUsername] = useState('');
  const [resetFormData, setResetFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'staff'
  });

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const allUsers = await authService.getAllUsers(user?.id);
      setUsers(allUsers);
    } catch (error) {
      setError(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters long');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Store password before hashing (for display)
      const passwordToShow = formData.password;
      const usernameToShow = formData.username.trim();

      // Only allow creating staff accounts
      await authService.createUser(
        usernameToShow,
        formData.password,
        'staff', // Force staff role
        user?.id // Pass admin user ID for verification
      );

      // Store the password and username to show in success message
      setCreatedPassword(passwordToShow);
      setCreatedUsername(usernameToShow);
      setSuccess(`Staff account "${usernameToShow}" created successfully!`);
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        role: 'staff'
      });
      await loadUsers();
    } catch (error) {
      setError(error.message || 'Failed to create staff account');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await authService.deleteUser(userId, user?.id);
      setSuccess('User deleted successfully!');
      await loadUsers();
    } catch (error) {
      setError(error.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (userId, username) => {
    setResetUserId(userId);
    setResetUsername(username);
    setResetFormData({ password: '', confirmPassword: '' });
    setShowResetModal(true);
    setError('');
    setSuccess('');
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!resetFormData.password) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    if (resetFormData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (resetFormData.password !== resetFormData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await authService.resetUserPassword(resetUserId, resetFormData.password, user?.id);
      setSuccess(`Password reset successfully for "${resetUsername}"!`);
      setCreatedPassword(resetFormData.password);
      setCreatedUsername(resetUsername);
      setResetFormData({ password: '', confirmPassword: '' });
      setShowResetModal(false);
    } catch (error) {
      setError(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Password copied to clipboard!');
      setTimeout(() => {
        if (createdPassword) {
          setSuccess(`Staff account "${createdUsername}" created successfully!`);
        } else {
          setSuccess('');
        }
      }, 2000);
    });
  };

  const handlePromoteToAdmin = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to promote "${username}" to admin? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await authService.promoteUserToAdmin(userId, user?.id);
      setSuccess(`User "${username}" has been promoted to admin successfully!`);
      await loadUsers();
    } catch (error) {
      setError(error.message || 'Failed to promote user to admin');
    } finally {
      setLoading(false);
    }
  };

  // Redirect if not admin
  if (user && user.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">Access denied. Admin privileges required.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary-900 mb-2">Admin Settings</h1>
        <p className="text-secondary-600">Manage staff accounts and system settings</p>
      </div>

      {/* Create Staff Account Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center mb-4">
          <UserPlus className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-secondary-900">Create Staff Account</h2>
        </div>

        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-secondary-700 mb-1">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="input-field"
              placeholder="Enter username"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="input-field pr-10"
                placeholder="Enter password (min. 6 characters)"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 h-5 w-5 text-secondary-400 hover:text-secondary-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className="input-field"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-green-700 text-sm font-medium">{success}</span>
              </div>
              {createdPassword && (
                <div className="mt-3 p-3 bg-white border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-secondary-600 mb-1">Password for "{createdUsername}":</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm font-mono text-green-800 bg-green-50 px-3 py-1 rounded border border-green-200">
                          {createdPassword}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(createdPassword)}
                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
                          title="Copy password"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-secondary-500 mt-2">
                        ⚠️ Save this password now. It cannot be retrieved later.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? 'Creating...' : 'Create Staff Account'}
          </button>
        </form>
      </div>

      {/* Users List Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold text-secondary-900">All Users</h2>
          </div>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading && users.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-secondary-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-secondary-600">
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-900">
                      {u.username}
                      {u.id === user?.id && (
                        <span className="ml-2 text-xs text-primary-600 font-medium">(You)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        u.role === 'admin' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {u.id !== user?.id && u.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => handlePromoteToAdmin(u.id, u.username)}
                              disabled={loading}
                              className="text-purple-600 hover:text-purple-900 disabled:opacity-50 flex items-center"
                              title="Promote to Admin"
                            >
                              <ArrowUp className="h-4 w-4 mr-1" />
                              Promote to Admin
                            </button>
                            <button
                              onClick={() => handleResetPassword(u.id, u.username)}
                              disabled={loading}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50 flex items-center"
                              title="Reset Password"
                            >
                              <Key className="h-4 w-4 mr-1" />
                              Reset Password
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 flex items-center"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </>
                        )}
                        {u.role === 'admin' && (
                          <span className="text-secondary-400 text-xs">Protected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-secondary-900 mb-4">
              Reset Password for "{resetUsername}"
            </h2>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="resetPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="resetPassword"
                    name="password"
                    type={showResetPassword ? "text" : "password"}
                    required
                    className="input-field pr-10"
                    placeholder="Enter new password (min. 6 characters)"
                    value={resetFormData.password}
                    onChange={(e) => setResetFormData({ ...resetFormData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 h-5 w-5 text-secondary-400 hover:text-secondary-600"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                  >
                    {showResetPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="resetConfirmPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="resetConfirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="input-field"
                  placeholder="Confirm new password"
                  value={resetFormData.confirmPassword}
                  onChange={(e) => setResetFormData({ ...resetFormData, confirmPassword: e.target.value })}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetFormData({ password: '', confirmPassword: '' });
                    setError('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSettings;
