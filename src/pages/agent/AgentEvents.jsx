import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import { Calendar, Users, ChevronRight } from 'lucide-react';

export default function AgentEvents() {
  const navigate  = useNavigate();
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, guests(count)')
        .order('date', { ascending: false });
      if (error) toast.error(error.message);
      else setEvents(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = events.filter(ev =>
    ev.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h2>All Events</h2>
          <p className="text-sm text-muted">View events and assign drivers to guests</p>
        </div>
      </div>

      <div className="page-body">
        <div className="filter-bar" style={{ marginBottom: 20 }}>
          <input
            className="form-input"
            placeholder="Search events…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <h3>No events found</h3>
            <p>Events created by organizers will appear here.</p>
          </div>
        ) : (
          <div className="events-grid">
            {filtered.map(ev => (
              <div key={ev.id} className="event-card" onClick={() => navigate(`/agent/events/${ev.id}`)}>
                <h3>{ev.name}</h3>
                <div className="event-card-date">
                  <Calendar size={13} />
                  {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="event-card-footer">
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <Users size={13} />
                    {ev.guests?.[0]?.count ?? 0} guests
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
