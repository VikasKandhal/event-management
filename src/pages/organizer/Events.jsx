import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';
import { Plus, Calendar, Users, ChevronRight, X } from 'lucide-react';

export default function OrganizerEvents() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]   = useState({ name: '', date: '' });
  const [saving, setSaving] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*, guests(count)')
      .eq('organizer_id', user.id)
      .order('date', { ascending: false });
    if (error) toast.error(error.message);
    else setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date) { toast.error('Fill in all fields'); return; }
    setSaving(true);
    const { error } = await supabase.from('events').insert({
      name: form.name.trim(),
      date: form.date,
      organizer_id: user.id,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('Event created!');
    setShowModal(false);
    setForm({ name: '', date: '' });
    fetchEvents();
    setSaving(false);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>My Events</h2>
          <p>Manage guest travel for your college events</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Event
        </button>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Calendar size={28} />
            </div>
            <h3>No events yet</h3>
            <p>Create your first event to start managing guest travel.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
              <Plus size={15} /> Create Event
            </button>
          </div>
        ) : (
          <div className="events-grid">
            {events.map(ev => (
              <div key={ev.id} className="event-card" onClick={() => navigate(`/organizer/events/${ev.id}`)}>
                <div className="event-card-name">{ev.name}</div>
                <div className="event-card-date">
                  <Calendar size={13} />
                  {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="event-card-footer">
                  <span className="event-pill">
                    <Users size={12} />
                    {ev.guests?.[0]?.count ?? 0} guests
                  </span>
                  <ChevronRight size={16} color="var(--text-subtle)" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create New Event</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Event Name</label>
                  <input className="form-input" placeholder="e.g. Annual Tech Fest 2025"
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Event Date</label>
                  <input className="form-input" type="date"
                    value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
