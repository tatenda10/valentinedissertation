import React from 'react';
import { format } from 'date-fns';
import { EyeIcon, PencilIcon, UserMinusIcon } from '@heroicons/react/24/outline';

const UserTable = ({ users = [], onViewRoles = () => {}, onEditUser = () => {}, onToggleUserStatus = () => {} }) => {
  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow">
        <p className="text-gray-500">No users found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-gray-200 ring-opacity-5 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Username</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Created At</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Last Login</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                {user.username}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy HH:mm') : '-'}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {user.last_login 
                  ? format(new Date(user.last_login), 'MMM d, yyyy HH:mm')
                  : 'Never'
                }
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm">
                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                  user.is_active 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => onViewRoles(user)}
                    className="text-gray-400 hover:text-gray-500"
                    title="View Details"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onEditUser(user)}
                    className="text-gray-400 hover:text-gray-500"
                    title="Edit User"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  {user.username !== 'sysadmin' && (
                    <button
                      onClick={() => onToggleUserStatus(user)}
                      className="text-gray-400 hover:text-gray-500"
                      title={user.is_active ? "Disable User" : "Enable User"}
                    >
                      <UserMinusIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
