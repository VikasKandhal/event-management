import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';
import { X, Car, Phone, Hash, AlertTriangle } from 'lucide-react';

const CAR_TYPES = ['All', 'Hatchback', 'Sedan', 'SUV'];

export default function AssignDriverModal({ guest, booking, onClose, onSaved }) {
  const { user } = useAuth();
  const [drivers, setDrivers]     = useState([]);
  const [selected, setSelected]   = useState(booking?.driver_id || null);
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [busyDriverIds, setBusyDriverIds] = useState(new Set());

  useEffect(() => {
    (async () => {
      // Fetch drivers
      const { data: driverData } = await supabase.from('drivers').select('*').order('name');
      setDrivers(driverData || []);

      // Fetch active bookings (Assigned or Accepted) to detect conflicts
      // A driver is "busy" if already assigned to another guest on the same day
      if (guest.arrival_datetime) {
        const guestDate = guest.arrival_datetime.slice(0, 10);
        const { data: existingBookings } = await supabase
          .from('bookings')
          .select('driver_id, guest_id, guests!inner(arrival_datetime)')
          .in('status', ['Assigned', 'Accepted'])
          .neq('guest_id', guest.id);

        const busy = new Set();
        (existingBookings || []).forEach(b => {
          const bDate = b.guests?.arrival_datetime?.slice(0, 10);
          if (bDate === guestDate && b.driver_id) {
            busy.add(b.driver_id);
          }
        });
        setBusyDriverIds(busy);
      }
    })();
  }, [guest.id, guest.arrival_datetime]);

  const filtered = drivers.filter(d => {
    if (filterType !== 'All' && d.car_type !== filterType) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.car_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Sort: available drivers first, then busy ones
  const sorted = [...filtered].sort((a, b) => {
    const aBusy = busyDriverIds.has(a.id) ? 1 : 0;
    const bBusy = busyDriverIds.has(b.id) ? 1 : 0;
    return aBusy - bBusy;
  });

  const handleAssign = async () => {
    if (!selected) { toast.error('Please select a driver'); return; }
    setSaving(true);
    if (booking?.id) {
      const { error } = await supabase
        .from('bookings')
        .update({ driver_id: selected, status: 'Assigned', assigned_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', booking.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('bookings').insert({
        guest_id: guest.id,
        event_id: guest.event_id,
        driver_id: selected,
        status: 'Assigned',
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success('Driver assigned!');
    onSaved();
    onClose();
  };

  const typeColors = { Hatchback: 'var(--success)', Sedan: 'var(--secondary)', SUV: 'var(--warning)' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-title">Assign Driver</span>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Guest: <strong style={{ color: 'var(--text)' }}>{guest.name}</strong> &nbsp;·&nbsp;
              Prefers: <strong style={{ color: 'var(--text)' }}>{guest.car_preference}</strong>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Busy driver info */}
        {busyDriverIds.size > 0 && (
          <div className="action-bar" style={{ marginBottom: 12, fontSize: '0.8rem', padding: '8px 12px' }}>
            <AlertTriangle size={14} color="var(--warning)" />
            <span>{busyDriverIds.size} driver(s) already assigned on this date — shown with a ⚠️ badge.</span>
          </div>
        )}

        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input
            className="form-input"
            placeholder="Search driver or car no…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {CAR_TYPES.map(t => (
              <button
                key={t}
                className={`btn btn-sm ${filterType === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Driver List */}
        <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <Car size={32} />
              <p>No drivers match</p>
            </div>
          ) : sorted.map(d => {
            const isBusy = busyDriverIds.has(d.id);
            return (
              <div
                key={d.id}
                onClick={() => setSelected(d.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                  border: `2px solid ${selected === d.id ? 'var(--primary)' : isBusy ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                  background: selected === d.id ? 'rgba(79,70,229,0.1)' : isBusy ? 'rgba(245,158,11,0.04)' : 'var(--bg-input)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  opacity: isBusy ? 0.7 : 1,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: isBusy
                    ? 'linear-gradient(135deg, var(--warning), #d97706)'
                    : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontWeight: 700, color: '#fff', fontSize: '1rem',
                }}>
                  {d.name[0]}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {d.name}
                    {isBusy && (
                      <span style={{
                        padding: '1px 7px', borderRadius: 99,
                        fontSize: '0.65rem', fontWeight: 700,
                        background: 'rgba(245,158,11,0.15)',
                        color: 'var(--warning)',
                        border: '1px solid rgba(245,158,11,0.3)',
                      }}>
                        ⚠️ Busy
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2, flexWrap: 'wrap' }}>
                    <span><Phone size={10} style={{ marginRight: 3 }} />{d.mobile}</span>
                    <span><Hash size={10} style={{ marginRight: 3 }} />{d.car_number}</span>
                  </div>
                </div>

                <span style={{
                  padding: '3px 10px', borderRadius: 99,
                  fontSize: '0.72rem', fontWeight: 600,
                  background: `${typeColors[d.car_type]}22`,
                  color: typeColors[d.car_type],
                  border: `1px solid ${typeColors[d.car_type]}44`,
                  flexShrink: 0,
                }}>
                  {d.car_type}
                </span>

                {selected === d.id && (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: 12 }}>✓</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="modal-footer" style={{ marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAssign} disabled={saving || !selected}>
            {saving ? 'Assigning…' : booking?.status === 'Rejected' ? 'Re-assign Driver' : 'Assign Driver'}
          </button>
        </div>
      </div>
    </div>
  );
}
