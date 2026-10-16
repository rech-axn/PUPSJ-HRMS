const originalRole=()=>Original.serverRole;
const originalStaff=()=>Original.user&&Original.serverRole!=='guest'?Original.user:null;
const originalGuest=()=>Original.serverRole==='guest'?Original.user:null;
Data.init=()=>{};Data.runExpiryJobs=()=>{};Data.resetDemo=Data.resetDemoData=()=>{throw Error('Reset requires a protected server training scenario.');};
Data.getStaffSession=originalStaff;Data.getGuestSession=originalGuest;
Data.setStaffSession=Data.setGuestSession=()=>{};
Data.clearStaffSession=Data.clearGuestSession=()=>{if(Original.user)originalRequest('/api/logout','POST',{});Original.user=null;Original.serverRole=null;};
Data.getStaff=()=>store.get('staff',[]);Data.getGuestAccounts=()=>store.get('guestAccounts',[]);
Data.getAdminAccounts=()=>[];Data.getPayments=()=>store.get('res',[]).flatMap(r=>(r.pay||[]).map(p=>({...p,resCode:r.c,amount:p.a,method:p.m,kind:p.k,createdAt:p.at,orNum:p.or})));
Data.getTypes=()=>store.get('types',[]);Data.getRooms=()=>store.get('rooms',[]);
Data.getReservations=()=>store.get('res',[]);Data.getOrders=()=>store.get('orders',[]);
Data.getBusinessDate=()=>originalData.businessDate||new Date().toLocaleDateString('en-CA');
Data.audit=()=>{};Data.emit=(entity,action,detail)=>window.dispatchEvent(new CustomEvent('pupsj:data-change',{detail:{entity,action,detail}}));
Data.nextId=prefix=>prefix+crypto.randomUUID().slice(0,12);Data.nextOR=()=>crypto.randomUUID();Data.nextSequence=prefix=>prefix+Date.now();
Data.getBookingHolds=()=>[];Data.getPaymentIntents=()=>[];
Data.tot=Data.roomChg=r=>Number(typeof r==='string'?Data.findRes(r)?.total:r?.total)||0;
Data.paidAmt=r=>Number(typeof r==='string'?Data.findRes(r)?.depositPaid:r?.depositPaid)||0;
Data.balOf=Data.bal=Data.balance=r=>Number(typeof r==='string'?Data.findRes(r)?.balanceDue:r?.balanceDue)||0;
Data.depAmt=r=>Number(r?.pricing?.deposit_due||0);
Data.freeRooms=(name,arrival,departure,exclude)=>{
 if(!arrival||!departure||departure<=arrival)return [];
 if(originalStaff())return Data.getRooms().filter(x=>x.t===name&&!x.out_of_service&&!Data.getReservations().some(r=>r.c!==exclude&&r.n===x.n&&!['Cancelled','Checked-out'].includes(r.st)&&r.i<departure&&r.o>arrival)).map(x=>x.n);
 const available=originalRequest('/api/availability?'+new URLSearchParams({arrival,departure,adults:1,children:0}));const type=available.find(x=>x.name===name);return type?Array.from({length:Math.max(1,Number(Data.getTypes().find(x=>x.n===name)?.c||1))},(_,i)=>i+1):[];
};
function originalChanged(kind,list){
 const key={'room-types':'types',rooms:'rooms',guests:'guestAccounts',employees:'staff',menu:'menu',tables:'tables'}[kind];
 const before=originalData[key]||[];const idof=x=>x.id??x.n;
 for(const item of list){const old=before.find(x=>String(idof(x))===String(idof(item)));if(old&&JSON.stringify(old)===JSON.stringify(item))continue;let data;
  if(kind==='room-types')data={name:item.n,rate:item.r,capacity:item.g,description:item.desc||'',photo:item.photo||null,bed_size:item.bed_size||null,extra_capacity:Number(item.extra_capacity||0),extra_person_rate:Number(item.extra_person_rate||0),accessible_room:!!item.accessible_room,accessible_bathroom:!!item.accessible_bathroom};
  if(kind==='rooms'){const type=Data.getTypes().find(x=>x.n===item.t);if(!type)throw Error('Select an existing room type.');data={number:String(item.n),room_type_id:type.id,housekeeping_status:originalData.hk[item.n]?.s||'Clean',out_of_service:!!item.out_of_service||item.status==='Maintenance'};}
  if(kind==='guests')data={name:item.name,email:item.email,phone:item.phone||null,address:item.address||'',birth_date:item.birthDate||null};
  if(kind==='menu')data={name:item.name,category:item.category||'Main Course',price:item.price,available:!!item.available};
  if(kind==='tables')data={label:item.label||item.name||'Table '+item.num,capacity:item.seats||item.capacity||4,status:['Free','Available','Clean','Needs cleaning'].includes(item.status||item.st)?'Available':'Blocked'};
  if(kind==='employees'){const role=/restaurant/i.test(item.role)?'restaurant':(/housekeeping/i.test(item.role)?'housekeeping':(/management|admin/i.test(item.role)?'admin':'frontdesk'));data={name:item.name,email:item.email,phone:item.phone||null,role,active:item.active!==false};if(item.password)data.password=item.password;}
  originalRequest('/api/directory/'+kind+(old?'/'+old.id:''),old?'PUT':'POST',data);
 }
 for(const old of before)if(!list.some(x=>String(idof(x))===String(idof(old))))originalRequest('/api/original/directory/'+kind+'/'+old.id,'DELETE');
 originalReload();Data.emit(kind,'update');
}
Data.saveTypes=Data.saveRoomTypes=list=>originalChanged('room-types',list);
Data.saveRooms=list=>originalChanged('rooms',list);Data.saveMenu=list=>originalChanged('menu',list);
Data.saveStaff=list=>originalChanged('employees',list);Data.saveTables=list=>originalChanged('tables',list);
Data.saveGuestAccounts=list=>originalChanged('guests',list);
Data.createGuestProfile=data=>{const record=originalRequest('/api/directory/guests','POST',{name:data.name,email:data.email,phone:data.phone||null,address:data.address||''});originalReload();Data.emit('guests','create');return {success:true,ok:true,data:record};};
Data.saveGuest=Data.createGuestProfile;
Data.updateGuestProfile=(name,updates)=>{if(originalRole()==='guest'){originalRequest('/api/profile','PUT',{name:updates.name||Original.user.name,email:updates.email||Original.user.email,phone:updates.phone||Data.getGuestAccounts()[0]?.phone});originalReload();return {success:true};}const row=Data.getGuestAccounts().find(x=>x.name===name);if(!row)throw Error('Guest not found.');originalChanged('guests',Data.getGuestAccounts().map(x=>x.id===row.id?{...x,...updates}:x));return {success:true};};
Data.saveHk=Data.saveHK=list=>{const before=originalData.hk||{};const updates=Array.isArray(list)?Object.fromEntries(list.map(x=>[x.room||x.n,x])):list;for(const [number,record]of Object.entries(updates)){if(JSON.stringify(before[number])===JSON.stringify(record))continue;const room=Data.getRooms().find(x=>String(x.n)===String(number));if(room){if(before[number]?.s!==record.s)originalRequest('/api/rooms/'+room.id+'/housekeeping','PUT',{housekeeping_status:record.s||record.status||'Dirty'});originalRequest('/api/original/auxiliary','POST',{entity:'hkMetadata',record:{id:String(number),a:Number(record.a||0),p:record.p||'',assignedName:record.assignedName||''}});}}originalReload();Data.emit('housekeeping','update');};
Data.setRoomHK=(number,update)=>Data.saveHk({...originalData.hk,[number]:{...originalData.hk[number],...update}});
Data.checkIn=(code,number)=>{const r=Data.findRes(code);if(!r)throw Error('Reservation not found.');if(!number&&!r.n){originalAssignModal(code);return {success:false,ok:false,error:'Select a room to complete check-in.'};}const room=Data.getRooms().find(x=>String(x.n)===String(number||r.n));originalRequest('/api/reservations/'+r.id+'/room','PUT',{room_id:room?.id});originalRequest('/api/reservations/'+r.id+'/check-in','POST',{});originalReload();Data.emit('res','check-in');return {success:true,ok:true,data:Data.findRes(code)};};
Data.checkOut=code=>{const r=Data.findRes(code);originalRequest('/api/reservations/'+r.id+'/check-out','POST',{});originalReload();Data.emit('res','check-out');return {success:true,ok:true};};
Data.cancelReservation=code=>{const r=Data.findRes(code);originalRequest('/api/reservations/'+r.id+'/cancel','POST',{});originalReload();Data.emit('res','cancel');return {success:true,ok:true};};
Data.addPayment=(code,amount,method,kind='Payment',note='')=>{const r=typeof code==='object'?code:Data.findRes(code);if(kind==='Refund'){const p=originalRequest('/api/reservations/'+r.id+'/refunds','POST',{amount,reason:note||'Guest credit refund',idempotency_key:crypto.randomUUID()});originalReload();return p.receipt;}if(method!=='Cash')throw Error('Use PayMongo test checkout for QR Ph or cards.');const p=originalRequest('/api/payments/batch','POST',{reference:crypto.randomUUID(),posting_location:'Hotel Front Desk',allocations:[{reservation_id:r.id,amount}]});originalReload();Data.emit('payments','record');return p.reference;};
Data.addCharge=Data.addFolioCharge=(code,description,amount)=>{const r=typeof code==='object'?code:Data.findRes(code);originalRequest('/api/reservations/'+r.id+'/charges','POST',{description,amount});originalReload();Data.emit('res','charge');};
Data.saveReservations=Data.saveRes=list=>{for(const row of list){const old=Data.findRes(row.c);if(!old)throw Error('Create reservations using the booking form.');if(row.i!==old.i||row.o!==old.o)originalRequest('/api/reservations/'+old.id+'/dates','PUT',{arrival:row.i,departure:row.o});else if(row.st!==old.st){if(row.st==='Cancelled')Data.cancelReservation(row.c);else if(row.st==='Checked-in')Data.checkIn(row.c,row.n);else if(row.st==='Checked-out')Data.checkOut(row.c);else throw Error('Use the reservation workflow for this status.');}}originalReload();Data.emit('res','update');};
Data.updateReservation=(code,updates)=>Data.saveReservations(Data.getReservations().map(x=>x.c===code?{...x,...updates}:x));
Data.createOrder=input=>{const r=Data.findRes(input.resCode||input.linkedRes);const lines=input.lines||[];const payload={channel:input.type==='In-room'?'Room service':'Dine-in',items:lines.map(x=>({menu_item_id:x.menuId||x.id,quantity:x.qty}))};if(input.type==='In-room')payload.delivery_reservation_id=r?.id;else if(input.table)payload.dining_table_id=Number(input.table);const o=originalRequest('/api/orders','POST',payload);originalReload();Data.emit('orders','create');return Data.getOrders().find(x=>x.id===o.id);};
Data.cancelOrder=(code,reason)=>{const o=Data.getOrders().find(x=>x.code===code);originalRequest('/api/orders/'+o.id+'/void','POST',{reason:reason||'Guest cancellation'});originalReload();Data.emit('orders','void');return {success:true};};
Data.addItemsToOrder=(code,lines)=>{const o=Data.getOrders().find(x=>x.code===code);const items=[...o.lines,...lines].map(x=>({menu_item_id:x.menuId||x.id,quantity:x.qty}));originalRequest('/api/orders/'+o.id,'PUT',{items,reason:'Staff updated unpaid order'});originalReload();Data.emit('orders','update');};
Data.billOrder=(code,method,meta={})=>{if(typeof method==='object'){meta=method;method=meta.method;}const o=Data.getOrders().find(x=>x.code===code);if(method!=='Cash')throw Error('Use the payment checkout to settle this method.');originalRequest('/api/orders/'+o.id+'/settle','POST',{settlement:'Cash',cash_received:Number(meta.amount||o.subtotal),idempotency_key:crypto.randomUUID()});originalReload();return {success:true,orNum:'Recorded - '+code};};
Data.saveOrders=()=>{throw Error('Posted orders cannot be rewritten. Use order actions.');};
Data.updateOrderStatus=(code,status)=>{const o=Data.getOrders().find(x=>x.code===code);const service_status=/deliver|served|complete/i.test(status)?'Delivered':(/out|ready/i.test(status)?'Out for delivery':'Recorded');originalRequest('/api/orders/'+o.id+'/delivery','PUT',{service_status});originalReload();Data.emit('orders','update');};
function originalAux(entity,list){for(const row of list){const old=(originalData[entity]||[]).find(x=>x.id===row.id);if(!old||JSON.stringify(old)!==JSON.stringify(row))originalRequest('/api/original/auxiliary','POST',{entity,record:{...row,id:String(row.id)}});}originalReload();Data.emit(entity,'update');}
for(const [method,entity]of Object.entries({saveThreads:'threads',saveInquiries:'inquiries',saveMaintenance:'maintenance',saveFeedback:'feedback',saveHkRequests:'hkRequests',saveTableRes:'tableRes'}))Data[method]=list=>originalAux(entity,list);
Data.setBusinessDate=()=>{throw Error('Use Reconcile and Close to advance the business date.');};Data.resetBusinessDate=()=>{throw Error('Closed business dates cannot be reset.');};
AuthService.login=(email,password)=>{try{const user=originalRequest('/api/login','POST',{email,password});originalReload();return {ok:true,session:Original.user,isStaff:user.role!=='guest'};}catch(e){return {ok:false,error:e.message};}};
AuthService.logout=()=>{originalRequest('/api/logout','POST',{});location.href=originalBase+'/login';};
AuthService.checkIdleTimeout=()=>false;AuthService.touchActivity=()=>{};
ReservationService.runExpiryJobs=()=>{};HoldService.expire=()=>{};
window.addEventListener('error',event=>{if(event.error&&typeof toast==='function')toast(event.error.message,'bad');});

Data.savePromos=list=>{const p=originalRequest('/api/policy');const promos=list.filter(x=>x.active!==false).map(x=>({code:x.code,label:x.label||x.name||x.code,percent:Number(x.percent??x.value??x.discount??0),start:x.start||x.startDate||today(),end:x.end||x.endDate||addDays(today(),365),public:x.public!==false}));originalRequest('/api/policy','POST',{...p,promos});originalReload();Data.emit('promos','update');};
