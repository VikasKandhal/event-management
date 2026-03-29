import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext.jsx';

// Layouts
import OrganizerLayout from './components/Layout/OrganizerLayout.jsx';
import AgentLayout from './components/Layout/AgentLayout.jsx';

// Pages
import Login from './pages/Login.jsx';
import OrganizerDashboard from './pages/organizer/Dashboard.jsx';
import OrganizerEvents from './pages/organizer/Events.jsx';
import OrganizerEventDetail from './pages/organizer/EventDetail.jsx';
import AgentDashboard from './pages/agent/AgentDashboard.jsx';
import AgentEvents from './pages/agent/AgentEvents.jsx';
import AgentEventDetail from './pages/agent/AgentEventDetail.jsx';

function ProtectedRoute({ children, role }) {
  const { user, profile, loading, signOut } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  // If profile hasn't loaded yet (DB row missing), show a helpful error + sign out button
  if (!profile) {
    return (
      <div className="loading-center" style={{ flexDirection: 'column', gap: 16, textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: '2rem' }}>⚠️</div>
        <h3>Profile not found</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: 360 }}>
          Your account exists but no profile row was found.<br />
          Please make sure the SQL migration has been run in Supabase, then sign out and sign back in.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => signOut()}
          style={{ marginTop: 8 }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'organizer' ? '/organizer/dashboard' : '/agent/dashboard'} replace />;
  }
  return children;
}


export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
          success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
        }}
      />
      <Routes>
        <Route
          path="/login"
          element={
            user
              ? <Navigate to={profile?.role === 'organizer' ? '/organizer/dashboard' : '/agent/dashboard'} replace />
              : <Login />
          }
        />

        {/* Organizer routes */}
        <Route path="/organizer" element={
          <ProtectedRoute role="organizer"><OrganizerLayout /></ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OrganizerDashboard />} />
          <Route path="events" element={<OrganizerEvents />} />
          <Route path="events/:id" element={<OrganizerEventDetail />} />
        </Route>

        {/* Agent routes */}
        <Route path="/agent" element={
          <ProtectedRoute role="agent"><AgentLayout /></ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AgentDashboard />} />
          <Route path="events" element={<AgentEvents />} />
          <Route path="events/:id" element={<AgentEventDetail />} />
        </Route>

        {/* Default redirect */}
        <Route
          path="*"
          element={
            !user
              ? <Navigate to="/login" replace />
              : <Navigate to={profile?.role === 'organizer' ? '/organizer/dashboard' : '/agent/dashboard'} replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
