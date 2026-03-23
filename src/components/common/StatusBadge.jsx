export default function StatusBadge({ status }) {
  const map = {
    Pending:  'badge-pending',
    Assigned: 'badge-assigned',
    Accepted: 'badge-accepted',
    Rejected: 'badge-rejected',
  };
  const dot = {
    Pending:  '🟡',
    Assigned: '🔵',
    Accepted: '🟢',
    Rejected: '🔴',
  };
  return (
    <span className={`badge ${map[status] || 'badge-pending'}`}>
      {dot[status] || '⚪'} {status || 'Pending'}
    </span>
  );
}
