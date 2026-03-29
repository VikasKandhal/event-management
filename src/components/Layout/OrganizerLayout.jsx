import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Car, Calendar, LogOut, LayoutDashboard } from 'lucide-react';

export default function OrganizerLayout() {
  const { profile, signOut } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'OR';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Car size={18} color="#fff" />
          </div>
          <div>
            <div className="sidebar-logo-text">EventTravel</div>
            <div className="sidebar-logo-sub">Organizer Portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <span className="nav-section-label">Navigation</span>
          <NavLink
            to="/organizer/dashboard"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          <NavLink
            to="/organizer/events"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Calendar size={16} />
            My Events
          </NavLink>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <div className="user-name">{profile?.full_name || 'Organizer'}</div>
              <div className="user-role">🎯 {profile?.role}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center', gap: 8 }}
            onClick={() => signOut()}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
