import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import entries from './vite.original-entries.json' with { type: 'json' };
export default defineConfig({plugins:[laravel({input:['resources/css/app.css','resources/js/app.js','resources/css/booking.css','resources/css/rooms-showcase.css','resources/js/rooms-showcase.js','resources/js/restaurant-audit.js',...entries],refresh:true})],server:{host:'127.0.0.1',port:5173,strictPort:true,watch:{ignored:['**/storage/framework/views/**']}}});
