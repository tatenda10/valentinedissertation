import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import PrivateRoutes from './components/shared/PrivateRoutes';
import Dashboard from './pages/Dashboard';
import Users from './pages/user settings/Users';
import Audit_logs from './pages/user settings/Audit_logs';
import Client from './pages/Clients';
import Loans from './pages/Loans';
import Reports from './pages/Reports';
import LoanDetails from './pages/LoanDetails';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoutes />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit-logs" element={<Audit_logs />} />
            <Route path="/clients" element={<Client />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loans/:id" element={<LoanDetails />} />
            <Route path="/reports" element={<Reports />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;