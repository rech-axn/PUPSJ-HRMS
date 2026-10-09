/* ==========================================================================
   PUPSJ Hotel & Restaurant — Payments & Finance (payments.js)
   Guest Folios ledger, Official Receipts transaction log,
   Quick Payment Terminal, tax invoice printing, and CSV exports.
   ========================================================================== */
'use strict';

(function () {
  let activeTab = 'folios'; // 'folios' | 'ledger'
  let folioFilter = '';
  let ledgerMethodFilter = '';
  let searchQuery = '';
  let page = 1;
  const pageSize = 12;

  function init() {
    renderApp();
  }

  function getFoliosData() {
    const list = Data.getReservations();
    return list.map(r => {
      const total = Data.tot(r);
      const paid = Data.paidAmt(r);
      const bal = Data.balOf(r);
      const status = bal <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
      return {
        res: r,
        code: r.c,
        guest: r.g,
        room: r.n,
        type: r.t,
        total,
        paid,
        balance: bal,
        status,
        resStatus: r.st
      };
    });
  }

  function getAllTransactions() {
    const txList = [];
    const reservations = Data.getReservations();
    const orders = Data.getOrders ? Data.getOrders() : [];

    // 1. Hotel Folio Payments
    reservations.forEach(r => {
      (r.pay || []).forEach(p => {
        txList.push({
          or: p.id || p.or || 'OR-00000',
          d: p.d || today(),
          source: 'Room Folio',
          refCode: r.c,
          party: `${r.g} (Room ${r.n})`,
          type: p.k || p.t || 'Payment',
          method: (() => {
            const raw = (p.m || p.method || 'Cash').toLowerCase();
            if (raw.includes('credit')) return 'Credit Card';
            if (raw.includes('debit')) return 'Debit Card';
            if (raw.includes('gcash')) return 'GCash';
            if (raw.includes('maya')) return 'Maya';
            if (raw.includes('bank')) return 'Bank Transfer';
            if (raw.includes('room')) return 'Room Folio';
            return 'Cash';
          })(),
          refInfo: p.ref || p.auth || 'Front Desk',
          amount: Number(p.a != null ? p.a : p.amt) || 0
        });
      });
    });

    // 2. Restaurant Orders (Direct Paid)
    orders.forEach(o => {
      if ((o.payStatus === 'Paid' || o.status === 'Paid') && (o.payment || o.paymentKind)) {
        let orNum = 'OR-POS';
        if (o.payment?.or) orNum = o.payment.or;
        else if (o.paymentKind && o.paymentKind.includes('OR:')) {
          const match = o.paymentKind.match(/OR:\s*([^)]+)/);
          if (match) orNum = match[1].trim();
        }

        const amt = Number(o.subtotal) || (o.lines || []).reduce((sum, l) => sum + (l.qty * (l.unitPrice || l.price || 0)), 0);

        txList.push({
          or: orNum,
          d: o.updated ? o.updated.slice(0, 10) : (o.created ? o.created.slice(0, 10) : today()),
          source: 'Restaurant POS',
          refCode: o.code,
          party: o.target || (o.type === 'Dine-in' ? `Table ${o.table || 'Dine-in'}` : 'Takeaway'),
          type: 'Restaurant Bill',
          method: o.payment?.method || (o.paymentKind ? o.paymentKind.split('(')[0].trim() : 'Cash'),
          refInfo: o.payment?.ref || 'Dining Tab',
          amount: amt
        });
      }
    });

    // Sort by date / OR number descending
    return txList.sort((a, b) => (b.d || '').localeCompare(a.d || '') || (b.or || '').localeCompare(a.or || ''));
  }

  function renderApp() {
    const app = $('paymentsApp');
    if (!app) return;

    const folios = getFoliosData();
    const txList = getAllTransactions();

    const totalCollected = txList.reduce((sum, t) => sum + (t.type === 'Refund' ? -t.amount : t.amount), 0);
    const totalOutstanding = folios.reduce((sum, f) => sum + f.balance, 0);
    const paidFoliosCount = folios.filter(f => f.status === 'Paid').length;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">FINANCE &amp; SETTLEMENT</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Billing, Folios &amp; Payments</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" id="btnExportPaymentsCSV">
            <span class="ic" data-icon="download">[ICON: download]</span> Export CSV
          </button>
          <button class="btn" id="btnQuickTerminal">
            <span class="ic" data-icon="credit-card">[ICON: credit-card]</span> Payment Terminal
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Total Net Collected</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${peso(totalCollected)}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Outstanding Folio Balance</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: ${totalOutstanding > 0 ? 'var(--bad)' : 'var(--ok)'}; margin-top: 4px;">${peso(totalOutstanding)}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Settled Folios</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--info); margin-top: 4px;">${paidFoliosCount} / ${folios.length}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Official Receipts Issued</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${txList.length}</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom: 16px;">
        <button class="tab-btn ${activeTab === 'folios' ? 'active' : ''}" id="tabBtnFolios">
          <span class="ic" data-icon="wallet">[ICON: wallet]</span> Guest Folios Ledger (${folios.length})
        </button>
        <button class="tab-btn ${activeTab === 'ledger' ? 'active' : ''}" id="tabBtnLedger">
          <span class="ic" data-icon="receipt">[ICON: receipt]</span> Official Receipts Ledger (${txList.length})
        </button>
      </div>

      <!-- View 1: Guest Folios -->
      <div id="viewFolios" style="${activeTab === 'folios' ? '' : 'display:none;'}">
        <div class="card" style="padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
            <div class="field" style="margin: 0; min-width: 240px;">
              <label>Search Folios</label>
              <input type="text" id="folioSearchInput" placeholder="Guest name, code, or room…" value="${esc(searchQuery)}">
            </div>
            <div class="field" style="margin: 0; min-width: 160px;">
              <label>Payment Status</label>
              <select id="folioStatusFilter">
                <option value="">All Statuses</option>
                <option value="Paid" ${folioFilter === 'Paid' ? 'selected' : ''}>Paid in Full</option>
                <option value="Partial" ${folioFilter === 'Partial' ? 'selected' : ''}>Partial Balance</option>
                <option value="Unpaid" ${folioFilter === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
              </select>
            </div>
            <div>
              <button class="btn-ghost" id="btnResetFolioFilters" style="height: 40px;">Reset</button>
            </div>
          </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Folio Code</th>
                  <th>Guest Name</th>
                  <th>Room</th>
                  <th>Total Charges</th>
                  <th>Total Paid</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody id="foliosTableBody">
                <!-- Injected dynamically -->
              </tbody>
            </table>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="foliosPagination">
          </div>
        </div>
      </div>

      <!-- View 2: Transaction Ledger -->
      <div id="viewLedger" style="${activeTab === 'ledger' ? '' : 'display:none;'}">
        <div class="card" style="padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
            <div class="field" style="margin: 0; min-width: 220px;">
              <label>Search Receipt / Ref</label>
              <input type="text" id="ledgerSearchInput" placeholder="OR #, party, or code…">
            </div>
            <div class="field" style="margin: 0; min-width: 160px;">
              <label>Payment Method</label>
              <select id="ledgerMethodFilter">
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <button class="btn-ghost" id="btnResetLedgerFilters" style="height: 40px;">Reset</button>
            </div>
          </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Reference</th>
                  <th>Party</th>
                  <th>Method</th>
                  <th>Transaction Type</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody id="ledgerTableBody">
                <!-- Injected dynamically -->
              </tbody>
            </table>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="ledgerPagination">
          </div>
        </div>
      </div>
    `;

    bindEvents();
    renderFoliosTable();
    renderLedgerTable();
  }

  function bindEvents() {
    $('tabBtnFolios').onclick = () => {
      activeTab = 'folios';
      $('tabBtnFolios').classList.add('active');
      $('tabBtnLedger').classList.remove('active');
      $('viewFolios').style.display = '';
      $('viewLedger').style.display = 'none';
      renderFoliosTable();
    };

    $('tabBtnLedger').onclick = () => {
      activeTab = 'ledger';
      $('tabBtnLedger').classList.add('active');
      $('tabBtnFolios').classList.remove('active');
      $('viewLedger').style.display = '';
      $('viewFolios').style.display = 'none';
      renderLedgerTable();
    };

    $('folioSearchInput').oninput = (e) => { searchQuery = e.target.value.toLowerCase().trim(); page = 1; renderFoliosTable(); };
    $('folioStatusFilter').onchange = (e) => { folioFilter = e.target.value; page = 1; renderFoliosTable(); };
    $('btnResetFolioFilters').onclick = () => {
      searchQuery = '';
      folioFilter = '';
      $('folioSearchInput').value = '';
      $('folioStatusFilter').value = '';
      page = 1;
      renderFoliosTable();
    };

    $('ledgerSearchInput').oninput = () => { page = 1; renderLedgerTable(); };
    $('ledgerMethodFilter').onchange = () => { page = 1; renderLedgerTable(); };
    $('btnResetLedgerFilters').onclick = () => {
      $('ledgerSearchInput').value = '';
      $('ledgerMethodFilter').value = '';
      page = 1;
      renderLedgerTable();
    };

    $('btnExportPaymentsCSV').onclick = () => {
      if (activeTab === 'folios') {
        const items = getFilteredFolios();
        const cols = [
          { header: 'Folio Code', key: 'code' },
          { header: 'Guest Name', key: 'guest' },
          { header: 'Room Number', key: 'room' },
          { header: 'Room Type', key: 'type' },
          { header: 'Total Charges (PHP)', key: 'total' },
          { header: 'Total Paid (PHP)', key: 'paid' },
          { header: 'Balance Due (PHP)', key: 'balance' },
          { header: 'Payment Status', key: 'status' }
        ];
        exportCSV(`PUPSJ_Folios_${today()}.csv`, cols, items);
      } else {
        const items = getFilteredLedger();
        const cols = [
          { header: 'Receipt #', key: 'or' },
          { header: 'Date', key: 'd' },
          { header: 'Source', key: 'source' },
          { header: 'Reference', key: 'refCode' },
          { header: 'Guest / Party', key: 'party' },
          { header: 'Method', key: 'method' },
          { header: 'Type', key: 'type' },
          { header: 'Amount (PHP)', key: 'amount' }
        ];
        exportCSV(`PUPSJ_Receipts_Ledger_${today()}.csv`, cols, items);
      }
    };

    $('btnQuickTerminal').onclick = () => openQuickTerminalModal();
  }

  function getFilteredFolios() {
    const list = getFoliosData();
    return list.filter(f => {
      if (folioFilter && f.status !== folioFilter) return false;
      if (searchQuery) {
        const text = `${f.code} ${f.guest} Room ${f.room} ${f.type}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    });
  }

  function renderFoliosTable() {
    const tbody = $('foliosTableBody');
    const pgnEl = $('foliosPagination');
    if (!tbody) return;

    const list = getFilteredFolios();
    const pgn = paginate(list, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 24px;">No guest folios match your search filters.</td></tr>`;
      pgnEl.innerHTML = `<span>Showing 0 of 0</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(f => {
      const pillClass = f.status === 'Paid' ? 'pill--ok' : f.status === 'Partial' ? 'pill--warn' : 'pill--bad';

      return `
        <tr>
          <td><b>${f.code}</b></td>
          <td><b>${esc(f.guest)}</b></td>
          <td>${esc(f.type)} &middot; Room ${f.room}</td>
          <td>${peso(f.total)}</td>
          <td style="color: var(--ok); font-weight: 500;">${peso(f.paid)}</td>
          <td style="color: ${f.balance > 0 ? 'var(--bad)' : 'var(--ok)'}; font-weight: 600;">
            ${f.balance > 0 ? peso(f.balance) : '₱0 (Settled)'}
          </td>
          <td><span class="pill ${pillClass}">${f.status}</span></td>
          <td style="text-align: right;">
            <div style="display: flex; justify-content: flex-end; gap: 4px;">
              <button class="btn-secondary btn-sm" onclick="openFolioModal('${f.code}', () => renderApp())">Folio</button>
              <button class="btn-secondary btn-sm" onclick="printTaxInvoice('${f.code}')">Invoice</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    pgnEl.innerHTML = `
      <span class="text-secondary">Showing ${pgn.startIdx + 1}&ndash;${pgn.endIdx} of ${pgn.totalItems} folios</span>
      <div style="display: flex; gap: 4px;">
        <button class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnFolioPrev">Previous</button>
        <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages}</span>
        <button class="btn-secondary btn-sm" ${page >= pgn.totalPages ? 'disabled' : ''} id="btnFolioNext">Next</button>
      </div>
    `;

    const prev = $('btnFolioPrev');
    if (prev) prev.onclick = () => { page--; renderFoliosTable(); };
    const next = $('btnFolioNext');
    if (next) next.onclick = () => { page++; renderFoliosTable(); };
  }

  function getFilteredLedger() {
    const list = getAllTransactions();
    const q = ($('ledgerSearchInput')?.value || '').toLowerCase().trim();
    const method = $('ledgerMethodFilter')?.value || '';

    return list.filter(t => {
      if (method && (t.method || '').toLowerCase() !== method.toLowerCase()) return false;
      if (q) {
        const text = `${t.or} ${t.source} ${t.refCode} ${t.party} ${t.refInfo}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }

  function renderLedgerTable() {
    const tbody = $('ledgerTableBody');
    const pgnEl = $('ledgerPagination');
    if (!tbody) return;

    const list = getFilteredLedger();
    const pgn = paginate(list, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 24px;">No receipts or transactions recorded.</td></tr>`;
      pgnEl.innerHTML = `<span>Showing 0 of 0</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(t => {
      return `
        <tr>
          <td><b>${esc(t.or)}</b></td>
          <td>${fmtDate(t.d)}</td>
          <td><span class="pill pill--info" style="font-size: 11px;">${esc(t.source)}</span></td>
          <td>${esc(t.refCode)}</td>
          <td>${esc(t.party)}</td>
          <td>${esc(t.method)}</td>
          <td><span class="pill pill--ok" style="font-size: 11px;">${esc(t.type)}</span></td>
          <td style="text-align: right; font-weight: 600; color: ${t.type === 'Refund' ? 'var(--bad)' : 'var(--ok)'};">
            ${t.type === 'Refund' ? '&minus; ' : ''}${peso(t.amount)}
          </td>
        </tr>
      `;
    }).join('');

    pgnEl.innerHTML = `
      <span class="text-secondary">Showing ${pgn.startIdx + 1}&ndash;${pgn.endIdx} of ${pgn.totalItems} receipts</span>
      <div style="display: flex; gap: 4px;">
        <button class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnLedgerPrev">Previous</button>
        <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages}</span>
        <button class="btn-secondary btn-sm" ${page >= pgn.totalPages ? 'disabled' : ''} id="btnLedgerNext">Next</button>
      </div>
    `;

    const prev = $('btnLedgerPrev');
    if (prev) prev.onclick = () => { page--; renderLedgerTable(); };
    const next = $('btnLedgerNext');
    if (next) next.onclick = () => { page++; renderLedgerTable(); };
  }

  function openQuickTerminalModal() {
    const reservations = Data.getReservations().filter(r => r.st !== 'Cancelled');

    const bodyHtml = `
      <form id="posTerminalForm" style="font-size: 13px;">
        <p class="text-sm text-secondary" style="margin-top: 0;">Quick settlement terminal for front desk payments, deposits, and folio transactions.</p>
        <div class="field">
          <label>Select Guest Folio / Reservation *</label>
          <select id="posResCode" required>
            ${reservations.map(r => {
              const bal = Data.balOf(r);
              return `<option value="${r.c}">${r.c} &ndash; ${esc(r.g)} (Room ${r.n}) &middot; Due: ${peso(bal)}</option>`;
            }).join('')}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label>Transaction Type *</label>
            <select id="posTxType">
              <option value="Payment">Payment (Folio settlement)</option>
              <option value="Deposit">Deposit (Booking confirmation)</option>
              <option value="Refund">Refund</option>
            </select>
          </div>
          <div class="field">
            <label>Payment Method *</label>
            <select id="posMethod">
              <option value="Credit Card">Credit Card</option>
              <option value="Cash">Cash at Front Desk</option>
              <option value="GCash">GCash</option>
              <option value="Maya">Maya</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label>Payment Amount (₱) *</label>
          <input type="number" id="posAmount" min="1" required placeholder="Amount received">
        </div>

        <div class="field">
          <label>Reference Note / Auth Code</label>
          <input type="text" id="posRefNote" placeholder="e.g. Card ending 4821, Terminal #3">
        </div>

        <div class="text-xs text-muted" style="margin-top: 4px;">
          Simulated transaction (no actual bank charges). Generates official BIR-compliant receipt.
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" id="btnSubmitPosPayment">Process Settlement</button>
      </div>
    `;

    showModal('Front Desk Payment Terminal', bodyHtml, footerHtml, { maxWidth: '520px' });

    // Set initial amount to balance of selected reservation
    const updateDefaultAmt = () => {
      const code = $('posResCode').value;
      const res = Data.findRes(code);
      if (res) {
        $('posAmount').value = Math.max(0, Data.balOf(res));
      }
    };
    $('posResCode').onchange = updateDefaultAmt;
    updateDefaultAmt();

    $('btnSubmitPosPayment').onclick = () => {
      const code = $('posResCode').value;
      const type = $('posTxType').value;
      const method = $('posMethod').value;
      const amt = parseFloat($('posAmount').value);
      const refNote = ($('posRefNote').value || '').trim();

      if (isNaN(amt) || amt <= 0) {
        toast('Enter a valid payment amount', 'warn');
        return;
      }

      const orNo = Data.addPayment(code, amt, method, type, refNote || 'Front Desk POS Terminal');
      toast(`Settlement recorded! Receipt issued: ${orNo}`, 'ok');
      closeModal();
      renderApp();
    };
  }

  // Auto-refresh when Data dispatches change
  window.addEventListener('pupsj:data-change', () => {
    renderApp();
  });

  // Safe single initialization
  let initialized = false;
  function safeInit() {
    if (initialized) return;
    initialized = true;
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
  } else {
    safeInit();
  }
})();