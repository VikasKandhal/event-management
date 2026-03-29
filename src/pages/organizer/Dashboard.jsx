import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';
import {
  Calendar, Users, Car, CheckCircle, XCircle,
  Clock, ChevronRight, TrendingUp, BarChart3
} from 'lucide-react';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalGuests: 0,
    pending: 0,
    assigned: 0,
    accepted: 0,
    rejected: 0,
  });
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        // Fetch all organizer events with guest counts
        const { data: events, error: evErr } = await supabase
          .from('events')
          .select('*, guests(count)')
          .eq('organizer_id', user.id)
          .order('date', { ascending: false });

        if (evErr) { toast.error(evErr.message); return; }

        // Fetch all bookings for organizer's events
        const eventIds = (events || []).map(e => e.id);
        let allBookings = [];
        if (eventIds.length > 0) {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('status, event_id')
            .in('event_id', eventIds);
          allBookings = bookings || [];
        }

        // Fetch total guests count
        let totalGuests = 0;
        (events || []).forEach(e => {
          totalGuests += e.guests?.[0]?.count ?? 0;
        });

        // Count statuses
        const counts = { Pending: 0, Assigned: 0, Accepted: 0, Rejected: 0 };
        allBookings.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });
        // Pending = total guests minus booked guests
        const bookedGuests = allBookings.length;
        counts.Pending = totalGuests - bookedGuests + (counts.Pending || 0);

        setStats({
          totalEvents: (events || []).length,
          totalGuests,
          pending: totalGuests - bookedGuests,
          assigned: counts.Assigned,
          accepted: counts.Accepted,
          rejected: counts.Rejected,
        });

        setRecentEvents((events || []).slice(0, 5));
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const statCards = [
    { label: 'Total Events', value: stats.totalEvents, icon: <Calendar size={20} />, color: 'var(--primary)', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Total Guests', value: stats.totalGuests, icon: <Users size={20} />, color: 'var(--secondary)', bg: 'rgba(6,182,212,0.12)' },
    { label: 'Pending', value: stats.pending, icon: <Clock size={20} />, color: 'var(--warning)', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Assigned', value: stats.assigned, icon: <Car size={20} />, color: 'var(--info)', bg: 'rgba(56,189,248,0.12)' },
    { label: 'Accepted', value: stats.accepted, icon: <CheckCircle size={20} />, color: 'var(--success)', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Rejected', value: stats.rejected, icon: <XCircle size={20} />, color: 'var(--danger)', bg: 'rgba(239,68,68,0.12)' },
  ];

  const completionRate = stats.totalGuests > 0
    ? Math.round((stats.accepted / stats.totalGuests) * 100)
    : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Dashboard</h2>
          <p>Overview of your event travel coordination</p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats Grid */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {statCards.map(s => (
            <div key={s.label} className="stat-card">
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: s.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: s.color,
              }}>
                {s.icon}
              </div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingUp size={18} color="var(--success)" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Completion Rate</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--success)' }}>{completionRate}%</span>
          </div>
          <div style={{
            width: '100%', height: 10, borderRadius: 99,
            background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
          }}>
            <div style={{
              width: `${completionRate}%`, height: '100%', borderRadius: 99,
              background: 'linear-gradient(90deg, var(--success), var(--secondary))',
              transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
            }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
            {stats.accepted} of {stats.totalGuests} guests have confirmed driver assignments
          </div>
        </div>

        {/* Status Distribution */}
        {stats.totalGuests > 0 && (
          <div className="card" style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <BarChart3 size={18} color="var(--primary-light)" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Status Distribution</span>
            </div>
            <div style={{ display: 'flex', gap: 4, height: 32, borderRadius: 8, overflow: 'hidden' }}>
              {[
                { count: stats.pending, color: 'var(--warning)', label: 'Pending' },
                { count: stats.assigned, color: 'var(--info)', label: 'Assigned' },
                { count: stats.accepted, color: 'var(--success)', label: 'Accepted' },
                { count: stats.rejected, color: 'var(--danger)', label: 'Rejected' },
              ].filter(s => s.count > 0).map(s => (
                <div
                  key={s.label}
                  title={`${s.label}: ${s.count}`}
                  style={{
                    flex: s.count,
                    background: s.color,
                    opacity: 0.7,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700, color: '#fff',
                    minWidth: s.count > 0 ? 28 : 0,
                    transition: 'flex 0.4s ease',
                  }}
                >
                  {s.count}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Pending', color: 'var(--warning)', count: stats.pending },
                { label: 'Assigned', color: 'var(--info)', count: stats.assigned },
                { label: 'Accepted', color: 'var(--success)', count: stats.accepted },
                { label: 'Rejected', color: 'var(--danger)', count: stats.rejected },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, opacity: 0.7 }} />
                  {s.label} ({s.count})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Events */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3>Recent Events</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/organizer/events')}>
            View All <ChevronRight size={14} />
          </button>
        </div>

        {recentEvents.length === 0 ? (
          <div className="empty-state">
            <Calendar size={36} />
            <h3>No events yet</h3>
            <p>Create your first event to get started.</p>
          </div>
        ) : (
          <div className="events-grid">
            {recentEvents.map(ev => (
              <div key={ev.id} className="event-card" onClick={() => navigate(`/organizer/events/${ev.id}`)}>
                <div className="event-card-name">{ev.name}</div>
                <div className="event-card-date">
                  <Calendar size={13} />
                  {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="event-card-footer">
                  <span className="event-pill">
                    <Users size={12} /> {ev.guests?.[0]?.count ?? 0} guests
                  </span>
                  <ChevronRight size={16} color="var(--text-subtle)" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
