/* ==========================================================================
   PUPSJ Hotel & Restaurant — Staff Messages Inbox (messages.js)
   Two-pane message threads, live staff replies to guest portal & concierge,
   resolution toggling, deep linking (?id=), and responsive grid collapse.
   ========================================================================== */
'use strict';

(function () {
  let selectedThreadId = null;
  let statusFilter = 'Open'; // 'Open' | 'Resolved' | 'All'
  let searchQuery = '';
  let initialized = false;

  function init() {
    if (initialized) return;
    const app = $('messagesApp');
    if (!app) return;
    initialized = true;

    // Check ?id= deep link
    const params = new URLSearchParams(window.location.search);
    const deepId = params.get('id') || params.get('thread');
    if (deepId) {
      selectedThreadId = deepId;
      statusFilter = 'All';
    }
    const paramNew = params.get('new');
    const paramGuest = params.get('guest');
    if (paramNew) {
      setTimeout(() => openNewThreadModal(paramGuest), 150);
    }

    renderApp();
  }

  function getFilteredThreads() {
    const list = Data.getThreads();
    return list.filter(t => {
      const gName = t.guestName || t.guest || 'Guest';
      const st = t.status || 'Open';

      if (statusFilter === 'Open' && st !== 'Open') return false;
      if (statusFilter === 'Resolved' && st !== 'Resolved') return false;
      if (searchQuery) {
        const text = `${t.id} ${gName} ${t.subject || ''} ${(t.messages || []).map(m => m.text).join(' ')}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    }).sort((a, b) => {
      const timeA = a.updated || a.updatedAt || '';
      const timeB = b.updated || b.updatedAt || '';
      return timeB.localeCompare(timeA);
    });
  }

  function renderApp() {
    const app = $('messagesApp');
    if (!app) return;

    const threads = getFilteredThreads();
    const allThreads = Data.getThreads();
    const unreadCount = allThreads.filter(t => (t.unreadStaff || 0) > 0 && t.status === 'Open').length;

    if (!selectedThreadId || !allThreads.some(t => t.id === selectedThreadId)) {
      selectedThreadId = threads[0] ? threads[0].id : (allThreads[0] ? allThreads[0].id : null);
    }

    // Mark current thread read by staff
    if (selectedThreadId) {
      const cur = allThreads.find(t => t.id === selectedThreadId);
      if (cur && (cur.unreadStaff || 0) > 0) {
        cur.unreadStaff = 0;
        Data.saveThreads(allThreads);
      }
    }

    const currentThread = allThreads.find(t => t.id === selectedThreadId);

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">GUEST RELATIONS &amp; CONCIERGE</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Guest Communications Inbox</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-sm" id="btnNewStaffThread">
            <span class="ic" data-icon="plus">[ICON: plus]</span> New Conversation
          </button>
          <span class="pill ${unreadCount > 0 ? 'pill--bad' : 'pill--ok'}" style="font-size: 13px; padding: 6px 12px;">
            ${unreadCount > 0 ? `${unreadCount} Unread Message(s)` : 'All Messages Read'}
          </span>
        </div>
      </div>

      <!-- Split Communication Layout (Responsive collapse via grid-split-360) -->
      <div class="grid-split-360" style="align-items: stretch; min-height: 560px;">
        <!-- Left: Thread List -->
        <div class="card" style="padding: 0; display: flex; flex-direction: column; overflow: hidden;">
          <div style="padding: 12px 14px; border-bottom: 1px solid var(--line); background: var(--surface-2);">
            <input type="text" id="msgSearchInput" placeholder="Search conversations…" value="${esc(searchQuery)}" style="margin-bottom: 8px; height: 34px;">
            <div class="tabs" style="margin: 0;">
              <button type="button" class="tab-btn ${statusFilter === 'Open' ? 'active' : ''}" data-msg-status="Open" style="padding: 4px 10px; font-size: 12px;">Open</button>
              <button type="button" class="tab-btn ${statusFilter === 'Resolved' ? 'active' : ''}" data-msg-status="Resolved" style="padding: 4px 10px; font-size: 12px;">Resolved</button>
              <button type="button" class="tab-btn ${statusFilter === 'All' ? 'active' : ''}" data-msg-status="All" style="padding: 4px 10px; font-size: 12px;">All</button>
            </div>
          </div>

          <div style="flex: 1; overflow-y: auto; max-height: 520px;" id="msgThreadList">
            ${threads.map(t => {
              const isSel = t.id === selectedThreadId;
              const guestName = t.guestName || t.guest || 'Guest';
              const lastMsg = (t.messages && t.messages.length > 0) ? t.messages[t.messages.length - 1] : { text: '' };
              const hasUnread = (t.unreadStaff || 0) > 0 && t.status === 'Open';
              const updatedDate = (t.updated || t.updatedAt || today()).slice(0, 10);

              return `
                <div class="${isSel ? 'selected-thread' : ''}" style="padding: 12px 14px; border-bottom: 1px solid var(--line); cursor: pointer; background: ${isSel ? 'var(--gold-tint)' : 'var(--surface)'}; display: flex; flex-direction: column; gap: 4px;"
                     onclick="selectThread('${esc(t.id)}')">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: ${hasUnread ? '700' : '600'}; font-size: 13px;">${esc(guestName)}</div>
                    <span class="text-xs text-muted">${fmtDate(updatedDate)}</span>
                  </div>
                  <div style="font-size: 12px; font-weight: 500; color: var(--gold-ink);">${esc(t.subject || 'Guest Message')}</div>
                  <div style="font-size: 12px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${esc(lastMsg.text || '')}
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <span class="pill ${t.status === 'Open' ? 'pill--info' : 'pill--muted'}" style="font-size: 10px;">${esc(t.status || 'Open')}</span>
                    ${hasUnread ? `<span class="pill pill--bad" style="font-size: 10px;">${t.unreadStaff} New</span>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
            ${threads.length === 0 ? `<div class="text-center text-muted text-sm" style="padding: 40px 16px;">No conversations match this view.</div>` : ''}
          </div>
        </div>

        <!-- Right: Active Conversation -->
        <div class="card" style="padding: 0; display: flex; flex-direction: column; overflow: hidden;" id="msgConvPane">
          ${currentThread ? renderConversationPane(currentThread) : `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--ink-3); padding: 40px;">
              Select a message thread from the left to read and reply.
            </div>
          `}
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderConversationPane(t) {
    const isResolved = t.status === 'Resolved';
    const guestName = t.guestName || t.guest || 'Guest';
    const reservations = Data.getReservations();
    const linkedRes = t.resCode
      ? Data.findRes(t.resCode)
      : reservations.find(r => (r.g || '').toLowerCase() === guestName.toLowerCase() || (r.email && t.contact && r.email.toLowerCase() === t.contact.toLowerCase()));

    return `
      <!-- Conversation Header -->
      <div style="padding: 14px 18px; border-bottom: 1px solid var(--line); background: var(--surface-2); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <b style="font-size: 16px;">${esc(guestName)}</b>
            <span class="pill ${isResolved ? 'pill--muted' : 'pill--ok'}" style="font-size: 11px;">${esc(t.status || 'Open')}</span>
          </div>
          <div class="text-xs text-secondary" style="margin-top: 2px;">
            Subject: <b>${esc(t.subject || 'General Inquiry')}</b> &middot; Ref: <code>${esc(t.id)}</code>
            ${t.contact ? ` &middot; Contact: <b>${esc(t.contact)}</b>` : ''}
            ${linkedRes ? ` &middot; Linked Stay: <a href="reservations.html?code=${esc(linkedRes.c)}"><b>${esc(linkedRes.c)}</b> (Room ${linkedRes.n})</a>` : ''}
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn-secondary btn-sm" onclick="toggleThreadResolved('${esc(t.id)}')">
            ${isResolved ? 'Reopen Thread' : 'Mark Resolved'}
          </button>
        </div>
      </div>

      <!-- Messages Stream -->
      <div style="flex: 1; padding: 18px; overflow-y: auto; max-height: 420px; display: flex; flex-direction: column; gap: 12px; background: var(--bg);" id="msgBubbleList">
        ${(t.messages || []).map(m => {
          const isStaff = m.role === 'staff' || m.sender === 'Staff' || m.sender === 'Concierge' || m.sender === 'Front Desk';
          return `
            <div style="display: flex; flex-direction: column; align-items: ${isStaff ? 'flex-end' : 'flex-start'};">
              <div style="font-size: 11px; color: var(--ink-3); margin-bottom: 3px;">
                <b>${esc(m.sender || (isStaff ? 'Staff' : guestName))}</b> &middot; ${esc(m.time || 'Today')}
              </div>
              <div style="max-width: 75%; padding: 10px 14px; border-radius: var(--r); font-size: 13px; line-height: 1.4; background: ${isStaff ? 'var(--gold-tint)' : 'var(--surface)'}; color: var(--ink); border: 1px solid var(--line); border-left: ${isStaff ? '1px solid var(--line)' : '3px solid var(--gold)'};">
                ${esc(m.text || '')}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Reply Box -->
      <div style="padding: 14px 18px; border-top: 1px solid var(--line); background: var(--surface);">
        <div style="display: flex; gap: 10px; align-items: flex-end;">
          <div class="field" style="margin: 0; flex: 1;">
            <textarea id="staffReplyInput" rows="2" placeholder="Type official staff reply to ${esc(guestName)}…" style="font-size: 13px;"></textarea>
          </div>
          <button type="button" class="btn" id="btnSendStaffReply" style="height: 52px; padding: 0 20px;">
            Send Reply
          </button>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    const sInput = $('msgSearchInput');
    if (sInput) {
      sInput.oninput = (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderApp();
      };
    }

    document.querySelectorAll('[data-msg-status]').forEach(btn => {
      btn.onclick = () => {
        statusFilter = btn.dataset.msgStatus;
        renderApp();
      };
    });

    const btnReply = $('btnSendStaffReply');
    if (btnReply && selectedThreadId) {
      btnReply.onclick = () => {
        const text = ($('staffReplyInput').value || '').trim();
        if (!text) {
          toast('Please enter a reply message', 'warn');
          return;
        }

        Data.replyThread(selectedThreadId, 'Staff', text);
        Data.audit('Reply Message', 'thread', selectedThreadId, `Staff replied to ${selectedThreadId}`);
        toast('Reply sent to guest', 'ok');
        window.dispatchEvent(new CustomEvent('pupsj:data-change'));
        renderApp();

        // Scroll bubbles to bottom
        setTimeout(() => {
          const stream = $('msgBubbleList');
          if (stream) stream.scrollTop = stream.scrollHeight;
        }, 50);
      };
    }
  }


  window.openNewThreadModal = function (defaultGuest) {
    const guests = Data.getGuests();
    const bodyHtml = `
      <form id="newStaffThreadForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field" style="margin-bottom: 12px;">
          <label for="newThreadGuest">Guest Name / Recipient *</label>
          <input type="text" id="newThreadGuest" required placeholder="Enter guest name" value="${defaultGuest ? esc(defaultGuest) : ''}">
        </div>
        <div class="field" style="margin-bottom: 12px;">
          <label for="newThreadSubject">Subject / Topic *</label>
          <input type="text" id="newThreadSubject" required placeholder="e.g. Special Request Follow-up">
        </div>
        <div class="field" style="margin-bottom: 12px;">
          <label for="newThreadMessage">Initial Message *</label>
          <textarea id="newThreadMessage" rows="4" required placeholder="Type your message to the guest…"></textarea>
        </div>
      </form>
    `;
    const footerHtml = `
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn" id="btnSubmitNewThread">Send Message</button>
    `;

    showModal('Start New Conversation', bodyHtml, footerHtml, {
      onOpen: modalEl => {
        const btnSend = modalEl.querySelector('#btnSubmitNewThread');
        if (btnSend) {
          btnSend.onclick = () => {
            const guestName = modalEl.querySelector('#newThreadGuest').value.trim();
            const subject = modalEl.querySelector('#newThreadSubject').value.trim();
            const text = modalEl.querySelector('#newThreadMessage').value.trim();

            if (!guestName || !subject || !text) {
              toast('Please complete all message fields.', 'bad');
              return;
            }

            const threads = Data.getThreads();
            const newId = 'TH-' + (threads.length + 1);
            const newThread = {
              id: newId,
              guestName,
              subject,
              status: 'Open',
              unreadStaff: 0,
              unreadGuest: 1,
              updated: nowISO(),
              messages: [
                {
                  from: 'Staff',
                  sender: (Data.getStaffSession()?.name) || 'Concierge',
                  text,
                  time: nowISO()
                }
              ]
            };
            threads.unshift(newThread);
            Data.saveThreads(threads);
            Data.audit('Create Message Thread', 'Message', newId, `Staff-initiated conversation with ${guestName}`);
            closeModal();
            selectedThreadId = newId;
            toast('Message sent to guest.', 'ok');
            renderApp();
          };
        }
      }
    });
  };

  window.selectThread = function (id) {
    selectedThreadId = id;
    renderApp();
  };

  window.toggleThreadResolved = function (id) {
    const list = Data.getThreads();
    const item = list.find(t => t.id === id);
    if (!item) return;

    item.status = item.status === 'Open' ? 'Resolved' : 'Open';
    Data.saveThreads(list);
    Data.audit('Message Thread Status', 'thread', id, `Thread ${id} marked as ${item.status}`);
    toast(`Thread ${id} marked as ${item.status}`, 'ok');
    window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    renderApp();
  };

  // Safe single initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('pupsj:data-change', () => {
    if (initialized) renderApp();
  });
})();
