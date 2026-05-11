import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import PrivateRoutes from './components/shared/PrivateRoutes';
import Dashboard from './pages/Dashboard';
import Users from './pages/user settings/Users';
import Audit_logs from './pages/user settings/Audit_logs';
import Register from './pages/Register';
import ApplyLoan from './pages/ApplyLoan';
import Loans from './pages/Loans';
import Profile from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoutes />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit-logs" element={<Audit_logs />} />
            <Route path="/apply-loan" element={<ApplyLoan />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;