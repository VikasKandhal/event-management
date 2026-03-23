import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';
import { ArrowLeft, Calendar, Car, Users, RefreshCw } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import AssignDriverModal from './AssignDriverModal.jsx';

export default function AgentEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent]     = useState(null);
  const [guests, setGuests]   = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [assignTarget, setAssignTarget] = useState(null); // { guest, booking|null }

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCar, setFilterCar]       = useState('');

  const fetchAll = async () => {
    setLoading(true);
    const [evRes, gRes, bRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('guests').select('*').eq('event_id', id).order('arrival_datetime'),
      supabase.from('bookings').select('*, drivers(*)').eq('event_id', id),
    ]);
    if (evRes.error) { toast.error('Event not found'); navigate('/agent/events'); return; }
    setEvent(evRes.data);
    setGuests(gRes.data || []);
    setBookings(bRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  const bookingByGuest = {};
  bookings.forEach(b => { bookingByGuest[b.guest_id] = b; });

  const filtered = guests.filter(g => {
    const booking = bookingByGuest[g.id];
    const status  = booking?.status || 'Pending';
    if (filterStatus && status !== filterStatus) return false;
    if (filterCar && g.car_preference !== filterCar) return false;
    return true;
  });

  // Stats
  const counts = { Pending: 0, Assigned: 0, Accepted: 0, Rejected: 0 };
  guests.forEach(g => {
    const s = bookingByGuest[g.id]?.status || 'Pending';
    counts[s] = (counts[s] || 0) + 1;
  });

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const canAssign = (booking) => {
    // Can assign if no booking yet, or if booking was rejected
    return !booking || booking.status === 'Rejected';
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="back-btn" onClick={() => navigate('/agent/events')}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h2>{event?.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              <Calendar size={12} />
              {new Date(event?.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={fetchAll}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: 'Total Guests', value: guests.length, icon: <Users size={18} color="var(--primary)" />, color: 'var(--primary)' },
            { label: 'Needs Assignment', value: counts.Pending + counts.Rejected, icon: '⏳', color: 'var(--warning)' },
            { label: 'Assigned', value: counts.Assigned, icon: '🔵', color: 'var(--info)' },
            { label: 'Accepted', value: counts.Accepted, icon: '✅', color: 'var(--success)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: '1.3rem' }}>{s.icon}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Attention banner */}
        {(counts.Pending + counts.Rejected) > 0 && (
          <div className="action-bar">
            <span>⚠️</span>
            <span>
              <strong style={{ color: 'var(--warning)' }}>{counts.Pending + counts.Rejected}</strong> guest(s) need a driver assigned.
              {counts.Rejected > 0 && <> &nbsp;·&nbsp; <strong style={{ color: 'var(--danger)' }}>{counts.Rejected}</strong> rejected — reassignment required.</>}
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="filter-bar">
          <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {['Pending', 'Assigned', 'Accepted', 'Rejected'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="form-select" value={filterCar} onChange={e => setFilterCar(e.target.value)}>
            <option value="">All Car Types</option>
            {['Hatchback', 'Sedan', 'SUV'].map(t => <option key={t}>{t}</option>)}
          </select>
          {(filterStatus || filterCar) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStatus(''); setFilterCar(''); }}>Clear</button>
          )}
          <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>
            {filtered.length} of {guests.length} guests
          </span>
        </div>

        {/* Guests Table */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={42} />
            <h3>No guests found</h3>
            <p>Guests added by the organizer will appear here.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Guest Name</th>
                  <th>Arrival</th>
                  <th>Pickup → Drop</th>
                  <th>Car Pref</th>
                  <th>Return</th>
                  <th>Status</th>
                  <th>Assigned Driver</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g, idx) => {
                  const booking = bookingByGuest[g.id];
                  const driver  = booking?.drivers;
                  const needsAssign = canAssign(booking);

                  return (
                    <tr key={g.id} style={booking?.status === 'Rejected' ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                      <td style={{ color: 'var(--text-subtle)' }}>{idx + 1}</td>
                      <td><strong>{g.name}</strong></td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {g.arrival_datetime
                          ? new Date(g.arrival_datetime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td style={{ fontSize: '0.82rem', maxWidth: 200 }}>
                        <span>{g.pickup_location}</span>
                        <span style={{ color: 'var(--text-subtle)', margin: '0 4px' }}>→</span>
                        <span>{g.drop_location}</span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg-card2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          <Car size={11} /> {g.car_preference}
                        </span>
                      </td>
                      <td>{g.return_required ? '✅' : '❌'}</td>
                      <td><StatusBadge status={booking?.status || 'Pending'} /></td>
                      <td>
                        {driver ? (
                          <div className="driver-cell">
                            <span className="driver-name">{driver.name}</span>
                            <span className="driver-sub">{driver.mobile} · {driver.car_number}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-subtle)', fontSize: '0.82rem' }}>Not assigned</span>
                        )}
                      </td>
                      <td>
                        {needsAssign ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setAssignTarget({ guest: g, booking: booking || null })}
                          >
                            <Car size={13} />
                            {booking?.status === 'Rejected' ? 'Re-assign' : 'Assign'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                            {booking?.status === 'Accepted' ? '✅ Done' : '⏳ Pending approval'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {assignTarget && (
        <AssignDriverModal
          guest={assignTarget.guest}
          booking={assignTarget.booking}
          onClose={() => setAssignTarget(null)}
          onSaved={fetchAll}
        />
      )}
    </>
  );
}
