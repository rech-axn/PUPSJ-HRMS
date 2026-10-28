
const ref=new URLSearchParams(location.search).get('reference');let checks=0;
async function check(){try{const d=await HRMS.api('/api/paymongo/checkouts/'+encodeURIComponent(ref));document.getElementById('paymentStatus').textContent='Test checkout: '+d.status;if(d.status==='Pending'&&checks++<20)setTimeout(check,3000);}catch(e){HRMS.error(e);}}check();
