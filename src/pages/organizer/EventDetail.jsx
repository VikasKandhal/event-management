import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Upload, Calendar, CheckCircle,
  XCircle, Users, Car, Download
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ExportExcelButton from '../../components/common/ExportExcelButton.jsx';
import AddGuestModal from './AddGuestModal.jsx';
import * as XLSX from 'xlsx';

export default function OrganizerEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent]     = useState(null);
  const [guests, setGuests]   = useState([]);
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate]     = useState('');

  const fileRef = useRef();

  const fetchAll = async () => {
    setLoading(true);
    const [evRes, gRes, bRes, dRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('guests').select('*').eq('event_id', id).order('created_at'),
      supabase.from('bookings').select('*, drivers(*)').eq('event_id', id),
      supabase.from('drivers').select('*'),
    ]);
    if (evRes.error) { toast.error('Event not found'); navigate('/organizer/events'); return; }
    setEvent(evRes.data);
    setGuests(gRes.data || []);
    setBookings(bRes.data || []);
    setDrivers(dRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  // Build booking lookup by guest_id
  const bookingByGuest = {};
  bookings.forEach(b => { bookingByGuest[b.guest_id] = b; });

  // Handle approve / reject
  const updateStatus = async (bookingId, status) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Assignment ${status.toLowerCase()}!`);
    fetchAll();
  };

  // CSV / Excel bulk upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb  = XLSX.read(evt.target.result, { type: 'binary' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        if (!rows.length) { toast.error('File is empty'); return; }

        const records = rows.map(r => ({
          event_id: id,
          name: r['Guest Name'] || r['name'] || '',
          arrival_datetime: r['Arrival Date/Time'] || r['arrival_datetime'] || null,
          pickup_location: r['Pickup Location'] || r['pickup_location'] || '',
          drop_location: r['Drop Location'] || r['drop_location'] || '',
          return_required: String(r['Return Required'] || r['return_required'] || 'No').toLowerCase() === 'yes',
          car_preference: r['Car Preference'] || r['car_preference'] || 'Sedan',
        })).filter(r => r.name);

        const { error } = await supabase.from('guests').insert(records);
        if (error) { toast.error(error.message); return; }
        toast.success(`Imported ${records.length} guests!`);
        fetchAll();
      } catch {
        toast.error('Could not parse file. Use the template format.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Filtered guests
  const filtered = guests.filter(g => {
    const booking = bookingByGuest[g.id];
    const status  = booking?.status || 'Pending';
    if (filterStatus && status !== filterStatus) return false;
    if (filterDate) {
      const d = g.arrival_datetime ? g.arrival_datetime.slice(0, 10) : '';
      if (d !== filterDate) return false;
    }
    return true;
  });

  // Stats
  const counts = { Pending: 0, Assigned: 0, Accepted: 0, Rejected: 0 };
  guests.forEach(g => {
    const s = bookingByGuest[g.id]?.status || 'Pending';
    counts[s] = (counts[s] || 0) + 1;
  });

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="back-btn" onClick={() => navigate('/organizer/events')}>
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
        <div className="flex gap-2">
          <ExportExcelButton
            guests={guests}
            bookings={bookings}
            drivers={drivers}
            eventName={event?.name}
          />
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add Guest
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: 'Total Guests', value: guests.length, color: 'var(--primary)', icon: <Users size={18} color="var(--primary)" /> },
            { label: 'Pending',  value: counts.Pending,  color: 'var(--warning)', icon: '🟡' },
            { label: 'Assigned', value: counts.Assigned, color: 'var(--info)',    icon: '🔵' },
            { label: 'Accepted', value: counts.Accepted, color: 'var(--success)', icon: '🟢' },
            { label: 'Rejected', value: counts.Rejected, color: 'var(--danger)',  icon: '🔴' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: '1.3rem' }}>{s.icon}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {['Pending', 'Assigned', 'Accepted', 'Rejected'].map(s => <option key={s}>{s}</option>)}
          </select>
          <input className="form-input" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          {(filterStatus || filterDate) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStatus(''); setFilterDate(''); }}>
              Clear Filters
            </button>
          )}
          <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>
            Showing {filtered.length} of {guests.length} guests
          </span>
        </div>

        {/* Guests Table */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={42} />
            <h3>No guests found</h3>
            <p>{guests.length === 0 ? 'Add guests or import a CSV file.' : 'Try clearing the filters.'}</p>
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
                  <th>Driver Assigned</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g, idx) => {
                  const booking = bookingByGuest[g.id];
                  const driver  = booking?.drivers;
                  return (
                    <tr key={g.id}>
                      <td style={{ color: 'var(--text-subtle)' }}>{idx + 1}</td>
                      <td><strong>{g.name}</strong></td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {g.arrival_datetime
                          ? new Date(g.arrival_datetime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td style={{ fontSize: '0.82rem', maxWidth: 200 }}>
                        <span title={g.pickup_location}>{g.pickup_location}</span>
                        <span style={{ color: 'var(--text-subtle)', margin: '0 4px' }}>→</span>
                        <span title={g.drop_location}>{g.drop_location}</span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg-card2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          <Car size={11} /> {g.car_preference}
                        </span>
                      </td>
                      <td>{g.return_required ? '✅ Yes' : '❌ No'}</td>
                      <td><StatusBadge status={booking?.status || 'Pending'} /></td>
                      <td>
                        {driver ? (
                          <div className="driver-cell">
                            <span className="driver-name">{driver.name}</span>
                            <span className="driver-sub">{driver.mobile} · {driver.car_number} ({driver.car_type})</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-subtle)', fontSize: '0.82rem' }}>Not assigned</span>}
                      </td>
                      <td>
                        {booking?.status === 'Assigned' ? (
                          <div className="flex gap-2">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => updateStatus(booking.id, 'Accepted')}
                            >
                              <CheckCircle size={13} /> Accept
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => updateStatus(booking.id, 'Rejected')}
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>—</span>
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

      {showAdd && (
        <AddGuestModal
          eventId={id}
          onClose={() => setShowAdd(false)}
          onSaved={fetchAll}
        />
      )}
    </>
  );
}
