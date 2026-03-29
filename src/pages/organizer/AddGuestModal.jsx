import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const CAR_TYPES = ['Hatchback', 'Sedan', 'SUV'];

const INITIAL = {
  name: '', arrival_datetime: '', pickup_location: '',
  drop_location: '', return_required: false, car_preference: 'Sedan',
};

export default function AddGuestModal({ eventId, guest, onClose, onSaved }) {
  const isEdit = !!guest;
  const [form, setForm] = useState(
    isEdit
      ? {
          name: guest.name || '',
          arrival_datetime: guest.arrival_datetime
            ? guest.arrival_datetime.slice(0, 16) // format for datetime-local
            : '',
          pickup_location: guest.pickup_location || '',
          drop_location: guest.drop_location || '',
          return_required: guest.return_required || false,
          car_preference: guest.car_preference || 'Sedan',
        }
      : INITIAL
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      arrival_datetime: form.arrival_datetime,
      pickup_location: form.pickup_location.trim(),
      drop_location: form.drop_location.trim(),
      return_required: form.return_required,
      car_preference: form.car_preference,
    };

    if (isEdit) {
      const { error } = await supabase
        .from('guests')
        .update(payload)
        .eq('id', guest.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Guest updated!');
    } else {
      const { error } = await supabase.from('guests').insert({
        event_id: eventId,
        ...payload,
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Guest added!');
    }
    onSaved();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Guest' : 'Add Guest'}</span>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body guest-form">
            <div className="grid-2">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Guest Name</label>
                <input className="form-input" placeholder="Full name" required
                  value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Arrival Date &amp; Time</label>
                <input className="form-input" type="datetime-local" required
                  value={form.arrival_datetime} onChange={e => set('arrival_datetime', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Pickup Location</label>
                <input className="form-input" placeholder="Airport, Station..." required
                  value={form.pickup_location} onChange={e => set('pickup_location', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Drop Location</label>
                <input className="form-input" placeholder="Hotel, Venue..." required
                  value={form.drop_location} onChange={e => set('drop_location', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Car Preference</label>
                <select className="form-select"
                  value={form.car_preference} onChange={e => set('car_preference', e.target.value)}>
                  {CAR_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Return Required</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input type="radio" name="return_required"
                        checked={form.return_required === (opt === 'Yes')}
                        onChange={() => set('return_required', opt === 'Yes')} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update Guest' : 'Add Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
