/* ==========================================================================
   PUPSJ Hotel & Restaurant — Contact Logic (contact.js)
   Renders contact info from CONFIG, handles inquiry submission, saves to
   inquiries store, and provides reference number INQ-####.
   ========================================================================== */
'use strict';

(function () {
  // 1. Populate Contact Details from CONFIG
  if ($('contactAddressText')) $('contactAddressText').textContent = CONFIG.address;
  if ($('contactPhoneText')) $('contactPhoneText').innerHTML = `${CONFIG.phones.join(' &middot; ')}<br>Concierge Mobile: ${CONFIG.mobileConcierge}`;
  if ($('contactEmailText')) $('contactEmailText').innerHTML = `Reservations: ${CONFIG.emails.reservations}<br>Billing &amp; Invoices: ${CONFIG.emails.billing}`;
  if ($('contactResponsePromiseText')) {
    $('contactResponsePromiseText').textContent = `We respond to all online inquiries ${CONFIG.responseTime}.`;
  }

  // 2. Inquiry Submission Form
  const form = $('contactInquiryForm');
  if (form) {
    form.onsubmit = e => {
      e.preventDefault();
      const name = $('cName').value.trim();
      const email = $('cEmail').value.trim();
      const phone = $('cPhone').value.trim();
      const type = $('cType').value;
      const message = $('cMsg').value.trim();

      if (!name || !email || !message) {
        toast('Please complete all required fields.');
        return;
      }

      // Persist real inquiry in Data.inquiries store
      const inq = Data.createInquiry({
        name,
        email,
        phone,
        type,
        message
      });

      showModal(
        'Inquiry Transmitted',
        `
        <div style="text-align: center; padding: 12px 0;">
          <span class="pill pill--ok" style="font-size: 13px; padding: 4px 12px;">Inquiry Reference Generated</span>
          <h2 style="margin: 12px 0 4px; font-size: 32px;">${inq.ref}</h2>
          <p class="text-sm">Thank you, <b>${esc(name)}</b>. Your message has been logged in our front desk queue.</p>

          <div class="card card-sm" style="margin: 16px 0; text-align: left; background-color: var(--surface-2);">
            <div><b>Reference Number:</b> ${inq.ref}</div>
            <div><b>Category:</b> ${esc(type)}</div>
            <div><b>Email:</b> ${esc(email)}</div>
            <div><b>Mobile:</b> ${esc(phone)}</div>
          </div>

          <p class="text-sm text-muted">A staff member will review your inquiry and follow up ${CONFIG.responseTime}.</p>
        </div>
        `,
        `<button class="btn btn-block" onclick="closeModal()">Close</button>`,
        { maxWidth: '480px' }
      );

      form.reset();
    };
  }
})();
