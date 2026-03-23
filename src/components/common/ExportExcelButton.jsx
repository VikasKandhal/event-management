import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

export default function ExportExcelButton({ guests, bookings, drivers, eventName }) {
  const handleExport = () => {
    // Build a drivers map for quick lookup
    const driverMap = {};
    drivers.forEach(d => { driverMap[d.id] = d; });

    const bookingMap = {};
    bookings.forEach(b => { bookingMap[b.guest_id] = b; });

    const rows = guests.map(g => {
      const booking = bookingMap[g.id];
      const driver  = booking?.driver_id ? driverMap[booking.driver_id] : null;
      return {
        'Guest Name':        g.name,
        'Arrival Date/Time': g.arrival_datetime
          ? new Date(g.arrival_datetime).toLocaleString()
          : '',
        'Pickup Location':   g.pickup_location,
        'Drop Location':     g.drop_location,
        'Return Required':   g.return_required ? 'Yes' : 'No',
        'Car Preference':    g.car_preference,
        'Driver Name':       driver?.name || '-',
        'Driver Mobile':     driver?.mobile || '-',
        'Car Number':        driver?.car_number || '-',
        'Car Type':          driver?.car_type || '-',
        'Status':            booking?.status || 'Pending',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guests');

    // Auto-width columns
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2,
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `${eventName || 'Event'}_Travel_Report.xlsx`);
  };

  return (
    <button className="btn btn-success" onClick={handleExport} disabled={guests.length === 0}>
      <Download size={15} />
      Export Excel
    </button>
  );
}
