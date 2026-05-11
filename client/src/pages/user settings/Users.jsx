import React, { useState, useEffect } from 'react';
import UserTable from '../../components/users/UserTable';
import ViewUserModal from '../../components/users/ViewUserModal';
import AddUserModal from '../../components/users/AddUserModal';
import EditUserModal from '../../components/users/EditUserModal';
import axios from 'axios';
import API_URL from '../../utils/Api';
import { PlusIcon } from '@heroicons/react/24/outline';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [editingUser, setEditingUser] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/users?page=${page}&limit=${pagination.itemsPerPage}`);
      
      if (response.data) {
        setUsers(response.data.users || []);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination,
          currentPage: page
        }));
      }
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const handleViewRoles = (user) => {
    setSelectedUser(user);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const handleUpdateUser = async (updatedUser) => {
    try {
        const response = await axios.put(`${API_URL}/users/${updatedUser.id}`, updatedUser);

        // Check if the response contains the expected data
        if (response.status === 200 && response.data && response.data.user) {
            setEditingUser(null);
            setEditModalOpen(false);
            fetchUsers(pagination.currentPage);
        } else {
            throw new Error('Unexpected response format');
        }
    } catch (err) {
        console.error('Error updating user:', err);
        setError(err.message || 'Error updating user');
    }
  };

  const handleToggleUserStatus = async (user) => {
    // Don't allow toggling sysadmin
    if (user.username === 'sysadmin') return;

    try {
      await axios.patch(`${API_URL}/users/${user.id}/toggle-status`);
      fetchUsers(pagination.currentPage);
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  const handleAddUser = async (userData) => {
    try {
      await axios.post(`${API_URL}/users`, userData);
      setShowAddModal(false);
      fetchUsers(1); // Refresh the first page
    } catch (err) {
      console.error('Error adding user:', err);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchUsers(newPage);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
        Loading users...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#011325] via-[#0b2f4f] to-[#114974] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Users</h1>
            <p className="mt-2 text-sm text-slate-200">Manage system users, access and account status.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#011325] transition hover:bg-slate-100"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add User
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <UserTable
          users={users}
          onViewRoles={handleViewRoles}
          onEditUser={handleEditUser}
          onToggleUserStatus={handleToggleUserStatus}
        />
      </section>

      {/* Pagination Display */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {users.length > 0 ? ((pagination.currentPage - 1) * pagination.itemsPerPage) + 1 : 0}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.totalItems}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {selectedUser && (
        <ViewUserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddUser}
        />
      )}

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onEdit={handleUpdateUser}
      />
    </div>
  );
};

export default Users; 
