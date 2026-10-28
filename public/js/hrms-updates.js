// Recommendation screens use the same server API and authorization as the rest of the application.
const field=HRMS.field.bind(HRMS),select=HRMS.select.bind(HRMS);
let policyRecord=null;
async function refresh(){
 me=me||await HRMS.api('/api/me');
 if(module==='dashboard'&&me.role==='housekeeping'){
  const rooms=await HRMS.api('/api/directory/rooms');app.innerHTML='<h1>Housekeeping</h1><div class="card"><p>'+rooms.filter(x=>['Dirty','Cleaning'].includes(x.housekeeping_status)).length+' rooms need cleaning or inspection.</p><a class="btn" href="'+HRMS.base+'/staff/housekeeping">Open Housekeeping</a><a class="btn-secondary" href="'+HRMS.base+'/staff/requests">Guest Requests</a></div>';return;
 }
 if(module==='dashboard'&&me.role==='restaurant'){
  const orders=await HRMS.api('/api/orders');app.innerHTML='<h1>Restaurant Workspace</h1><div class="card"><p>'+orders.filter(x=>x.status==='Open').length+' unpaid orders.</p><a class="btn" href="'+HRMS.base+'/staff/orders">Open Orders</a><a class="btn-secondary" href="'+HRMS.base+'/staff/tables">Dining Tables</a><a class="btn-secondary" href="'+HRMS.base+'/staff/requests">Guest Requests</a></div>';return;
 }
 if(module==='tables'){
  records=await HRMS.api('/api/directory/tables');app.innerHTML='<h1>Dining Tables</h1>'+(me.role==='admin'?btn('Add Table','table',''):'')+HRMS.table(['Table','Seats','Status',''],records.map(t=>[esc(t.label),esc(t.capacity),esc(t.status),me.role==='admin'&&t.status!=='Occupied'?btn('Edit','table',t.id):'']));return;
 }
 if(module==='policy'){
  policyRecord=await HRMS.api('/api/policy');const p=policyRecord;
  const keys=[['breakfast_buffet_rate','Buffet breakfast / guest / night'],['breakfast_plated_rate','Plated breakfast / guest / night'],['deposit_percent','Optional deposit %'],['advance_discount_percent','Advance-payment discount %'],['senior_discount_percent','Approved senior training discount %'],['pwd_discount_percent','Approved PWD training discount %'],['local_tax_percent','Configured local tax %'],['parking_spaces','Parking spaces']];
  app.innerHTML='<h1>Rates and Policies</h1><p>Configure approved training values before accepting bookings. Discount and tax values are not a claim of legal compliance.</p><form id="policyForm" class="card hrms-form">'+keys.map(([k,l])=>field(k,l,p[k],'number','required min="0" step="0.01"')).join('')+select('outside_food_allowed','Outside food',[[false,'Not permitted'],[true,'Allowed under policy']],p.outside_food_allowed)+field('confirmation_reminders','Confirmation notes and reminders',p.confirmation_reminders)+`<button class="btn">Save Policy</button></form><div class="card"><h2>Promotions</h2>${btn('Add Promo','promo','')}${HRMS.table(['Label','Code','Discount','Visibility','Dates',''],p.promos.map((x,i)=>[esc(x.label),esc(x.code),esc(x.percent)+'%',x.public?'Public':'Code only',esc(x.start)+' to '+esc(x.end),btn('Remove','remove-promo',i)]))}</div>`;return;
 }
 if(module==='requests'){
  records=await HRMS.api('/api/requests');app.innerHTML='<h1>Guest Requests</h1><p>Hotel Staff may refer restaurant inquiries by asking the guest to choose Restaurant, or coordinate directly with Restaurant Staff.</p>'+HRMS.table(['Department','Request','Status','Resolution',''],records.map(r=>[esc(r.department),esc(r.message),esc(r.status),esc(r.resolution),btn('Update','request',r.id)]));return;
 }
 if(module==='night-audit'){
  const dates=await HRMS.api('/api/business-dates');const depts=me.role==='admin'?['Hotel','Restaurant']:[me.role==='restaurant'?'Restaurant':'Hotel'];
  app.innerHTML='<h1>Night Audit</h1><p>Review the department report, resolve pending payments and unpaid restaurant orders, then reconcile counted cash. Room charges are receivables, not cash collections.</p>'+depts.map(dept=>`<div class="card"><h2>${dept}</h2><p>Open business date: ${esc(dates[dept])}</p><a class="btn-secondary" href="${HRMS.base}/staff/reports">Review Report</a>${btn('Reconcile and Close','close-day',dept)}</div>`).join('');return;
 }
 if(module==='reports'&&me.role==='restaurant'){
  const d=await HRMS.api('/api/reports?date='+viewDate);app.innerHTML='<h1>Restaurant Report</h1><label>Date<input id="reportDate" type="date" value="'+viewDate+'"></label>'+HRMS.table(['Item','Amount'],[['Direct collections',money(d.collections)],['Room-charge receivables',money(d.room_charges)]])+HRMS.table(['Order','Amount','Status'],d.orders.map(o=>[esc(o.code),money(o.amount),esc(o.status)]));return;
 }
 await legacyRefresh();
 if(module==='payments')app.insertAdjacentHTML('afterbegin',`<div class="actions">${btn('Multiple-room Payment','batch','')}${btn('Transfer Deposit / Credit','transfer','')}</div>`);
 if(['payments','orders'].includes(module)){const cs=await HRMS.api('/api/paymongo/checkouts');app.insertAdjacentHTML('beforeend','<div class="card"><h2>PayMongo Test Checkouts</h2>'+HRMS.table(['Reference','Status','Amount','Actions'],cs.map(c=>[esc(c.reference),esc(c.status),money(c.amount_centavos/100),(c.status==='Pending'&&c.checkout_url?'<a class="btn-secondary" href="'+esc(c.checkout_url)+'">Resume Checkout</a>':'')+btn('Reconcile','reconcile',c.reference)]))+'</div>');}
}
function bookingFields(){return select('breakfast','Breakfast',[['None','None'],['Buffet','Buffet'],['Plated','Plated']])+field('breakfast_pax','Breakfast guests / night',0,'number','min="0" required')+field('promo_code','Promo code')+select('discount_category','Verified discount',[['None','None'],['Senior','Senior'],['PWD','PWD']])+field('discount_verification','Eligibility review note (no ID number)')+field('company_name','Company name (optional)')+field('requests','Special requests')+'<p>Special requests are subject to availability and confirmation.</p>';}
async function checkoutPayment(allocations,method,reference){
 if(method==='Cash')return HRMS.api('/api/payments/batch','POST',{allocations,reference,posting_location:'Hotel Front Desk'});
 const d=await HRMS.api('/api/paymongo/checkout','POST',{allocations,reference,method});
 if(d.checkout_url)location.href=d.checkout_url;
 return d;
}
async function action(a,id){
 if(a==='reconcile'){await HRMS.api('/api/paymongo/checkouts/'+encodeURIComponent(id)+'/reconcile','POST',{});await refresh();return;}
 if(a==='table'){const r=records.find(x=>x.id===Number(id))||{};HRMS.editor(id?'Edit Table':'Add Table',field('label','Table label',r.label,'text','required')+field('capacity','Seats',r.capacity||4,'number','min="1" max="50" required')+select('status','Status',[['Available','Available'],['Blocked','Blocked']],r.status||'Available'),async d=>{await HRMS.api('/api/directory/tables'+(id?'/'+id:''),id?'PUT':'POST',d);await refresh();});return;}
 if(a==='order'){
  const tables=await HRMS.api('/api/directory/tables');const stays=await HRMS.api('/api/reservations');const menu=catalog.menu;HRMS.editor('New Restaurant Order',select('channel','Service channel',[['Dine-in','Dine-in'],['Room service','Room service']])+select('dining_table_id','Dine-in table',[['','No table selected'],...tables.filter(x=>x.status==='Available').map(x=>[x.id,x.label+' - '+x.capacity+' seats'])])+select('delivery_reservation_id','Room-service destination',[['','Select active guest stay'],...stays.filter(x=>x.status==='Checked-in').map(x=>[x.id,x.code+' - '+x.guest.name])])+select('discount_category','Verified discount',[['None','None'],['Senior','Senior'],['PWD','PWD']])+field('discount_verification','Eligibility review note (no ID number)')+menu.map(x=>field('quantity_'+x.id,x.name+' - '+money(x.price),0,'number','min="0" max="100"')).join(''),async d=>{const items=menu.filter(x=>Number(d['quantity_'+x.id])>0).map(x=>({menu_item_id:x.id,quantity:Number(d['quantity_'+x.id])}));if(d.channel==='Room service')delete d.dining_table_id;else delete d.delivery_reservation_id;await HRMS.api('/api/orders','POST',{...d,items});await refresh();});return;
 }
 if(a==='book'){
  catalog=await HRMS.api('/api/catalog');guests=await HRMS.api('/api/directory/guests');if(!guests.length)throw Error('Add a guest with an email address first.');
  HRMS.editor('New Reservation',select('guest_id','Booking contact',guests.map(g=>[g.id,g.name]))+select('payer_guest_id','Payer',guests.map(g=>[g.id,g.name]))+select('room_type_id','Room type',catalog.types.map(t=>[t.id,t.name]))+select('source','Booking channel',[['Walk-in','Walk-in'],['Telephone','Telephone'],['Online','Online staff-assisted']])+field('arrival','Arrival',HRMS.date(),'date','required')+field('departure','Departure','','date','required')+field('adults','Adults',1,'number','min="1" required')+field('children','Children',0,'number','min="0" required')+bookingFields(),async d=>{await HRMS.api('/api/reservations','POST',d);await refresh();});return;
 }
 if(a==='assign'||a==='checkin'){
  const r=records.find(x=>x.id===Number(id));catalog=await HRMS.api('/api/catalog');const rooms=catalog.rooms.filter(x=>x.room_type_id===r.room_type_id&&!x.out_of_service&&['Clean','Inspected'].includes(x.housekeeping_status));if(!rooms.length)throw Error('No ready rooms of this type. Complete cleaning and inspection first.');
  HRMS.editor(a==='checkin'?'Assign Room and Check In':'Assign Room',select('room_id','Room',rooms.map(x=>[x.id,x.number+' - '+x.housekeeping_status]),r.room_id),async d=>{await HRMS.api('/api/reservations/'+id+'/room','PUT',d);if(a==='checkin')await HRMS.api('/api/reservations/'+id+'/check-in','POST',{});await refresh();});return;
 }
 if(a==='letter'){
  const letters=await HRMS.api('/api/reservations/'+id+'/letters');HRMS.editor('Confirmation Letter',letters.map(x=>`<p>${esc(x.email)} - ${esc(x.status)}</p><pre style="white-space:pre-wrap">${esc(x.body)}</pre>`).join('')||'<p>No confirmation letter exists for this legacy booking.</p>',async()=>{});return;
 }
 if(a==='payment'){
  const f=await HRMS.api('/api/reservations/'+id+'/folio');const reference=crypto.randomUUID();HRMS.editor('Receive Payment',`<p>Balance ${money(f.balance)}. Optional booking deposit ${money(f.reservation.pricing?.deposit_due||0)}.</p>`+field('amount','Amount',Math.max(0,f.balance),'number','min="0.01" step="0.01" required')+select('method','Method',[['Cash','Cash'],['qrph','QR Ph - PayMongo test'],['card','Debit / Credit - PayMongo test']]),async d=>{await checkoutPayment([{reservation_id:Number(id),amount:d.amount}],d.method,reference);await refresh();});return;
 }
 if(a==='batch'){
  const rs=(await HRMS.api('/api/reservations')).filter(x=>['Confirmed','Checked-in'].includes(x.status));const reference=crypto.randomUUID();HRMS.editor('One Payer - Multiple Rooms','<p>Enter amounts for bookings with the same payer. Leave others at zero.</p>'+rs.map(r=>field('amount_'+r.id,r.code+' - '+r.guest.name,0,'number','min="0" step="0.01"')).join('')+select('method','Method',[['Cash','Cash'],['qrph','QR Ph - PayMongo test'],['card','Debit / Credit - PayMongo test']]),async d=>{const allocations=rs.filter(r=>Number(d['amount_'+r.id])>0).map(r=>({reservation_id:r.id,amount:d['amount_'+r.id]}));if(!allocations.length)throw Error('Enter at least one payment amount.');await checkoutPayment(allocations,d.method,reference);await refresh();});return;
 }
 if(a==='transfer'){
  const rs=await HRMS.api('/api/reservations');const opts=rs.map(r=>[r.id,r.code+' - '+r.guest.name]);const reference=crypto.randomUUID();HRMS.editor('Transfer Deposit or Credit','<p>Eligible folios must share a payer. Transfers move recorded funds and do not count as new cash.</p>'+select('from','From folio',opts)+select('to','To folio',opts)+field('amount','Amount','','number','required min="0.01" step="0.01"')+field('reason','Reason','','text','required'),async d=>{await HRMS.api('/api/payments/transfer','POST',{...d,reference});await refresh();});return;
 }
 if(a==='settle'){
  const order=records.find(x=>x.id===Number(id));const stays=(await HRMS.api('/api/reservations')).filter(x=>x.status==='Checked-in');const reference=crypto.randomUUID();HRMS.editor('Settle '+order.code,'<p>'+money(order.amount)+'</p>'+select('settlement','Method',[['Cash','Cash'],['Room','Charge to Room'],['qrph','QR Ph - test'],['card','Debit / Credit - test']])+field('cash_received','Cash received',order.amount,'number','min="0" step="0.01"')+select('reservation_id','Active guest folio',[['','Select for room charging'],...stays.map(x=>[x.id,x.code+' - '+x.guest.name])]),async d=>{if(['qrph','card'].includes(d.settlement)){const c=await HRMS.api('/api/orders/'+id+'/checkout','POST',{reference,method:d.settlement});if(c.checkout_url)location.href=c.checkout_url;}else{if(d.settlement==='Cash')delete d.reservation_id;else delete d.cash_received;await HRMS.api('/api/orders/'+id+'/settle','POST',{...d,idempotency_key:reference});await refresh();}});return;
 }
 if(a==='edit-order'){
  const order=records.find(x=>x.id===Number(id));const menu=(await HRMS.api('/api/catalog')).menu;HRMS.editor('Edit Unpaid Order',menu.map(x=>field('quantity_'+x.id,x.name+' - '+money(x.price),order.items.find(i=>i.menu_item_id===x.id)?.quantity||0,'number','min="0" max="100"')).join('')+field('reason','Reason for change','','text','required'),async d=>{const items=menu.filter(x=>Number(d['quantity_'+x.id])>0).map(x=>({menu_item_id:x.id,quantity:Number(d['quantity_'+x.id])}));await HRMS.api('/api/orders/'+id,'PUT',{items,reason:d.reason});await refresh();});return;
 }
 if(a==='void-order'){HRMS.editor('Void Unpaid Order',field('reason','Reason','','text','required'),async d=>{await HRMS.api('/api/orders/'+id+'/void','POST',d);await refresh();});return;}
 if(a==='delivery'){const r=records.find(x=>x.id===Number(id));HRMS.editor('Room-Service Delivery',select('service_status','Status',['Recorded','Out for delivery','Delivered'].map(x=>[x,x]),r.service_status)+field('delivery_notes','Destination verification / delivery notes',r.delivery_notes),async d=>{await HRMS.api('/api/orders/'+id+'/delivery','PUT',d);await refresh();});return;}
 if(a==='request'){HRMS.editor('Update Request',select('status','Status',['In progress','Resolved','Closed'].map(x=>[x,x]))+field('resolution','Action or resolution','','text','required'),async d=>{await HRMS.api('/api/requests/'+id,'PUT',d);await refresh();});return;}
 if(a==='close-day'){const dates=await HRMS.api('/api/business-dates');HRMS.editor('Close '+id+' Business Date',field('date','Business date',dates[id],'date','required')+field('counted_cash','Counted cash',0,'number','required min="0" step="0.01"')+field('notes','Reconciliation notes'),async d=>{await HRMS.api('/api/closing','POST',{...d,department:id});await refresh();});return;}
 if(a==='promo'){HRMS.editor('Add Promotion',field('label','Offer label','','text','required')+field('code','Code','','text','required')+field('percent','Accommodation discount %',0,'number','min="0" max="100" required')+field('start','Start',HRMS.date(),'date','required')+field('end','End',HRMS.date(),'date','required')+select('public','Visibility',[[true,'Public offer'],[false,'Private code']]),async d=>{d.public=d.public==='true';await HRMS.api('/api/policy','POST',{...policyRecord,promos:[...policyRecord.promos,d]});await refresh();});return;}
 if(a==='remove-promo'){await HRMS.api('/api/policy','POST',{...policyRecord,promos:policyRecord.promos.filter((_,i)=>i!==Number(id))});await refresh();return;}
 return legacyAction(a,id);
}
app.addEventListener('submit',async ev=>{if(ev.target.id==='policyForm'){ev.preventDefault();try{const d=Object.fromEntries(new FormData(ev.target));d.outside_food_allowed=d.outside_food_allowed==='true';await HRMS.api('/api/policy','POST',{...d,promos:policyRecord.promos});HRMS.notify('Policy saved.');await refresh();}catch(e){HRMS.error(e);}}});
refresh().catch(HRMS.error);
