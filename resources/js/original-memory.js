// The original UI keeps its synchronous view models, but records and permissions
// are hydrated from Laravel. No browser database or client-side login is trusted.
const Original = JSON.parse(document.getElementById('original-bootstrap').textContent);
let originalData = Original.data;
const originalCopy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const originalBase = document.querySelector('meta[name="hrms-base"]').content.replace(/\/$/,'');
const originalCSRF = document.querySelector('meta[name="csrf-token"]').content;
function originalRequest(path,method='GET',body=null){
 const xhr=new XMLHttpRequest();xhr.open(method,originalBase+path,false);xhr.setRequestHeader('Accept','application/json');xhr.setRequestHeader('X-CSRF-TOKEN',document.querySelector('meta[name="csrf-token"]').content);
 if(body!==null){xhr.setRequestHeader('Content-Type','application/json');xhr.send(JSON.stringify(body));}else xhr.send();
 let result;try{result=JSON.parse(xhr.responseText);}catch{throw Error('The server could not complete this action.');}
 if(xhr.status<200||xhr.status>=300)throw Error(result.errors?Object.values(result.errors).flat().join(' '):(result.message||'Action not permitted.'));
 return result;
}
function originalReload(){const next=originalRequest('/api/original/snapshot');originalData=next.data;Original.user=next.user;Original.serverRole=next.serverRole;}
store.get=(key,fallback)=>originalCopy(Object.hasOwn(originalData,key)?originalData[key]:fallback);
store.set=(key,value)=>{
 if(key==='config_overrides'){originalRequest('/api/original/config','POST',{config:value});originalData[key]=originalCopy(value);return;}
 const transient=['seq','sequences','notifSeenIds','guestNotifSeenIds','notifications','configOverrides','nightAuditHistory'];
 if(transient.includes(key)||key.startsWith('_ui')||key.startsWith('seq')){originalData[key]=originalCopy(value);return;}
 throw Error('Use the saved server action for this change; browser-only records are disabled.');
};
store.remove=key=>{if(key.startsWith('session')||key.startsWith('_ui'))delete originalData[key];};
CONFIG.demoLogins=false;
CONFIG.policies=CONFIG.policies.filter(([name])=>!['Guarantee Deposit','Payment Settlement','Prices & Levies'].includes(name));
CONFIG.policies.push(['Special Requests','Subject to availability and confirmation'],['Payments','Optional deposit; cash or PayMongo test QR Ph / debit / credit card']);
CONFIG.depositPct=Number(originalData.policy.deposit_percent);
CONFIG.hotelName='PUPSJ Hotel & Restaurant';

const amenityPhotos=originalData.amenityPhotos||{};
CONFIG.amenities=CONFIG.amenities.map(a=>({...a,photo:amenityPhotos[/pool/i.test(a.name)?'pool':/restaurant|dining/i.test(a.name)?'dining':/spa|wellness/i.test(a.name)?'spa':/fitness|gym/i.test(a.name)?'gym':/lounge/i.test(a.name)?'club':'']||null}));
