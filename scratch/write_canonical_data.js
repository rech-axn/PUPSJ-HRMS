const fs = require('fs');

const dataJsContent = `/* ==========================================================================
   PUPSJ Hotel & Restaurant — Data & Domain Layer (data.js)
   Canonical data contract, schema migration, dynamic seeds, central business
   rules, folios, restaurant operations, loyalty, audit, and notifications.
   ========================================================================== */
'use strict';

// ─── SECURITY NOTICE (Educational / Demo System) ───
// This application is designed for demonstration and educational purposes.
// Passwords and sessions are managed client-side in localStorage for standalone
// execution without external backend servers. In production, passwords must be
// hashed server-side (bcrypt/Argon2) and authenticated via secure HTTP-only cookies.

const SCHEMA_VERSION = 2;

// ─── Default Canonical Room Types ───
const DEFAULT_TYPES = [
  {
    id: 'TYP-1',
    n: 'Standard',
    r: 3200,
    g: 2,
    b: 101,
    c: 10,
    desc: 'Comfortable contemporary room featuring a queen bed, ergonomic work desk, and San Juan city views.',
    amenities: ['Queen Bed', 'Rain Shower', 'High-Speed Wi-Fi', '43" Smart TV', 'Work Desk', 'Tea & Coffee Station']
  },
  {
    id: 'TYP-2',
    n: 'Deluxe City View',
    r: 5800,
    g: 3,
    b: 201,
    c: 12,
    desc: 'Spacious accommodation with plush king bed, deep soaking bath, and private panoramic city skyline balcony.',
    amenities: ['King Bed', 'City View Balcony', 'Deep Soaking Tub', 'High-Speed Wi-Fi', '55" Smart TV', 'Buffet Breakfast']
  },
  {
    id: 'TYP-3',
    n: 'Family Suite',
    r: 8900,
    g: 5,
    b: 301,
    c: 10,
    desc: 'Two-bedroom residence with separate living lounge, dining nook, and kitchenette for families and groups.',
    amenities: ['Two Bedrooms (King + Twin)', 'Living Room', 'Kitchenette', '2 En-Suite Bathrooms', 'Dining Table']
  },
  {
    id: 'TYP-4',
    n: 'Executive Suite',
    r: 12500,
    g: 3,
    b: 501,
    c: 6,
    desc: 'Top-floor sanctuary with master suite, lounge, private terrace hot tub, and dedicated concierge service.',
    amenities: ['Master King Suite', 'Terrace Hot Tub', 'Executive Lounge Access', 'Butler Pantry', 'Valet Privileges']
  }
];

// Helper to generate room inventory from types
const generateRoomsFromTypes = types => {
  return types.flatMap(t => {
    const base = Number(t.b || 101);
    const count = Number(t.c || 5);
    return Array.from({ length: count }, (_, k) => ({ n: base + k, t: t.n }));
  });
};

// ─── Initial Dynamic Seed Generator (Always relative to local today()) ───
const generateSeeds = () => {
  const T = today();

  const types = DEFAULT_TYPES;
  const rooms = generateRoomsFromTypes(types);

  // Housekeeping state: Room 501 is dirty (checked out), 201/305/108 clean
  const hk = {
    501: { s: 'Dirty', p: 'Urgent', a: 4, assignedName: 'Liza Gomez' },
    201: { s: 'Clean', p: '', a: 0, assignedName: '' },
    305: { s: 'Clean', p: '', a: 0, assignedName: '' },
    108: { s: 'Clean', p: '', a: 0, assignedName: '' }
  };

  // Staff accounts
  const staff = [
    { id: 1, name: 'Ruben Herwitz', email: 'admin@pupsj.edu.ph', password: 'admin123', role: 'Manager', shift: 'Day', phone: '+63 917 100 0001', active: true, created: '2026-01-15' },
    { id: 2, name: 'Maria Santos', email: 'maria@pupsj.edu.ph', password: 'frontdesk123', role: 'Front Desk', shift: 'Day', phone: '+63 917 100 0002', active: true, created: '2026-02-01' },
    { id: 3, name: 'John Reyes', email: 'john@pupsj.edu.ph', password: 'frontdesk123', role: 'Front Desk', shift: 'Night', phone: '+63 917 100 0003', active: true, created: '2026-02-01' },
    { id: 4, name: 'Liza Gomez', email: 'liza@pupsj.edu.ph', password: 'housekeeping123', role: 'Housekeeping', shift: 'Day', phone: '+63 917 100 0004', active: true, created: '2026-03-10' },
    { id: 5, name: 'Pedro Cruz', email: 'pedro@pupsj.edu.ph', password: 'housekeeping123', role: 'Housekeeping', shift: 'Day', phone: '+63 917 100 0005', active: true, created: '2026-03-10' },
    { id: 6, name: 'Ana Bautista', email: 'ana@pupsj.edu.ph', password: 'housekeeping123', role: 'Housekeeping', shift: 'Night', phone: '+63 917 100 0006', active: true, created: '2026-04-05' },
    { id: 7, name: 'Carlo Navarro', email: 'carlo@pupsj.edu.ph', password: 'maintenance123', role: 'Maintenance', shift: 'Day', phone: '+63 917 100 0007', active: true, created: '2026-05-20' },
    { id: 8, name: 'Rechelle Cansila', email: 'restaurant@pupsj.edu.ph', password: 'restaurant123', role: 'restaurant_receptionist', shift: 'Day', phone: '+63 917 100 0009', active: true, created: '2026-06-01' },
    { id: 9, name: 'Ben Aquino', email: 'ben@pupsj.edu.ph', password: 'security123', role: 'Security', shift: 'Night', phone: '+63 917 100 0008', active: true, created: '2026-06-01' }
  ];

  // Canonical Dynamic Reservations relative to today()
  const res = [
    {
      c: 'HTL-2041',
      g: 'Ana Dela Cruz',
      t: 'Deluxe City View',
      n: 201,
      i: T,
      o: addDays(T, 3),
      gu: 2,
      ph: '+63 917 000 0001',
      email: 'ana.delacruz@example.com',
      m: 'GCash',
      p: 'Paid',
      st: 'Confirmed',
      note: 'Anniversary stay – quiet room preferred',
      rt: 5800,
      promo: null,
      created: addDays(T, -2),
      pay: [{ id: 'OR-00041', d: addDays(T, -2), a: 17400, m: 'GCash', k: 'Payment', ref: 'GC-9824108', auth: 'AUTH-982410', note: 'Advance booking paid in full' }],
      x: []
    },
    {
      c: 'HTL-2042',
      g: 'Liam Carter',
      t: 'Family Suite',
      n: 305,
      i: addDays(T, -2),
      o: addDays(T, 3),
      gu: 4,
      ph: '+63 917 000 0002',
      email: 'liam.carter@example.com',
      m: 'Credit card',
      p: 'Partial',
      st: 'Checked-in',
      note: 'Extra rollaway pillows requested',
      rt: 8900,
      promo: null,
      created: addDays(T, -4),
      pay: [{ id: 'OR-00042', d: addDays(T, -2), a: 22250, m: 'Credit card', k: 'Deposit', auth: 'AUTH-892140', note: '50% guarantee deposit' }],
      x: [{ id: 101, d: addDays(T, -1), desc: 'Restaurant: ORD-1001', amt: 1630, cat: 'Dining' }]
    },
    {
      c: 'HTL-2038',
      g: 'Mei Chen',
      t: 'Standard',
      n: 108,
      i: addDays(T, -1),
      o: addDays(T, 2),
      gu: 1,
      ph: '+63 917 000 0003',
      email: 'mei.chen@example.com',
      m: 'Credit card',
      p: 'Paid',
      st: 'Checked-in',
      note: 'Late night arrival',
      rt: 3200,
      promo: null,
      created: addDays(T, -3),
      pay: [{ id: 'OR-00038', d: addDays(T, -1), a: 9600, m: 'Credit card', k: 'Payment', auth: 'AUTH-341902', note: 'Front desk check-in settlement' }],
      x: []
    },
    {
      c: 'HTL-2035',
      g: 'Carlos Mendoza',
      t: 'Executive Suite',
      n: 501,
      i: addDays(T, -4),
      o: addDays(T, -1),
      gu: 2,
      ph: '+63 917 000 0004',
      email: 'carlos.mendoza@example.com',
      m: 'Credit card',
      p: 'Paid',
      st: 'Checked-out',
      note: 'Executive airport transfer arranged',
      rt: 12500,
      promo: null,
      created: addDays(T, -6),
      pay: [{ id: 'OR-00035', d: addDays(T, -4), a: 37500, m: 'Credit card', k: 'Payment', auth: 'AUTH-129480', note: 'Full stay settled' }],
      x: []
    },
    {
      c: 'HTL-2044',
      g: 'Sofia Perez',
      t: 'Deluxe City View',
      n: 210,
      i: addDays(T, 2),
      o: addDays(T, 5),
      gu: 2,
      ph: '+63 917 000 0005',
      email: 'sofia.perez@example.com',
      m: 'Cash',
      p: 'Unpaid',
      st: 'Pending',
      note: 'Awaiting cash deposit upon front desk arrival',
      rt: 5800,
      promo: null,
      created: addDays(T, -1),
      pay: [],
      x: []
    },
    {
      c: 'HTL-2030',
      g: 'Kenji Tanaka',
      t: 'Standard',
      n: 104,
      i: addDays(T, -5),
      o: addDays(T, -3),
      gu: 1,
      ph: '+63 917 000 0006',
      email: 'kenji.tanaka@example.com',
      m: 'GCash',
      p: 'Refunded',
      st: 'Cancelled',
      note: 'Flight cancellation',
      rt: 3200,
      promo: null,
      created: addDays(T, -8),
      pay: [
        { id: 'OR-00030', d: addDays(T, -8), a: 6400, m: 'GCash', k: 'Payment', ref: 'GC-1029410', note: 'Advance booking' },
        { id: 'OR-00031', d: addDays(T, -6), a: 6400, m: 'GCash', k: 'Refund', ref: 'GC-1029410-REF', note: 'Free cancellation refund' }
      ],
      x: []
    },
    {
      c: 'HTL-2046',
      g: 'Grace Villanueva',
      t: 'Family Suite',
      n: 308,
      i: addDays(T, 5),
      o: addDays(T, 9),
      gu: 4,
      ph: '+63 917 000 0007',
      email: 'grace.v@example.com',
      m: 'GCash',
      p: 'Paid',
      st: 'Confirmed',
      note: 'Family holiday stay',
      rt: 8900,
      promo: null,
      created: addDays(T, -1),
      pay: [{ id: 'OR-00046', d: addDays(T, -1), a: 35600, m: 'GCash', k: 'Payment', ref: 'GC-7749102', note: 'Paid in full via GCash' }],
      x: []
    }
  ];

  // Promotions Store
  const promos = [
    {
      code: 'GOURMET25',
      title: 'Grand Degustation Dinner',
      description: '25% discount on set tasting dinner menu for restaurant dining guests.',
      appliesTo: 'restaurant',
      type: 'percent',
      value: 25,
      minNights: 0,
      minSpend: 1200,
      validFrom: addDays(T, -30),
      validTo: addDays(T, 60),
      used: 14,
      usedCount: 14,
      limit: 100,
      usageLimit: 100,
      active: true
    },
    {
      code: 'BRUNCH41',
      title: 'Weekend Brunch Special',
      description: '₱650 dining credit towards table parties of four or more during weekend brunch.',
      appliesTo: 'restaurant',
      type: 'fixed',
      value: 650,
      minNights: 0,
      minSpend: 2000,
      validFrom: addDays(T, -30),
      validTo: addDays(T, 60),
      used: 8,
      usedCount: 8,
      limit: 50,
      usageLimit: 50,
      active: true
    },
    {
      code: 'SUNSETBOGO',
      title: 'Sunset Cocktail & Tapas',
      description: '50% off appetizer tapas boards when ordering two or more beverages.',
      appliesTo: 'restaurant',
      type: 'percent',
      value: 50,
      minNights: 0,
      minSpend: 400,
      validFrom: addDays(T, -30),
      validTo: addDays(T, 60),
      used: 22,
      usedCount: 22,
      limit: 150,
      usageLimit: 150,
      active: true
    },
    {
      code: 'DINESTAY',
      title: 'In-Room Dining Stay Credit',
      description: '₱1,500 complimentary dining allowance credited to room folio on 3+ night bookings.',
      appliesTo: 'rooms',
      type: 'credit',
      value: 1500,
      minNights: 3,
      minSpend: 0,
      validFrom: addDays(T, -30),
      validTo: addDays(T, 60),
      used: 5,
      usedCount: 5,
      limit: 40,
      usageLimit: 40,
      active: true
    },
    {
      code: 'WELCOME10',
      title: 'Direct Booking Privilege',
      description: '10% room accommodation discount for direct web reservations.',
      appliesTo: 'rooms',
      type: 'percent',
      value: 10,
      minNights: 1,
      minSpend: 0,
      validFrom: addDays(T, -30),
      validTo: addDays(T, 60),
      used: 31,
      usedCount: 31,
      limit: 200,
      usageLimit: 200,
      active: true
    }
  ];

  // Restaurant Menu
  const menu = [
    { id: 'MNU-101', name: 'Traditional Filipino Breakfast', category: 'Breakfast', desc: 'Garlic sinangag rice, sunny-side eggs, and homemade beef tapa with pickled papaya.', price: 420, available: true, station: 'Kitchen', tags: ['Breakfast', 'Local Favorite'] },
    { id: 'MNU-102', name: 'Brioche French Toast', category: 'Breakfast', desc: 'Thick artisan brioche dipped in vanilla custard, served with honeycomb butter and maple syrup.', price: 380, available: true, station: 'Kitchen', tags: ['Breakfast', 'Sweet'] },
    { id: 'MNU-103', name: 'Fresh Continental Fruit & Pastry Basket', category: 'Breakfast', desc: 'Seasonal tropical fruits, warm butter croissants, Danish pastries, and guava jam.', price: 350, available: true, station: 'Kitchen', tags: ['Breakfast', 'Light'] },

    { id: 'MNU-201', name: 'Lumpiang Sariwa (Fresh Spring Rolls)', category: 'Starters', desc: 'Heart of palm and vegetables wrapped in homemade crepe with sweet peanut garlic sauce.', price: 290, available: true, station: 'Kitchen', tags: ['Starter', 'Vegetarian'] },
    { id: 'MNU-202', name: 'Crispy Calamari Fritti', category: 'Starters', desc: 'Lightly dusted tender squid with sinamak spiced coconut vinegar and garlic aioli.', price: 360, available: true, station: 'Kitchen', tags: ['Starter', 'Seafood'] },
    { id: 'MNU-203', name: 'Roasted Wild Mushroom Velouté', category: 'Starters', desc: 'Cream of forest mushrooms finished with truffle oil and herb croutons.', price: 320, available: true, station: 'Kitchen', tags: ['Starter', 'Soup'] },

    { id: 'MNU-301', name: 'US Angus Ribeye Steak (250g)', category: 'Mains', desc: 'Char-grilled prime beef served with garlic mashed potatoes, roasted vegetables, and peppercorn jus.', price: 1450, available: true, station: 'Kitchen', tags: ['Main', 'Chef Signature'] },
    { id: 'MNU-302', name: 'Crispy Pork Belly Kare-Kare', category: 'Mains', desc: 'Slow-braised pork belly in rich toasted peanut annatto sauce with native vegetables and shrimp paste.', price: 620, available: true, station: 'Kitchen', tags: ['Main', 'Filipino Classic'] },
    { id: 'MNU-303', name: 'Sinigang na Salmon Belly sa Miso', category: 'Mains', desc: 'Salmon belly in sour tamarind miso broth with water spinach, radish, and long peppers.', price: 680, available: true, station: 'Kitchen', tags: ['Main', 'Seafood'] },
    { id: 'MNU-304', name: 'Truffle Mushroom Risotto', category: 'Mains', desc: 'Creamy arborio rice with sauteed portobello, parmesan crisps, and white truffle essence.', price: 580, available: true, station: 'Kitchen', tags: ['Main', 'Vegetarian'] },

    { id: 'MNU-401', name: 'PUPSJ Halo-Halo Special', category: 'Desserts', desc: 'Shaved ice with candied fruits, ube halaya, leche flan, and artisanal ube gelato.', price: 280, available: true, station: 'Kitchen', tags: ['Dessert', 'Filipino Classic'] },
    { id: 'MNU-402', name: 'Mango Tres Leches Cake', category: 'Desserts', desc: 'Sponge cake soaked in three milks, layered with sweet Carabao mango coulis.', price: 260, available: true, station: 'Kitchen', tags: ['Dessert', 'Sweet'] },
    { id: 'MNU-403', name: 'Warm Batangas Tablea Fondant', category: 'Desserts', desc: 'Molten dark chocolate cake crafted from native cacao tablea with vanilla bean cream.', price: 310, available: true, station: 'Kitchen', tags: ['Dessert', 'Chocolate'] },

    { id: 'MNU-501', name: 'Fresh Ripe Mango Shake', category: 'Drinks', desc: 'Chilled ripe Philippine mango blended with organic milk.', price: 180, available: true, station: 'Kitchen', tags: ['Drink', 'Fresh'] },
    { id: 'MNU-502', name: 'Calamansi Honey Cooler', category: 'Drinks', desc: 'Freshly pressed local citrus with raw wild honey and fresh mint leaves.', price: 160, available: true, station: 'Kitchen', tags: ['Drink', 'Non-Alcoholic'] },
    { id: 'MNU-503', name: 'Barista Latte / Cappuccino', category: 'Drinks', desc: 'Locally sourced single-origin Arabica espresso with steamed whole milk.', price: 170, available: true, station: 'Kitchen', tags: ['Drink', 'Coffee'] },
    { id: 'MNU-504', name: 'Lemongrass Ginger Iced Tea', category: 'Drinks', desc: 'Fresh brewed native lemongrass and ginger infused with pandan and raw honey.', price: 160, available: true, station: 'Kitchen', tags: ['Drink', 'Fresh'] }
  ];

  // Restaurant Tables (num as Number, status, area)
  const tables = [
    { id: 'TBL-1', num: 1, name: 'Table 1', seats: 2, area: 'Main Dining', status: 'Free', st: 'Free' },
    { id: 'TBL-2', num: 2, name: 'Table 2', seats: 4, area: 'Main Dining', status: 'Occupied', st: 'Occupied' },
    { id: 'TBL-3', num: 3, name: 'Table 3', seats: 4, area: 'Main Dining', status: 'Reserved', st: 'Reserved' },
    { id: 'TBL-4', num: 4, name: 'Table 4', seats: 6, area: 'Main Dining', status: 'Free', st: 'Free' },
    { id: 'TBL-5', num: 5, name: 'Table 5', seats: 2, area: 'Garden Terrace', status: 'Free', st: 'Free' },
    { id: 'TBL-6', num: 6, name: 'Table 6', seats: 4, area: 'Garden Terrace', status: 'Free', st: 'Free' },
    { id: 'TBL-7', num: 7, name: 'Table 7', seats: 8, area: 'Private Room', status: 'Free', st: 'Free' }
  ];

  // Table Reservations
  const tableRes = [
    {
      code: 'TBL-101',
      guestName: 'Roberto Gomez',
      guest: 'Roberto Gomez',
      phone: '+63 917 555 1234',
      date: T,
      time: '19:00',
      partySize: 4,
      party: 4,
      tableNum: 3,
      table: 3,
      tableId: 'TBL-3',
      status: 'Confirmed',
      notes: 'Window seating preferred',
      created: `${ T } 10:00`
    },
    {
      code: 'TBL-102',
      guestName: 'Lucia Santos',
      guest: 'Lucia Santos',
      phone: '+63 918 333 4567',
      date: addDays(T, 1),
      time: '12:30',
      partySize: 2,
      party: 2,
      tableNum: 0,
      table: 0,
      tableId: '',
      status: 'Pending',
      notes: 'Birthday celebration',
      created: `${ T } 11: 30`
    }
  ];

  // Canonical Restaurant Orders (Split kitchen status & payStatus)
  const orders = [
    {
      code: 'ORD-1001',
      type: 'In-room',
      target: 'Room 305',
      room: 305,
      table: '',
      resCode: 'HTL-2042',
      linkedRes: 'HTL-2042',
      lines: [
        { id: 'MNU-301', name: 'US Angus Ribeye Steak (250g)', qty: 1, unitPrice: 1450, price: 1450, note: 'Medium rare' },
        { id: 'MNU-501', name: 'Fresh Ripe Mango Shake', qty: 1, unitPrice: 180, price: 180, note: 'Less sugar' }
      ],
      subtotal: 1630,
      status: 'Served',
      payStatus: 'Room folio',
      paymentKind: 'Room Folio',
      created: `${ T } 12: 15`,
      updated: `${ T } 12: 45`
    },
    {
      code: 'ORD-1002',
      type: 'Dine-in',
      target: 'Table 2',
      room: '',
      table: 2,
      resCode: '',
      linkedRes: '',
      lines: [
        { id: 'MNU-302', name: 'Crispy Pork Belly Kare-Kare', qty: 1, unitPrice: 620, price: 620, note: '' },
        { id: 'MNU-303', name: 'Sinigang na Salmon Belly sa Miso', qty: 1, unitPrice: 680, price: 680, note: '' },
        { id: 'MNU-401', name: 'PUPSJ Halo-Halo Special', qty: 2, unitPrice: 280, price: 280, note: '' }
      ],
      subtotal: 1860,
      status: 'Preparing',
      payStatus: 'Unpaid',
      paymentKind: 'Pending Settlement',
      created: `${ T } 13:00`,
      updated: `${ T } 13:05`
    },
    {
      code: 'ORD-1003',
      type: 'Dine-in',
      target: 'Table 1',
      room: '',
      table: 1,
      resCode: '',
      linkedRes: '',
      lines: [
        { id: 'MNU-304', name: 'Truffle Mushroom Risotto', qty: 1, unitPrice: 580, price: 580, note: 'Extra parmesan' },
        { id: 'MNU-502', name: 'Calamansi Honey Cooler', qty: 1, unitPrice: 160, price: 160, note: '' }
      ],
      subtotal: 740,
      status: 'New',
      payStatus: 'Unpaid',
      paymentKind: 'Pending Settlement',
      created: `${ T } 13: 10`,
      updated: `${ T } 13: 10`
    }
  ];

  // Guest Messages / Threads
  const threads = [
    {
      id: 'MSG-101',
      guestName: 'Liam Carter',
      guest: 'Liam Carter',
      contact: '+63 917 000 0002',
      resCode: 'HTL-2042',
      subject: 'Extra Pillows & Towels Request',
      status: 'Open',
      unreadStaff: 1,
      unreadGuest: 0,
      updated: `${ T } 11: 20`,
      updatedAt: `${ T } 11: 20`,
      messages: [
        { sender: 'Liam Carter', role: 'guest', time: `${ T } 11: 15`, text: 'Hello, could we get two extra hypoallergenic pillows brought up to Room 305?' },
        { sender: 'Maria Santos', role: 'staff', time: `${ T } 11: 20`, text: 'Good morning Mr. Carter, housekeeping has been notified and will deliver them shortly.' }
      ]
    },
    {
      id: 'MSG-102',
      guestName: 'Eduardo Ramos',
      guest: 'Eduardo Ramos',
      contact: 'eduardo@example.com',
      resCode: '',
      subject: 'Inquiry regarding private dinner hosting',
      status: 'Open',
      unreadStaff: 1,
      unreadGuest: 0,
      updated: `${ T } 09: 40`,
      updatedAt: `${ T } 09: 40`,
      messages: [
        { sender: 'Eduardo Ramos', role: 'guest', time: `${ T } 09: 40`, text: 'Good day. We would like to inquire if the Terrace area can host 12 guests for a private family dinner next Friday.' }
      ]
    }
  ];

  // Contact Inquiries
  const inquiries = [
    {
      ref: 'INQ-1001',
      id: 'INQ-1001',
      name: 'Atty. Roberto Gomez',
      email: 'roberto.gomez@lawfirm.ph',
      phone: '+63 917 222 3344',
      type: 'Corporate Group & Conference Inquiry',
      message: 'Requesting room allocation and meeting room package for 18 attorneys attending a 2-day conference next month.',
      status: 'New',
      staffNotes: '',
      notes: '',
      assignedTo: 'Ruben Herwitz',
      assigned: 'Ruben Herwitz',
      created: `${ T } 10: 30`
    },
    {
      ref: 'INQ-1002',
      id: 'INQ-1002',
      name: 'Clarissa Tan',
      email: 'clarissa.tan@gmail.com',
      phone: '+63 918 888 7766',
      type: 'Suite Reservation & Room Upgrade',
      message: 'Looking to book a Family Suite for our wedding anniversary with special floral arrangement.',
      status: 'In progress',
      staffNotes: 'Sent quotation via email',
      notes: 'Sent quotation via email',
      assignedTo: 'Maria Santos',
      assigned: 'Maria Santos',
      created: addDays(T, -1) + ' 15:45'
    }
  ];

  // Housekeeping Requests
  const hkReq = [
    {
      id: 'HKR-101',
      room: 305,
      guestName: 'Liam Carter',
      resCode: 'HTL-2042',
      item: 'Extra Pillows & Towels',
      notes: 'Hypoallergenic pillows',
      status: 'In progress',
      st: 'In progress',
      assignedTo: 'Liza Gomez',
      assigned: 'Liza Gomez',
      created: `${ T } 11: 15`,
      updated: `${ T } 11: 20`
    }
  ];

  // Maintenance Requests
  const mReq = [
    {
      id: 'MNT-101',
      room: 501,
      issue: 'Balcony door latch loose and needs realignment',
      priority: 'Medium',
      pri: 'Medium',
      status: 'Open',
      st: 'Open',
      assignedTo: 'Carlo Navarro',
      assigned: 'Carlo Navarro',
      outOfService: true,
      oos: true,
      notes: 'Scheduled for adjustment today',
      created: `${ T } 08: 30`,
      resolved: ''
    }
  ];

  // Guest Feedback & Reviews
  const feedback = [
    {
      id: 'FB-101',
      resCode: 'HTL-2035',
      guestName: 'Carlos Mendoza',
      guest: 'Carlos Mendoza',
      roomType: 'Executive Suite',
      ratingOverall: 5,
      rating: 5,
      ratingCleanliness: 5,
      ratingStaff: 5,
      ratingComfort: 5,
      ratingDining: 4,
      ratingValue: 5,
      comment: 'Exceptional hospitality and serene stay in San Juan. The room was immaculate and check-in was seamless.',
      staffReply: 'Thank you Mr. Mendoza. We look forward to welcoming you back soon.',
      reply: 'Thank you Mr. Mendoza. We look forward to welcoming you back soon.',
      published: true,
      created: addDays(T, -1),
      date: addDays(T, -1)
    },
    {
      id: 'FB-102',
      resCode: 'HTL-2030',
      guestName: 'Patricia Lim',
      guest: 'Patricia Lim',
      roomType: 'Deluxe City View',
      ratingOverall: 4,
      rating: 4,
      ratingCleanliness: 5,
      ratingStaff: 5,
      ratingComfort: 4,
      ratingDining: 4,
      ratingValue: 4,
      comment: 'Very peaceful ambiance and pleasant dining at the restaurant. Prompt room service.',
      staffReply: 'Thank you for your valuable feedback, Ms. Lim.',
      reply: 'Thank you for your valuable feedback, Ms. Lim.',
      published: true,
      created: addDays(T, -6),
      date: addDays(T, -6)
    }
  ];

  // Guest Accounts
  const guestAccounts = [
    {
      email: 'ana.delacruz@example.com',
      password: 'password123',
      name: 'Ana Dela Cruz',
      phone: '+63 917 000 0001',
      created: '2026-01-10'
    },
    {
      email: 'liam.carter@example.com',
      password: 'password123',
      name: 'Liam Carter',
      phone: '+63 917 000 0002',
      created: '2026-02-14'
    }
  ];

  // Real Loyalty Ledger
  const loyalty = [
    {
      id: 'LOY-101',
      guestName: 'Carlos Mendoza',
      points: 375,
      type: 'earn',
      ref: 'HTL-2035',
      notes: 'Executive Suite 3-night stay settlement',
      date: addDays(T, -1)
    }
  ];

  // Audit Trail
  const audit = [
    { id: 1, time: `${ T } 08: 30`, user: 'Carlo Navarro', action: 'Created maintenance request', recordType: 'Maintenance', type: 'Maintenance', recordId: 'MNT-101', idVal: 'MNT-101', details: 'Room 501 door latch' },
    { id: 2, time: `${ T } 11: 20`, user: 'Maria Santos', action: 'Assigned housekeeping request', recordType: 'Housekeeping', type: 'Housekeeping', recordId: 'HKR-101', idVal: 'HKR-101', details: 'Room 305 extra pillows' },
    { id: 3, time: `${ T } 12: 45`, user: 'Rechelle Cansila', action: 'Updated restaurant order', recordType: 'Order', type: 'Order', recordId: 'ORD-1001', idVal: 'ORD-1001', details: 'Billed to Room 305 folio' }
  ];

  return {
    schema: SCHEMA_VERSION,
    types,
    rooms,
    hk,
    staff,
    res,
    promos,
    menu,
    tables,
    tableRes,
    orders,
    threads,
    inquiries,
    hkReq,
    mReq,
    feedback,
    guestAccounts,
    guestProfiles: {},
    audit,
    notifSeen: { count: 0, time: '' },
    loyalty
  };
};

// ─── Data Layer Manager & Migration System ───
const Data = {
  // Initializes or migrates storage on startup
  init() {
    const curSchema = store.get('schema', 0);
    const hasRes = store.get('res', null);

    if (!curSchema || curSchema < SCHEMA_VERSION || !hasRes) {
      console.info('Initializing or migrating PUPSJ data schema to v' + SCHEMA_VERSION + '...');
      const fresh = generateSeeds();
      Object.entries(fresh).forEach(([k, v]) => {
        store.set(k, v);
      });
    }
  },

  // Resets all data to clean default seeds
  resetDemo() {
    Object.keys(localStorage)
      .filter(k => k.startsWith('pupsj.') || k.startsWith('blade.'))
      .forEach(k => localStorage.removeItem(k));
    const fresh = generateSeeds();
    Object.entries(fresh).forEach(([k, v]) => {
      store.set(k, v);
    });
    console.info('PUPSJ demo data successfully restored.');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    }
  },
  resetDemoData() {
    this.resetDemo();
  },

  // ─── Unique ID Generator (Collision-Free) ───
  nextId(prefix) {
    if (prefix === 'HTL-') {
      const list = this.getReservations();
      const maxNum = Math.max(2040, ...list.map(r => {
        const m = /^HTL-(\d+)$/.exec(r.c);
        return m ? Number(m[1]) : 0;
      }));
      return 'HTL-' + (maxNum + 1);
    }
    if (prefix === 'MNT-') {
      const list = this.getMaintenance();
      const maxNum = Math.max(100, ...list.map(m => {
        const match = /^(?:MNT|MX)-(\d+)$/.exec(m.id);
        return match ? Number(match[1]) : 0;
      }));
      return 'MNT-' + (maxNum + 1);
    }
    if (prefix === 'ORD-') {
      const list = this.getOrders();
      const maxNum = Math.max(1000, ...list.map(o => {
        const match = /^ORD-(\d+)$/.exec(o.code);
        return match ? Number(match[1]) : 0;
      }));
      return 'ORD-' + (maxNum + 1);
    }
    if (prefix === 'TBL-') {
      const list = this.getTableRes();
      const maxNum = Math.max(100, ...list.map(t => {
        const match = /^TBL-(\d+)$/.exec(t.code);
        return match ? Number(match[1]) : 0;
      }));
      return 'TBL-' + (maxNum + 1);
    }
    if (prefix === 'INQ-') {
      const list = this.getInquiries();
      const maxNum = Math.max(1000, ...list.map(i => {
        const match = /^INQ-(\d+)$/.exec(i.ref || i.id);
        return match ? Number(match[1]) : 0;
      }));
      return 'INQ-' + (maxNum + 1);
    }
    if (prefix === 'MSG-') {
      const list = this.getThreads();
      const maxNum = Math.max(100, ...list.map(t => {
        const match = /^MSG-(\d+)$/.exec(t.id);
        return match ? Number(match[1]) : 0;
      }));
      return 'MSG-' + (maxNum + 1);
    }
    if (prefix === 'HKR-') {
      const list = this.getHkRequests();
      const maxNum = Math.max(100, ...list.map(h => {
        const match = /^HKR-(\d+)$/.exec(h.id);
        return match ? Number(match[1]) : 0;
      }));
      return 'HKR-' + (maxNum + 1);
    }
    if (prefix === 'FB-') {
      const list = this.getFeedback();
      const maxNum = Math.max(100, ...list.map(f => {
        const match = /^FB-(\d+)$/.exec(f.id);
        return match ? Number(match[1]) : 0;
      }));
      return 'FB-' + (maxNum + 1);
    }
    if (prefix === 'OR-') {
      return this.nextOR();
    }
    return prefix + Date.now();
  },

  nextOR() {
    const res = this.getReservations();
    const maxNum = Math.max(0, ...res.flatMap(r => r.pay || []).map(p => {
      const m = /^OR-(\d{5})$/.exec(p.id || p.or);
      return m ? Number(m[1]) : 0;
    }));
    return 'OR-' + String(maxNum + 1).padStart(5, '0');
  },

  // ─── Room Types & Rooms ───
  getTypes() {
    const raw = store.get('types', DEFAULT_TYPES);
    return raw.map(t => ({
      ...t,
      desc: t.desc || t.description || `${ t.n } accommodation with standard room comforts.`,
      description: t.desc || t.description || `${ t.n } accommodation with standard room comforts.`,
      amenities: Array.isArray(t.amenities)
        ? t.amenities
        : String(t.amenities || '').split(',').map(s => s.trim()).filter(Boolean)
    }));
  },
  saveTypes(types) {
    const normalized = types.map(t => ({
      ...t,
      desc: t.desc || t.description || '',
      description: t.desc || t.description || '',
      amenities: Array.isArray(t.amenities)
        ? t.amenities
        : String(t.amenities || '').split(',').map(s => s.trim()).filter(Boolean)
    }));
    store.set('types', normalized);
  },
  getRooms() {
    return store.get('rooms', []).map(r => ({
      n: Number(r.n),
      t: r.t,
      st: this.roomStatus(Number(r.n)).s
    }));
  },
  saveRooms(rooms) {
    store.set('rooms', rooms.map(r => ({ n: Number(r.n), t: r.t })));
  },
  roomNums(typeName) {
    return this.getRooms().filter(r => r.t === typeName).map(r => Number(r.n)).sort((a, b) => a - b);
  },

  // ─── Housekeeping & Maintenance ───
  getHK() {
    const val = store.get('hk', {});
    if (Array.isArray(val)) {
      const obj = {};
      val.forEach(item => {
        const s = item.s || item.st || 'Clean';
        obj[Number(item.n)] = {
          s,
          p: item.p || '',
          a: Number(item.a || 0),
          assignedName: item.assignedName || ''
        };
      });
      return obj;
    }
    return val;
  },
  getHk() {
    const raw = this.getHK();
    const rooms = this.getRooms();
    const staff = this.getStaff();

    const getStaffName = id => {
      const s = staff.find(x => x.id === Number(id));
      return s ? s.name : '';
    };

    return rooms.map(rm => {
      const rec = raw[rm.n] || raw[String(rm.n)];
      const status = (rec && (rec.s || rec.st)) ? (rec.s || rec.st) : 'Clean';
      const staffId = rec ? Number(rec.a || 0) : 0;
      return {
        n: Number(rm.n),
        s: status,
        st: status,
        p: rec ? (rec.p || '') : '',
        a: staffId,
        assignedName: (rec && rec.assignedName) ? rec.assignedName : (staffId ? getStaffName(staffId) : '')
      };
    });
  },
  saveHk(listOrObj) {
    if (Array.isArray(listOrObj)) {
      const obj = {};
      listOrObj.forEach(item => {
        const status = item.s || item.st || 'Clean';
        obj[Number(item.n)] = {
          s: status,
          p: item.p || '',
          a: Number(item.a || 0),
          assignedName: item.assignedName || ''
        };
      });
      store.set('hk', obj);
    } else {
      store.set('hk', listOrObj);
    }
  },
  getRoomHK(roomNum) {
    const hk = this.getHK();
    return hk[Number(roomNum)] || hk[String(roomNum)] || { s: 'Clean', p: '', a: 0, assignedName: '' };
  },
  setRoomHK(roomNum, updates) {
    const hk = this.getHK();
    const key = Number(roomNum);
    hk[key] = { ...(hk[key] || { s: 'Clean', p: '', a: 0, assignedName: '' }), ...updates };
    this.saveHk(hk);
  },
  isRoomClean(roomNum) {
    const h = this.getRoomHK(roomNum);
    return h.s === 'Clean';
  },

  getMaintenance() {
    const list = store.get('mReq', []);
    return list.map(m => ({
      ...m,
      room: Number(m.room),
      priority: m.priority || m.pri || 'Medium',
      pri: m.priority || m.pri || 'Medium',
      status: m.status || m.st || 'Open',
      st: m.status || m.st || 'Open',
      outOfService: !!(m.outOfService ?? m.oos),
      oos: !!(m.outOfService ?? m.oos),
      assignedTo: m.assignedTo || m.assigned || '',
      assigned: m.assignedTo || m.assigned || ''
    }));
  },
  saveMaintenance(list) {
    const normalized = list.map(m => ({
      ...m,
      room: Number(m.room),
      priority: m.priority || m.pri || 'Medium',
      pri: m.priority || m.pri || 'Medium',
      status: m.status || m.st || 'Open',
      st: m.status || m.st || 'Open',
      outOfService: !!(m.outOfService ?? m.oos),
      oos: !!(m.outOfService ?? m.oos),
      assignedTo: m.assignedTo || m.assigned || '',
      assigned: m.assignedTo || m.assigned || ''
    }));
    store.set('mReq', normalized);
  },
  isRoomUnderMaintenance(roomNum) {
    const num = Number(roomNum);
    const m = this.getMaintenance();
    return m.some(r => r.room === num && r.status !== 'Resolved' && r.outOfService);
  },

  // Canonical Real-Time Room Availability
  freeRooms(typeName, inDate, outDate, excludeResCode = null) {
    const T = today();
    const rooms = this.roomNums(typeName);
    const reservations = this.getReservations();
    const maintenance = this.getMaintenance();
    const hk = this.getHK();

    // Rooms with overlapping active reservations
    const bookedRooms = reservations
      .filter(r => {
        if (excludeResCode && r.c === excludeResCode) return false;
        if (r.t !== typeName) return false;
        if (r.st === 'Cancelled' || r.st === 'Checked-out') return false;
        // Overlap condition: r.i < outDate && r.o > inDate
        return r.i < outDate && r.o > inDate;
      })
      .map(r => Number(r.n));

    // Rooms under out-of-service maintenance
    const maintRooms = maintenance
      .filter(m => m.status !== 'Resolved' && m.outOfService)
      .map(m => Number(m.room));

    return rooms.filter(num => {
      const roomNum = Number(num);
      if (bookedRooms.includes(roomNum)) return false;
      if (maintRooms.includes(roomNum)) return false;
      if (inDate <= T) {
        const roomHk = hk[roomNum] || { s: 'Clean' };
        if (roomHk.s !== 'Clean') return false;
      }
      return true;
    });
  },

  // Derived dynamic status of any room on a given date
  roomStatus(roomNum, targetDate) {
    const T = today();
    const num = Number(roomNum);
    const date = targetDate || T;

    if (this.isRoomUnderMaintenance(num)) {
      return { s: 'Maintenance' };
    }

    const reservations = this.getReservations();
    const active = reservations.find(r => Number(r.n) === num && r.st !== 'Cancelled' && r.st !== 'Checked-out' && r.i <= date && r.o > date);
    if (active) {
      return { s: active.st === 'Checked-in' ? 'Occupied' : 'Reserved', r: active };
    }

    if (date === T) {
      const roomHk = this.getRoomHK(num);
      if (roomHk.s !== 'Clean') {
        return { s: 'Cleaning' };
      }
    }

    return { s: 'Available' };
  },

  setRoomStatus(roomNum, status) {
    const num = Number(roomNum);
    if (status === 'Clean' || status === 'Dirty' || status === 'In progress') {
      this.setRoomHK(num, { s: status });
    } else if (status === 'Maintenance') {
      const m = this.getMaintenance();
      if (!m.some(x => x.room === num && x.outOfService && x.status !== 'Resolved')) {
        this.createMaintenanceRequest(num, 'Flagged out-of-service', 'High', true);
      }
    }
  },

  // ─── Reservations Store & Domain API ───
  getReservations() {
    const list = store.get('res', []);
    return list.map(r => ({
      ...r,
      n: Number(r.n || 0),
      rt: Number(r.rt || 0),
      gu: Number(r.gu || 1),
      pay: (r.pay || []).map(p => ({
        ...p,
        id: p.id || p.or,
        or: p.id || p.or,
        a: Number(p.a ?? p.amt ?? 0),
        amt: Number(p.a ?? p.amt ?? 0),
        k: p.k || p.t || 'Payment',
        t: p.k || p.t || 'Payment'
      })),
      x: (r.x || []).map(x => ({
        ...x,
        amt: Number(x.amt || 0)
      }))
    }));
  },
  saveReservations(list) {
    const normalized = list.map(r => ({
      ...r,
      n: Number(r.n || 0),
      rt: Number(r.rt || 0),
      gu: Number(r.gu || 1),
      pay: (r.pay || []).map(p => ({
        ...p,
        id: p.id || p.or,
        or: p.id || p.or,
        a: Number(p.a ?? p.amt ?? 0),
        amt: Number(p.a ?? p.amt ?? 0),
        k: p.k || p.t || 'Payment',
        t: p.k || p.t || 'Payment'
      })),
      x: (r.x || []).map(x => ({
        ...x,
        amt: Number(x.amt || 0)
      }))
    }));
    store.set('res', normalized);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    }
  },
  saveRes(list) {
    this.saveReservations(list);
  },
  findRes(code) {
    if (!code) return null;
    const target = String(code).trim().toUpperCase();
    return this.getReservations().find(r => r.c.toUpperCase() === target) || null;
  },

  createReservation(data) {
    const res = this.getReservations();
    const code = this.nextId('HTL-');

    const newRes = {
      c: code,
      g: (data.g || data.guestName || '').trim(),
      t: data.t || data.roomType || '',
      n: Number(data.n || data.roomNum || 0),
      i: data.i || data.checkIn || '',
      o: data.o || data.checkOut || '',
      gu: Number(data.gu || data.guests || 1),
      ph: (data.ph || data.phone || '').trim(),
      email: (data.email || '').trim(),
      m: data.m || data.paymentMethod || 'Credit card',
      p: 'Unpaid',
      st: 'Pending',
      note: data.note || data.notes || '',
      rt: Number(data.rt || data.rate || 0),
      promo: data.promo || null,
      created: today(),
      pay: [],
      x: []
    };

    if (data.initialPayment) {
      const p = data.initialPayment;
      const orNum = this.nextOR();
      newRes.pay.push({
        id: orNum,
        or: orNum,
        d: today(),
        a: Math.round(Number(p.amount)),
        amt: Math.round(Number(p.amount)),
        m: p.method,
        k: p.kind || 'Deposit',
        t: p.kind || 'Deposit',
        note: p.note || 'Initial booking guarantee',
        auth: p.auth || '',
        ref: p.ref || '',
        cardLast4: p.cardLast4 || ''
      });
      newRes.st = 'Confirmed';
    }

    this.syncPaymentStatus(newRes);
    res.unshift(newRes);
    this.saveReservations(res);

    this.audit('Created reservation', 'Reservation', code, `${ newRes.g } (${ newRes.t })`);
    return newRes;
  },

  updateReservation(code, updates) {
    const res = this.getReservations();
    const idx = res.findIndex(r => r.c.toUpperCase() === String(code).trim().toUpperCase());
    if (idx === -1) return null;

    res[idx] = { ...res[idx], ...updates };
    if (updates.n != null) res[idx].n = Number(updates.n);
    if (updates.rt != null) res[idx].rt = Number(updates.rt);
    this.syncPaymentStatus(res[idx]);
    this.saveReservations(res);
    this.audit('Updated reservation', 'Reservation', res[idx].c, 'Modified reservation fields');
    return res[idx];
  },

  // Folio Calculations
  nts(r) {
    if (!r || !r.i || !r.o) return 1;
    return Math.max(1, dateDiff(r.i, r.o));
  },
  roomChg(r) {
    if (!r) return 0;
    const typeRate = Number(r.rt) || (DEFAULT_TYPES.find(t => t.n === r.t) || {}).r || 3200;
    let base = this.nts(r) * typeRate;
    if (r.promo) {
      const pType = r.promo.type;
      const pApplies = r.promo.appliesTo;
      if (pApplies === 'rooms' || pApplies === 'both') {
        if (pType === 'percent') {
          const discount = Math.round(base * (Number(r.promo.value) / 100));
          base -= discount;
        } else if (pType === 'fixed') {
          base = Math.max(0, base - Number(r.promo.value));
        }
      }
    }
    return Math.max(0, base);
  },
  tot(r) {
    if (!r) return 0;
    const extras = (r.x || []).reduce((sum, item) => sum + Number(item.amt || 0), 0);
    return this.roomChg(r) + extras;
  },
  paidAmt(r) {
    if (!r || !r.pay) return 0;
    return r.pay.reduce((sum, p) => {
      const amount = Number(p.a ?? p.amt ?? 0);
      return sum + ((p.k === 'Refund' || p.t === 'Refund') ? -amount : amount);
    }, 0);
  },
  refundedAmt(r) {
    if (!r || !r.pay) return 0;
    return r.pay
      .filter(p => p.k === 'Refund' || p.t === 'Refund')
      .reduce((sum, p) => sum + Number(p.a ?? p.amt ?? 0), 0);
  },
  balOf(r) {
    if (!r || r.st === 'Cancelled') return 0;
    return Math.max(0, this.tot(r) - this.paidAmt(r));
  },
  depAmt(r) {
    if (!r) return 0;
    return Math.ceil(this.roomChg(r) * (CONFIG.depositPct / 100));
  },

  syncPaymentStatus(r) {
    const net = this.paidAmt(r);
    const total = this.tot(r);

    if (r.st === 'Cancelled') {
      r.p = net > 0 ? 'Retained' : (this.refundedAmt(r) > 0 ? 'Refunded' : 'Voided');
    } else if (net <= 0) {
      r.p = 'Unpaid';
    } else if (net >= total) {
      r.p = 'Paid';
    } else {
      r.p = 'Partial';
    }
  },

  // Polymorphic Payment Handler (accepts code string or reservation object)
  addPayment(codeOrObj, amount, method, kind = 'Payment', note = '', meta = {}) {
    let r = typeof codeOrObj === 'string' ? this.findRes(codeOrObj) : codeOrObj;
    if (!r) throw new Error('Reservation not found: ' + codeOrObj);

    r.pay = r.pay || [];
    const orNum = this.nextOR();
    const entry = {
      id: orNum,
      or: orNum,
      d: today(),
      a: Math.round(Number(amount)),
      amt: Math.round(Number(amount)),
      m: method,
      k: kind,
      t: kind,
      note: note || '',
      ...meta
    };
    r.pay.push(entry);

    if (kind !== 'Refund') {
      r.m = method;
      if (r.st === 'Pending' && this.paidAmt(r) >= this.depAmt(r)) {
        r.st = 'Confirmed';
      }
    }
    this.syncPaymentStatus(r);
    this.updateReservation(r.c, r);
    this.audit(\`Payment \${entry.id}\`, 'Payment', r.c, \`\${peso(amount)} via \${method} (\${kind})\`);
    return entry;
  },

  // Polymorphic Charge Handler (accepts code string or reservation object)
  addCharge(codeOrObj, desc, amount, cat = 'Incidentals') {
    let r = typeof codeOrObj === 'string' ? this.findRes(codeOrObj) : codeOrObj;
    if (!r) throw new Error('Reservation not found: ' + codeOrObj);

    r.x = r.x || [];
    const entry = {
      id: Date.now(),
      d: today(),
      desc: String(desc).trim(),
      amt: Math.round(Number(amount)),
      cat: cat || 'Incidentals'
    };
    r.x.push(entry);
    this.syncPaymentStatus(r);
    this.updateReservation(r.c, r);
    this.audit('Added charge', 'Folio', r.c, \`\${desc} (\${peso(amount)})\`);
    return entry;
  },

  // Check-In Domain Rule: date <= today, room is clean, deposit paid
  checkIn(code) {
    const r = this.findRes(code);
    if (!r) return { success: false, error: 'Reservation not found.' };

    const T = today();
    if (r.i > T) {
      return { success: false, error: \`Cannot check in early. Scheduled arrival date is \${r.i}.\` };
    }
    if (!this.isRoomClean(r.n)) {
      return { success: false, error: \`Cannot check in: Room \${r.n} is currently marked Dirty or undergoing cleaning.\` };
    }
    if (this.paidAmt(r) < this.depAmt(r)) {
      return { success: false, error: \`Cannot check in: 50% deposit (\${peso(this.depAmt(r))}) has not been settled.\` };
    }

    r.st = 'Checked-in';
    this.updateReservation(r.c, r);
    this.audit('Check-in', 'Reservation', r.c, \`Guest \${r.g} checked into Room \${r.n}\`);
    return { success: true, res: r };
  },

  // Check-Out Domain Rule: mark Checked-out, mark room Dirty in HK, award loyalty points
  checkOut(code) {
    const r = this.findRes(code);
    if (!r) return { success: false, error: 'Reservation not found.' };

    r.st = 'Checked-out';
    this.updateReservation(r.c, r);
    this.setRoomHK(r.n, { s: 'Dirty', p: 'Urgent' });

    // Award loyalty points on stay completion
    const pointsEarned = Math.floor(this.tot(r) / 100) * CONFIG.loyalty.earnRate;
    if (pointsEarned > 0) {
      this.addLoyaltyPoints(r.g, pointsEarned, 'Completed stay settlement', r.c);
    }

    this.audit('Check-out', 'Reservation', r.c, \`Guest \${r.g} checked out. Room \${r.n} marked Dirty.\`);
    return { success: true, res: r };
  },

  // Cancellation Policy Rule: >= 3 days free cancel, < 3 days retain 1st night
  cancelReservation(code, by = 'staff') {
    const r = this.findRes(code);
    if (!r) return { success: false, error: 'Reservation not found.' };

    const T = today();
    const daysUntilArrival = dateDiff(T, r.i);
    const paid = this.paidAmt(r);
    let refundAmt = 0;
    let retainedFee = 0;

    if (daysUntilArrival >= CONFIG.freeCancelDays) {
      refundAmt = paid;
      retainedFee = 0;
    } else {
      retainedFee = Math.min(paid, r.rt || 3200);
      refundAmt = Math.max(0, paid - retainedFee);
    }

    if (refundAmt > 0) {
      r.pay = r.pay || [];
      const orNum = this.nextOR();
      r.pay.push({
        id: orNum,
        or: orNum,
        d: T,
        a: refundAmt,
        amt: refundAmt,
        m: r.m || 'Original Payment',
        k: 'Refund',
        t: 'Refund',
        note: daysUntilArrival >= CONFIG.freeCancelDays ? 'Full policy refund' : 'Partial refund after 1st-night retention',
        auth: 'REF-CANCEL',
        ref: r.c
      });
    }

    r.st = 'Cancelled';
    this.syncPaymentStatus(r);
    this.updateReservation(r.c, r);
    this.audit('Cancellation', 'Reservation', r.c, \`Cancelled by \${by}. Retained: \${peso(retainedFee)}, Refunded: \${peso(refundAmt)}\`);
    return { success: true, refundAmt, retainedFee, res: r };
  },

  // ─── Staff & Guest Profiles ───
  getStaff() {
    return store.get('staff', []);
  },
  saveStaff(list) {
    store.set('staff', list);
  },
  findStaffByEmail(email) {
    if (!email) return null;
    return this.getStaff().find(s => s.email.toLowerCase() === email.trim().toLowerCase()) || null;
  },

  getGuestAccounts() {
    return store.get('guestAccounts', []);
  },
  saveGuestAccounts(list) {
    store.set('guestAccounts', list);
  },
  findGuestAccount(email) {
    if (!email) return null;
    return this.getGuestAccounts().find(g => g.email.toLowerCase() === email.trim().toLowerCase()) || null;
  },

  getGuestProfiles() {
    const res = this.getReservations();
    const accounts = this.getGuestAccounts();
    const map = {};

    accounts.forEach(acc => {
      const key = acc.name.toLowerCase();
      map[key] = {
        name: acc.name,
        email: acc.email,
        phone: acc.phone,
        stays: 0,
        nights: 0,
        totalSpend: 0,
        reservations: [],
        created: acc.created
      };
    });

    res.forEach(r => {
      const key = r.g.toLowerCase();
      if (!map[key]) {
        map[key] = {
          name: r.g,
          email: r.email,
          phone: r.ph,
          stays: 0,
          nights: 0,
          totalSpend: 0,
          reservations: [],
          created: r.created || r.i
        };
      }
      map[key].reservations.push(r);
      if (r.st === 'Checked-out' || r.st === 'Checked-in') {
        map[key].stays += 1;
        map[key].nights += this.nts(r);
        map[key].totalSpend += this.paidAmt(r);
      }
    });

    Object.values(map).forEach(profile => {
      profile.tier = this.getGuestTier(profile.nights).name;
      profile.points = this.getLoyaltyPoints(profile.name);
    });

    return map;
  },

  // ─── Session Management ───
  getStaffSession() {
    return store.get('sessionStaff', null);
  },
  setStaffSession(user) {
    store.set('sessionStaff', user);
  },
  clearStaffSession() {
    store.remove('sessionStaff');
  },

  getGuestSession() {
    return store.get('sessionGuest', null);
  },
  setGuestSession(guest) {
    store.set('sessionGuest', guest);
  },
  clearGuestSession() {
    store.remove('sessionGuest');
  },

  // ─── Promotions ───
  getPromos() {
    const list = store.get('promos', []);
    return list.map(p => ({
      ...p,
      used: Number(p.used ?? p.usedCount ?? 0),
      usedCount: Number(p.used ?? p.usedCount ?? 0),
      limit: Number(p.limit ?? p.usageLimit ?? 0),
      usageLimit: Number(p.limit ?? p.usageLimit ?? 0)
    }));
  },
  savePromos(list) {
    const normalized = list.map(p => ({
      ...p,
      used: Number(p.used ?? p.usedCount ?? 0),
      usedCount: Number(p.used ?? p.usedCount ?? 0),
      limit: Number(p.limit ?? p.usageLimit ?? 0),
      usageLimit: Number(p.limit ?? p.usageLimit ?? 0)
    }));
    store.set('promos', normalized);
  },
  findPromo(code) {
    if (!code) return null;
    const target = String(code).trim().toUpperCase();
    return this.getPromos().find(p => p.code.toUpperCase() === target && p.active) || null;
  },
  validatePromo(code, context = {}) {
    const p = this.findPromo(code);
    if (!p) return { valid: false, error: 'Promo code not recognized or inactive.' };

    const T = today();
    if (p.validFrom && T < p.validFrom) return { valid: false, error: 'Promo code is not yet active.' };
    if (p.validTo && T > p.validTo) return { valid: false, error: 'Promo code has expired.' };
    if (p.limit && p.used >= p.limit) return { valid: false, error: 'Promo code usage limit has been reached.' };

    if (context.scope && p.appliesTo !== 'both' && p.appliesTo !== context.scope && p.appliesTo !== 'credit') {
      return { valid: false, error: \`Promo applies to \${p.appliesTo} only.\` };
    }

    if (p.minNights && context.nights && Number(context.nights) < p.minNights) {
      return { valid: false, error: \`Requires a minimum stay of \${p.minNights} nights.\` };
    }

    if (p.minSpend && context.spend && Number(context.spend) < p.minSpend) {
      return { valid: false, error: \`Requires a minimum spend of \${peso(p.minSpend)}.\` };
    }

    return { valid: true, promo: p };
  },
  incrementPromo(code) {
    const list = this.getPromos();
    const p = list.find(x => x.code.toUpperCase() === String(code).trim().toUpperCase());
    if (p) {
      p.used = (p.used || 0) + 1;
      p.usedCount = p.used;
      this.savePromos(list);
    }
  },

  // ─── Restaurant (Menu, Tables, Orders, Bookings) ───
  getMenu() {
    return store.get('menu', []);
  },
  saveMenu(list) {
    store.set('menu', list);
  },
  getTables() {
    const list = store.get('tables', []);
    return list.map(t => ({
      ...t,
      num: Number(t.num || t.name.replace(/\\D/g, '') || 1),
      status: t.status || t.st || 'Free',
      st: t.status || t.st || 'Free'
    }));
  },
  saveTables(list) {
    const normalized = list.map(t => ({
      ...t,
      num: Number(t.num || t.name.replace(/\\D/g, '') || 1),
      status: t.status || t.st || 'Free',
      st: t.status || t.st || 'Free'
    }));
    store.set('tables', normalized);
  },
  getTableRes() {
    const list = store.get('tableRes', []);
    return list.map(t => ({
      ...t,
      guest: t.guest || t.guestName || '',
      guestName: t.guestName || t.guest || '',
      party: Number(t.party ?? t.partySize ?? 2),
      partySize: Number(t.partySize ?? t.party ?? 2),
      table: Number(t.table ?? t.tableNum ?? 0),
      tableNum: Number(t.tableNum ?? t.table ?? 0)
    }));
  },
  saveTableRes(list) {
    const normalized = list.map(t => ({
      ...t,
      guest: t.guest || t.guestName || '',
      guestName: t.guestName || t.guest || '',
      party: Number(t.party ?? t.partySize ?? 2),
      partySize: Number(t.partySize ?? t.party ?? 2),
      table: Number(t.table ?? t.tableNum ?? 0),
      tableNum: Number(t.tableNum ?? t.table ?? 0)
    }));
    store.set('tableRes', normalized);
  },
  createTableRes(data) {
    const list = this.getTableRes();
    const code = this.nextId('TBL-');
    const guestName = (data.guestName || data.guest || '').trim();
    const party = Number(data.partySize || data.party || 2);
    const tableNum = Number(data.tableNum || data.table || 0);

    const item = {
      code,
      guestName,
      guest: guestName,
      phone: (data.phone || '').trim(),
      date: data.date,
      time: data.time,
      partySize: party,
      party,
      tableNum,
      table: tableNum,
      tableId: data.tableId || (tableNum ? 'TBL-' + tableNum : ''),
      status: 'Pending',
      notes: data.notes || '',
      created: nowISO()
    };
    list.unshift(item);
    this.saveTableRes(list);
    this.audit('Reserved dining table', 'TableReservation', code, \`\${guestName} (\${party} guests)\`);
    return item;
  },

  getOrders() {
    const list = store.get('orders', []);
    return list.map(o => ({
      ...o,
      subtotal: Number(o.subtotal || 0),
      room: o.room ?? (o.target && o.target.startsWith('Room') ? Number(o.target.replace(/\\D/g, '')) : ''),
      table: o.table ?? (o.target && o.target.startsWith('Table') ? Number(o.target.replace(/\\D/g, '')) : ''),
      lines: (o.lines || []).map(l => ({
        ...l,
        unitPrice: Number(l.unitPrice ?? l.price ?? 0),
        price: Number(l.price ?? l.unitPrice ?? 0),
        qty: Number(l.qty || 1)
      }))
    }));
  },
  saveOrders(list) {
    store.set('orders', list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    }
  },
  createOrder(data) {
    const list = this.getOrders();
    const code = this.nextId('ORD-');
    const lines = (data.lines || []).map(l => ({
      ...l,
      unitPrice: Number(l.unitPrice ?? l.price ?? 0),
      price: Number(l.price ?? l.unitPrice ?? 0),
      qty: Number(l.qty || 1)
    }));
    const subtotal = lines.reduce((s, l) => s + (l.qty * l.unitPrice), 0);

    const order = {
      code,
      type: data.type || 'Dine-in',
      target: data.target || 'Counter',
      room: data.room || '',
      table: data.table || '',
      resCode: data.resCode || data.linkedRes || '',
      linkedRes: data.resCode || data.linkedRes || '',
      lines,
      subtotal,
      status: 'New',
      payStatus: 'Unpaid',
      created: \`\${today()} \${nowTime()}\`,
      updated: \`\${today()} \${nowTime()}\`,
      paymentKind: 'Pending Settlement'
    };

    list.unshift(order);
    this.saveOrders(list);
    this.audit('Placed restaurant order', 'Order', code, \`\${order.type} for \${order.target}\`);
    return order;
  },
  updateOrderStatus(code, status) {
    const list = this.getOrders();
    const idx = list.findIndex(o => o.code === code);
    if (idx === -1) return null;
    list[idx].status = status;
    list[idx].updated = \`\${today()} \${nowTime()}\`;
    this.saveOrders(list);
    this.audit(\`Order \${code} status: \${status}\`, 'Order', code, \`Updated kitchen status to \${status}\`);
    return list[idx];
  },
  billOrder(code, paymentKind, meta = {}) {
    const list = this.getOrders();
    const order = list.find(o => o.code === code);
    if (!order) return { success: false, error: 'Order not found.' };

    if (paymentKind === 'room') {
      const res = this.findRes(order.resCode || order.linkedRes);
      if (!res || res.st !== 'Checked-in') {
        return { success: false, error: 'Cannot charge to room: reservation is not currently checked-in.' };
      }
      this.addCharge(res, \`Restaurant: \${order.code}\`, order.subtotal, 'Dining');
      order.payStatus = 'Room folio';
      order.paymentKind = \`Charged to \${res.c}\`;
    } else {
      const orNo = this.nextOR();
      order.payStatus = 'Paid';
      order.paymentKind = \`\${meta.method || 'Cash'} (OR: \${orNo})\`;
      meta.orNum = orNo;
    }

    order.status = 'Served';
    order.updated = \`\${today()} \${nowTime()}\`;
    this.saveOrders(list);
    this.audit(\`Billed order \${code}\`, 'Order', code, \`Method: \${paymentKind}\`);
    return { success: true, orNum: meta.orNum || '', order };
  },

  // ─── Messages & Concierge Threads ───
  getThreads() {
    const list = store.get('threads', []);
    return list.map(t => ({
      ...t,
      guest: t.guest || t.guestName || '',
      guestName: t.guestName || t.guest || '',
      updatedAt: t.updatedAt || t.updated || ''
    }));
  },
  saveThreads(list) {
    store.set('threads', list);
  },
  createThread(subject, guestName, messageText, resCode = '', contact = '') {
    const list = this.getThreads();
    const id = this.nextId('MSG-');
    const gn = String(guestName || 'Website Visitor').trim();
    const newThread = {
      id,
      guestName: gn,
      guest: gn,
      contact: String(contact || '').trim(),
      resCode: String(resCode || '').trim(),
      subject: String(subject || 'General Inquiry').trim(),
      status: 'Open',
      unreadStaff: 1,
      unreadGuest: 0,
      updated: \`\${today()} \${nowTime()}\`,
      updatedAt: \`\${today()} \${nowTime()}\`,
      messages: [
        { sender: gn, role: 'guest', time: \`\${today()} \${nowTime()}\`, text: String(messageText).trim() }
      ]
    };
    list.unshift(newThread);
    this.saveThreads(list);
    this.audit('New guest message', 'Thread', id, subject);
    return newThread;
  },
  replyThread(threadId, senderName, text, role = 'staff') {
    const list = this.getThreads();
    const t = list.find(x => x.id === threadId);
    if (!t) return null;

    t.messages = t.messages || [];
    if (t.messages.length >= 200) t.messages.shift();

    t.messages.push({
      sender: senderName,
      role: role.toLowerCase(),
      time: \`\${today()} \${nowTime()}\`,
      text: text.trim()
    });
    t.updated = \`\${today()} \${nowTime()}\`;
    t.updatedAt = t.updated;

    if (role.toLowerCase() === 'staff') {
      t.unreadGuest = (t.unreadGuest || 0) + 1;
      t.unreadStaff = 0;
    } else {
      t.unreadStaff = (t.unreadStaff || 0) + 1;
      t.unreadGuest = 0;
    }
    this.saveThreads(list);
    return t;
  },

  // ─── Contact Inquiries ───
  getInquiries() {
    const list = store.get('inquiries', []);
    return list.map(i => ({
      ...i,
      id: i.id || i.ref || '',
      ref: i.ref || i.id || '',
      staffNotes: i.staffNotes || i.notes || '',
      notes: i.notes || i.staffNotes || '',
      assignedTo: i.assignedTo || i.assigned || '',
      assigned: i.assigned || i.assignedTo || ''
    }));
  },
  saveInquiries(list) {
    const normalized = list.map(i => ({
      ...i,
      id: i.id || i.ref || '',
      ref: i.ref || i.id || '',
      staffNotes: i.staffNotes || i.notes || '',
      notes: i.notes || i.staffNotes || '',
      assignedTo: i.assignedTo || i.assigned || '',
      assigned: i.assigned || i.assignedTo || ''
    }));
    store.set('inquiries', normalized);
  },
  createInquiry(data) {
    const list = this.getInquiries();
    const ref = this.nextId('INQ-');
    const item = {
      ref,
      id: ref,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      type: data.type,
      message: data.message.trim(),
      status: 'New',
      staffNotes: '',
      notes: '',
      assignedTo: '',
      assigned: '',
      created: \`\${today()} \${nowTime()}\`
    };
    list.unshift(item);
    this.saveInquiries(list);
    this.audit('Contact inquiry submitted', 'Inquiry', ref, \`\${item.name} (\${item.type})\`);
    return item;
  },

  // ─── Housekeeping & Maintenance Work Orders ───
  getHkRequests() {
    const list = store.get('hkReq', []);
    return list.map(req => ({
      ...req,
      room: Number(req.room),
      status: req.status || req.st || 'Open',
      st: req.status || req.st || 'Open',
      assignedTo: req.assignedTo || req.assigned || '',
      assigned: req.assignedTo || req.assigned || ''
    }));
  },
  saveHkRequests(list) {
    const normalized = list.map(req => ({
      ...req,
      room: Number(req.room),
      status: req.status || req.st || 'Open',
      st: req.status || req.st || 'Open',
      assignedTo: req.assignedTo || req.assigned || '',
      assigned: req.assignedTo || req.assigned || ''
    }));
    store.set('hkReq', normalized);
  },
  createHkRequest(roomNum, guestName, item, notes = '', resCode = '') {
    const list = this.getHkRequests();
    const id = this.nextId('HKR-');
    const req = {
      id,
      room: Number(roomNum),
      guestName: (guestName || \`Room \${roomNum}\`).trim(),
      resCode: (resCode || '').trim(),
      item: String(item).trim(),
      notes: String(notes || '').trim(),
      status: 'Open',
      st: 'Open',
      assignedTo: '',
      assigned: '',
      created: \`\${today()} \${nowTime()}\`,
      updated: \`\${today()} \${nowTime()}\`
    };
    list.unshift(req);
    this.saveHkRequests(list);
    this.audit('Guest housekeeping request', 'HousekeepingRequest', id, \`Room \${roomNum}: \${item}\`);
    return req;
  },

  createMaintenanceRequest(roomNum, issue, priority = 'Medium', outOfService = false, notes = '') {
    const list = this.getMaintenance();
    const id = this.nextId('MNT-');
    const req = {
      id,
      room: Number(roomNum),
      issue: String(issue).trim(),
      priority,
      pri: priority,
      status: 'Open',
      st: 'Open',
      assignedTo: '',
      assigned: '',
      outOfService: !!outOfService,
      oos: !!outOfService,
      notes: String(notes || '').trim(),
      created: \`\${today()} \${nowTime()}\`,
      resolved: ''
    };
    list.unshift(req);
    this.saveMaintenance(list);
    this.audit('Created maintenance request', 'Maintenance', id, \`Room \${roomNum}: \${issue}\`);
    return req;
  },

  // ─── Guest Feedback ───
  getFeedback() {
    const list = store.get('feedback', []);
    return list.map(f => ({
      ...f,
      guest: f.guest || f.guestName || '',
      guestName: f.guestName || f.guest || '',
      rating: Number(f.rating ?? f.ratingOverall ?? 5),
      ratingOverall: Number(f.ratingOverall ?? f.rating ?? 5),
      reply: f.reply || f.staffReply || '',
      staffReply: f.staffReply || f.reply || '',
      date: f.date || f.created || '',
      created: f.created || f.date || ''
    }));
  },
  saveFeedback(list) {
    store.set('feedback', list);
  },
  createFeedback(data) {
    const list = this.getFeedback();
    const id = this.nextId('FB-');
    const gName = (data.guestName || data.guest || '').trim();
    const item = {
      id,
      resCode: data.resCode || '',
      guestName: gName,
      guest: gName,
      roomType: data.roomType || '',
      ratingOverall: Number(data.ratingOverall || data.rating || 5),
      rating: Number(data.ratingOverall || data.rating || 5),
      ratingCleanliness: Number(data.ratingCleanliness || 5),
      ratingStaff: Number(data.ratingStaff || 5),
      ratingComfort: Number(data.ratingComfort || 5),
      ratingDining: Number(data.ratingDining || 5),
      ratingValue: Number(data.ratingValue || 5),
      comment: (data.comment || '').trim(),
      staffReply: '',
      reply: '',
      published: false,
      created: today(),
      date: today()
    };
    list.unshift(item);
    this.saveFeedback(list);
    this.audit('Guest feedback submitted', 'Feedback', id, \`\${gName} (\${item.ratingOverall}/5)\`);
    return item;
  },

  // ─── Loyalty Ledger & Redemptions ───
  getLoyaltyLedger() {
    return store.get('loyalty', []);
  },
  saveLoyaltyLedger(list) {
    store.set('loyalty', list);
  },
  addLoyaltyPoints(guestName, points, notes = '', ref = '') {
    const list = this.getLoyaltyLedger();
    const entry = {
      id: 'LOY-' + (100 + list.length + 1),
      guestName: guestName.trim(),
      points: Number(points),
      type: points >= 0 ? 'earn' : 'redeem',
      ref: String(ref),
      notes: notes.trim(),
      date: today()
    };
    list.unshift(entry);
    this.saveLoyaltyLedger(list);
    return entry;
  },
  getLoyaltyPoints(guestName) {
    if (!guestName) return 0;
    const gn = guestName.toLowerCase().trim();
    const ledger = this.getLoyaltyLedger();
    return ledger
      .filter(l => l.guestName.toLowerCase().trim() === gn)
      .reduce((sum, l) => sum + Number(l.points || 0), 0);
  },
  redeemLoyalty(guestName, rewardId) {
    const reward = CONFIG.loyalty.rewards.find(r => r.id === rewardId);
    if (!reward) return { success: false, error: 'Reward not found.' };

    const currentPoints = this.getLoyaltyPoints(guestName);
    if (currentPoints < reward.points) {
      return { success: false, error: \`Insufficient loyalty points. Requires \${reward.points} points; current balance is \${currentPoints}.\` };
    }

    this.addLoyaltyPoints(guestName, -reward.points, \`Redeemed: \${reward.name}\`, reward.id);
    this.audit('Loyalty redemption', 'Loyalty', reward.id, \`\${guestName} redeemed \${reward.name}\`);
    return { success: true, reward, remaining: currentPoints - reward.points };
  },
  getGuestNights(guestName) {
    if (!guestName) return 0;
    const gn = guestName.toLowerCase().trim();
    const res = this.getReservations();
    return res
      .filter(r => r.g.toLowerCase().trim() === gn && (r.st === 'Checked-out' || r.st === 'Checked-in'))
      .reduce((sum, r) => sum + this.nts(r), 0);
  },
  getGuestTier(nights) {
    const tiers = CONFIG.loyalty.tiers;
    let current = tiers[0];
    for (const t of tiers) {
      if (nights >= t.minNights) current = t;
    }
    return current;
  },

  // ─── Audit Log (Capped at 500 entries) ───
  audit(action, recordType, recordId, details = '') {
    const log = store.get('audit', []);
    const staffSession = this.getStaffSession();
    const user = staffSession ? staffSession.name : 'Guest';

    const entry = {
      id: Date.now(),
      time: \`\${today()} \${nowTime()}\`,
      user,
      action: String(action),
      recordType: String(recordType),
      type: String(recordType),
      recordId: String(recordId),
      idVal: String(recordId),
      details: String(details)
    };

    log.unshift(entry);
    if (log.length > 500) log.length = 500;
    store.set('audit', log);
  },
  getAuditLog() {
    const list = store.get('audit', []);
    return list.map(l => ({
      ...l,
      type: l.type || l.recordType,
      recordType: l.recordType || l.type,
      idVal: l.idVal || l.recordId,
      recordId: l.recordId || l.idVal
    }));
  },

  // ─── Live Dynamic Notifications (Derived Live) ───
  getNotifications() {
    const T = today();
    const items = [];

    // 1. Unread guest message threads
    this.getThreads()
      .filter(t => t.unreadStaff > 0 && t.status === 'Open')
      .forEach(t => {
        items.push({
          id: 'notif-' + t.id,
          type: 'message',
          title: \`Message from \${t.guestName}\`,
          desc: t.subject,
          url: '../management/messages.html?id=' + t.id,
          time: t.updated
        });
      });

    // 2. New contact inquiries
    this.getInquiries()
      .filter(i => i.status === 'New')
      .forEach(i => {
        items.push({
          id: 'notif-' + (i.ref || i.id),
          type: 'inquiry',
          title: \`New Inquiry: \${i.name}\`,
          desc: i.type,
          url: '../management/inquiries.html?ref=' + (i.ref || i.id),
          time: i.created
        });
      });

    // 3. Arrivals today
    this.getReservations()
      .filter(r => r.i === T && (r.st === 'Confirmed' || r.st === 'Pending'))
      .forEach(r => {
        items.push({
          id: 'notif-arr-' + r.c,
          type: 'arrival',
          title: \`Arrival Today: \${r.g}\`,
          desc: \`\${r.t} (Room \${r.n}) · \${r.p}\`,
          url: '../management/reservations.html?code=' + r.c,
          time: 'Today'
        });
      });

    // 4. Urgent dirty rooms
    const hk = this.getHK();
    Object.entries(hk).forEach(([room, h]) => {
      if (h.s !== 'Clean' && h.p === 'Urgent') {
        items.push({
          id: 'notif-hk-' + room,
          type: 'housekeeping',
          title: \`Urgent Cleaning: Room \${room}\`,
          desc: 'Needs turnover for arriving guest',
          url: '../management/housekeeping.html',
          time: 'Urgent'
        });
      }
    });

    // 5. Urgent maintenance
    this.getMaintenance()
      .filter(x => x.status === 'Open' && x.priority === 'Urgent')
      .forEach(x => {
        items.push({
          id: 'notif-m-' + x.id,
          type: 'maintenance',
          title: \`Urgent Maintenance: Room \${x.room}\`,
          desc: x.issue,
          url: '../management/maintenance.html?id=' + x.id,
          time: x.created
        });
      });

    // 6. New restaurant orders
    this.getOrders()
      .filter(o => o.status === 'New')
      .forEach(o => {
        items.push({
          id: 'notif-ord-' + o.code,
          type: 'order',
          title: \`New Order \${o.code}\`,
          desc: \`\${o.type} · \${o.target}\`,
          url: '../management/orders.html?code=' + o.code,
          time: o.created
        });
      });

    return items;
  }
};

// Global Exposure
if (typeof window !== 'undefined') {
  window.Data = Data;
}

// Auto-initialize schema on load
Data.init();
`;

fs.writeFileSync('js/data.js', dataJsContent, 'utf8');
console.log('Successfully wrote canonical data.js, length:', dataJsContent.length);
