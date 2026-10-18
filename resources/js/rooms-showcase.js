import './hrms-api.js';
import './booking-shell.js';
import {createRoomGallery} from './room-gallery.js';
const bootstrap=JSON.parse(document.getElementById('original-bootstrap').textContent);
const types=bootstrap.data.types;
const {roomCarousel}=createRoomGallery(types,HRMS.esc);
for(const type of types){const host=document.querySelector(`[data-showcase-gallery="${type.id}"]`);if(host)host.innerHTML=roomCarousel(type);}
document.querySelectorAll('[data-showcase-details]').forEach(button=>button.addEventListener('click',()=>{const details=document.getElementById(button.dataset.showcaseDetails);details.hidden=!details.hidden;button.setAttribute('aria-expanded',String(!details.hidden));button.textContent=details.hidden?'View More':'View Less';}));
// Keep a search made on another page, but collect all dates and party details in booking.
const context=new URLSearchParams(location.search);
document.querySelectorAll('[data-showcase-book]').forEach(link=>{const url=new URL(link.href);for(const key of ['ci','co','arrival','departure','gs','breakfast'])if(context.has(key))url.searchParams.set(key,context.get(key));link.href=url.href;});
