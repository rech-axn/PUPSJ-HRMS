import './hrms-api.js';
import './hrms-chat.js';

async function loadPage() {
    if (document.getElementById('workspace')) return import('./hrms-staff.js');
    if (document.getElementById('siteNav')) return import('./hrms-home.js');
    if (document.getElementById('availability')) return import('./hrms-booking.js');
    if (document.getElementById('guestReservations')) return import('./hrms-guest.js');
    if (document.getElementById('signin')) return import('./hrms-auth.js');
    if (document.getElementById('menuCatalog')) return import('./hrms-menu.js');
    if (document.getElementById('resetForm')) return import('./hrms-reset.js');
    if (document.getElementById('paymentStatus')) return import('./hrms-payment-return.js');
}
loadPage().catch(HRMS.error);
