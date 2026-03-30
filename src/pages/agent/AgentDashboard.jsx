import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import {
  Calendar, Users, Car, Clock, AlertTriangle,
  CheckCircle, ChevronRight, Activity
} from 'lucide-react';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalGuests: 0,
    needsAssignment: 0,
    assigned: 0,
    accepted: 0,
    rejected: 0,
  });
  const [urgentEvents, setUrgentEvents] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        // Fetch events and all bookings in parallel (single round-trip)
        const [{ data: events }, { data: allBookingsRaw }] = await Promise.all([
          supabase
            .from('events')
            .select('*, guests(count)')
            .order('date', { ascending: true }),
          supabase
            .from('bookings')
            .select('id, status, event_id, guest_id, assigned_at, guests(name, event_id), drivers(name)')
            .order('assigned_at', { ascending: false }),
        ]);

        const allEvents = events || [];
        const allBookings = allBookingsRaw || [];

        let totalGuests = 0;
        allEvents.forEach(e => { totalGuests += e.guests?.[0]?.count ?? 0; });

        const counts = { Assigned: 0, Accepted: 0, Rejected: 0 };
        allBookings.forEach(b => {
          counts[b.status] = (counts[b.status] || 0) + 1;
        });

        const bookedGuestIds = new Set(allBookings.map(b => b.guest_id));
        const unbookedCount = totalGuests - bookedGuestIds.size;
        const needsAssignment = unbookedCount + (counts.Rejected || 0);

        setStats({
          totalEvents: allEvents.length,
          totalGuests,
          needsAssignment,
          assigned: counts.Assigned,
          accepted: counts.Accepted,
          rejected: counts.Rejected,
        });

        // Events that have unassigned guests (urgent events)
        const bookingCountByEvent = {};
        allBookings.forEach(b => {
          if (!bookingCountByEvent[b.event_id]) bookingCountByEvent[b.event_id] = { total: 0, rejected: 0 };
          bookingCountByEvent[b.event_id].total += 1;
          if (b.status === 'Rejected') bookingCountByEvent[b.event_id].rejected += 1;
        });

        const urgent = allEvents
          .map(e => {
            const guestCount = e.guests?.[0]?.count ?? 0;
            const bc = bookingCountByEvent[e.id] || { total: 0, rejected: 0 };
            const unassigned = guestCount - bc.total + bc.rejected;
            return { ...e, guestCount, unassigned };
          })
          .filter(e => e.unassigned > 0)
          .slice(0, 5);

        setUrgentEvents(urgent);
        setRecentBookings(allBookings.slice(0, 6));
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const statCards = [
    { label: 'Total Events', value: stats.totalEvents, icon: <Calendar size={20} />, color: 'var(--primary)', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Total Guests', value: stats.totalGuests, icon: <Users size={20} />, color: 'var(--secondary)', bg: 'rgba(6,182,212,0.12)' },
    { label: 'Needs Assignment', value: stats.needsAssignment, icon: <AlertTriangle size={20} />, color: 'var(--warning)', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Assigned', value: stats.assigned, icon: <Clock size={20} />, color: 'var(--info)', bg: 'rgba(56,189,248,0.12)' },
    { label: 'Accepted', value: stats.accepted, icon: <CheckCircle size={20} />, color: 'var(--success)', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Rejected', value: stats.rejected, icon: <AlertTriangle size={20} />, color: 'var(--danger)', bg: 'rgba(239,68,68,0.12)' },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Agent Dashboard</h2>
          <p>Overview of driver assignments across all events</p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
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

        {/* Urgent Alert */}
        {stats.needsAssignment > 0 && (
          <div className="action-bar" style={{ marginBottom: 24 }}>
            <AlertTriangle size={18} color="var(--warning)" />
            <span>
              <strong style={{ color: 'var(--warning)' }}>{stats.needsAssignment}</strong> guest(s) across {urgentEvents.length} event(s) need driver assignment.
            </span>
          </div>
        )}

        {/* Two column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Events Needing Attention */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} color="var(--warning)" />
                <h3>Needs Attention</h3>
              </div>
              <button className="btn btn-secondary btn-xs" onClick={() => navigate('/agent/events')}>
                All Events <ChevronRight size={12} />
              </button>
            </div>
            {urgentEvents.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
                <CheckCircle size={28} color="var(--success)" style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--success)' }}>All caught up!</div>
                <div style={{ fontSize: '0.8rem' }}>No events need attention right now.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {urgentEvents.map(ev => (
                  <div
                    key={ev.id}
                    className="card card-hover"
                    style={{ padding: '16px 18px', cursor: 'pointer' }}
                    onClick={() => navigate(`/agent/events/${ev.id}`)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{ev.name}</div>
                        <div style={{ display: 'flex', gap: 14, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={11} />
                            {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={11} /> {ev.guestCount} guests
                          </span>
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 12px', borderRadius: 99,
                        background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
                        color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 700,
                      }}>
                        {ev.unassigned} unassigned
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Activity size={16} color="var(--primary-light)" />
              <h3>Recent Activity</h3>
            </div>
            {recentBookings.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
                <Car size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: '0.85rem' }}>No driver assignments yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentBookings.map(b => {
                  const statusColor = {
                    Assigned: 'var(--info)',
                    Accepted: 'var(--success)',
                    Rejected: 'var(--danger)',
                    Pending: 'var(--warning)',
                  }[b.status] || 'var(--text-muted)';
                  const statusDot = { Assigned: '🔵', Accepted: '🟢', Rejected: '🔴', Pending: '🟡' }[b.status] || '⚪';

                  return (
                    <div key={b.id} className="card" style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.guests?.name || 'Guest'}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            <Car size={10} style={{ marginRight: 4 }} />
                            {b.drivers?.name || 'No driver'}
                          </div>
                        </div>
                        <span style={{
                          padding: '3px 10px', borderRadius: 99,
                          fontSize: '0.7rem', fontWeight: 600,
                          background: `${statusColor}18`,
                          color: statusColor,
                          border: `1px solid ${statusColor}33`,
                          whiteSpace: 'nowrap',
                        }}>
                          {statusDot} {b.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
