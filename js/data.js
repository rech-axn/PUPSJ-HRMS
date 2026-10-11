/* ==========================================================================
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

const SCHEMA_VERSION = 4;

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
    { id: 1, name: 'Ruben Herwitz', email: 'ruben@pupsj.edu.ph', department: 'Management', role: 'Management', shift: 'Day', phone: '+63 917 100 0001', active: true, created: '2026-01-15' },
    { id: 2, name: 'Maria Santos', email: 'maria@pupsj.edu.ph', department: 'Front Desk', role: 'Front Desk', shift: 'Day', phone: '+63 917 100 0002', active: true, created: '2026-02-01' },
    { id: 3, name: 'John Reyes', email: 'john@pupsj.edu.ph', department: 'Front Desk', role: 'Front Desk', shift: 'Night', phone: '+63 917 100 0003', active: true, created: '2026-02-01' },
    { id: 4, name: 'Liza Gomez', email: 'liza@pupsj.edu.ph', department: 'Housekeeping', role: 'Housekeeping', shift: 'Day', phone: '+63 917 100 0004', active: true, created: '2026-03-10' },
    { id: 5, name: 'Pedro Cruz', email: 'pedro@pupsj.edu.ph', department: 'Housekeeping', role: 'Housekeeping', shift: 'Day', phone: '+63 917 100 0005', active: true, created: '2026-03-10' },
    { id: 6, name: 'Ana Bautista', email: 'ana@pupsj.edu.ph', department: 'Housekeeping', role: 'Housekeeping', shift: 'Night', phone: '+63 917 100 0006', active: true, created: '2026-04-05' },
    { id: 7, name: 'Carlo Navarro', email: 'carlo@pupsj.edu.ph', department: 'Maintenance', role: 'Maintenance', shift: 'Day', phone: '+63 917 100 0007', active: true, created: '2026-05-20' },
    { id: 8, name: 'Rechelle Cansila', email: 'restaurant@pupsj.edu.ph', department: 'Restaurant', role: 'Restaurant Receptionist', shift: 'Day', phone: '+63 917 100 0009', active: true, created: '2026-06-01' },
    { id: 9, name: 'Ben Aquino', email: 'ben@pupsj.edu.ph', department: 'Security', role: 'Security', shift: 'Night', phone: '+63 917 100 0008', active: true, created: '2026-06-01' }
  ];

  const adminAccounts = [
    {
      adminId: 'ADM-001',
      name: 'Superadmin',
      email: 'admin@pupsj.edu.ph',
      salt: 'a1f8c49e2b704d5a',
      passwordHash: 'c193ace2662d8a791ca9c6f61027af86c936bba8ec12ffe58c0c664fce34393d',
      role: 'superadmin'
    }
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
      source: 'Online',
      createdBy: null,
      idType: '',
      idNumber: '',
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
      source: 'Online',
      createdBy: null,
      idType: '',
      idNumber: '',
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
      source: 'Walk-in',
      createdBy: { id: 2, name: 'Maria Santos', role: 'Front Desk' },
      idType: "Driver's License",
      idNumber: 'N01-18-984210',
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
      source: 'Online',
      createdBy: null,
      idType: '',
      idNumber: '',
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
      source: 'Staff-assisted',
      createdBy: { id: 2, name: 'Maria Santos', role: 'Front Desk' },
      idType: 'Passport',
      idNumber: 'P8921401B',
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
      source: 'Online',
      createdBy: null,
      idType: '',
      idNumber: '',
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
      source: 'Online',
      createdBy: null,
      idType: '',
      idNumber: '',
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
      title: 'Sunset Appetizers & Beverages',
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
    { id: 'TBL-7', num: 7, name: 'Table 7', seats: 8, area: 'Private Room', status: 'Free', st: 'Free' },
    { id: 'TBL-8', num: 8, name: 'Table 8', seats: 2, area: 'Main Dining', status: 'Free', st: 'Free' },
    { id: 'TBL-9', num: 9, name: 'Table 9', seats: 4, area: 'Main Dining', status: 'Free', st: 'Free' }
  ];

  // Table Reservations
  const tableRes = [
    {
      code: 'TRS-101',
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
      created: `${T} 10:00`
    },
    {
      code: 'TRS-102',
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
      created: `${T} 11:30`
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
      created: `${T} 12:15`,
      updated: `${T} 12:45`
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
      created: `${T} 13:00`,
      updated: `${T} 13:05`
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
      created: `${T} 13:10`,
      updated: `${T} 13:10`
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
      updated: `${T} 11:20`,
      updatedAt: `${T} 11:20`,
      messages: [
        { sender: 'Liam Carter', role: 'guest', time: `${T} 11:15`, text: 'Hello, could we get two extra hypoallergenic pillows brought up to Room 305?' },
        { sender: 'Maria Santos', role: 'staff', time: `${T} 11:20`, text: 'Good morning Mr. Carter, housekeeping has been notified and will deliver them shortly.' }
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
      updated: `${T} 09:40`,
      updatedAt: `${T} 09:40`,
      messages: [
        { sender: 'Eduardo Ramos', role: 'guest', time: `${T} 09:40`, text: 'Good day. We would like to inquire if the Terrace area can host 12 guests for a private family dinner next Friday.' }
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
      created: `${T} 10:30`
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
      created: `${T} 11:15`,
      updated: `${T} 11:20`
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
      created: `${T} 08:30`,
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
    },
    {
      email: 'carlos.mendoza@example.com',
      password: 'password123',
      name: 'Carlos Mendoza',
      phone: '+63 917 000 0004',
      created: '2026-02-20'
    },
    {
      email: 'kenji.tanaka@example.com',
      password: 'password123',
      name: 'Kenji Tanaka',
      phone: '+63 917 000 0006',
      created: '2026-03-01'
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
    { id: 1, time: `${T} 08:30`, user: 'Carlo Navarro', action: 'Created maintenance request', recordType: 'Maintenance', type: 'Maintenance', recordId: 'MNT-101', idVal: 'MNT-101', details: 'Room 501 door latch' },
    { id: 2, time: `${T} 11:20`, user: 'Maria Santos', action: 'Assigned housekeeping request', recordType: 'Housekeeping', type: 'Housekeeping', recordId: 'HKR-101', idVal: 'HKR-101', details: 'Room 305 extra pillows' },
    { id: 3, time: `${T} 12:45`, user: 'Rechelle Cansila', action: 'Updated restaurant order', recordType: 'Order', type: 'Order', recordId: 'ORD-1001', idVal: 'ORD-1001', details: 'Billed to Room 305 folio' }
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
    adminAccounts,
    guestProfiles: {},
    audit,
    notifSeen: { count: 0, time: '' },
    loyalty,
    bookingHolds: [],
    paymentIntents: []
  };
};

// ─── Data Layer Manager & Migration System ───
const Data = {
  emit(entity, action, detail) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      try {
        const CustomEventCls = typeof CustomEvent !== 'undefined' ? CustomEvent : (window && window.CustomEvent);
        if (CustomEventCls) {
          window.dispatchEvent(new CustomEventCls('pupsj:data-change', {
            detail: { entity, action, detail, timestamp: Date.now() }
          }));
        }
      } catch (e) { }
    }
  },
  runExpiryJobs() {
    if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.HoldService) {
      PUPSJ_Services.HoldService.expire();
    }
    if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.ReservationService) {
      PUPSJ_Services.ReservationService.runExpiryJobs();
    }
  },
  getBusinessDate() {
    return store.get('businessDate', null);
  },
  setBusinessDate(newDate) {
    store.set('businessDate', newDate);
    this.emit('businessDate', 'update', { date: newDate });
  },
  resetBusinessDate() {
    store.remove('businessDate');
    this.emit('businessDate', 'reset', {});
  },

  // ─── Stores: Booking Holds & Payment Intents ───
  getBookingHolds() {
    return store.get('bookingHolds', []);
  },
  saveBookingHolds(list) {
    store.set('bookingHolds', list);
    this.emit('BookingHold', 'update', { count: list.length });
  },
  findHold(holdId) {
    return this.getBookingHolds().find(h => h.holdId === holdId || h.id === holdId) || null;
  },

  getPaymentIntents() {
    return store.get('paymentIntents', []);
  },
  savePaymentIntents(list) {
    store.set('paymentIntents', list);
    this.emit('PaymentIntent', 'update', { count: list.length });
  },
  findIntent(intentId) {
    return this.getPaymentIntents().find(i => i.intentId === intentId || i.id === intentId) || null;
  },

  // Initializes or migrates storage on startup (non-destructive)
  init() {
    const curSchema = store.get('schema', 0);
    const hasRes = store.get('res', null);

    if (!curSchema || !hasRes) {
      console.info('Initializing PUPSJ data schema to v' + SCHEMA_VERSION + '...');
      const fresh = generateSeeds();
      Object.entries(fresh).forEach(([k, v]) => {
        store.set(k, v);
      });
      return;
    }

    if (curSchema < SCHEMA_VERSION) {
      console.info(`Migrating PUPSJ data schema from v${curSchema} to v${SCHEMA_VERSION}...`);
      // Non-destructive migration for existing reservations
      const reservations = store.get('res', []);
      let changed = false;
      const defaultDepositPct = (typeof CONFIG !== 'undefined' && CONFIG.depositPct) ? CONFIG.depositPct : 50;

      reservations.forEach(r => {
        if (r.depositPct == null) {
          r.depositPct = defaultDepositPct;
          changed = true;
        }
        const tot = this.tot ? this.tot(r) : (r.total || (r.rt || 3200));
        if (r.depositRequired == null) {
          r.depositRequired = Math.ceil(tot * (r.depositPct / 100));
          changed = true;
        }
        const paid = (r.pay || []).filter(p => p.k !== 'Refund' && p.t !== 'Refund').reduce((s, p) => s + (Number(p.a || p.amt) || 0), 0);
        if (r.depositPaid == null) {
          r.depositPaid = paid;
          changed = true;
        }
        if (r.balanceDue == null) {
          r.balanceDue = Math.max(0, tot - paid);
          changed = true;
        }
        if (!r.confirmedBy && (r.st === 'Confirmed' || r.st === 'Checked-in' || r.st === 'Checked-out')) {
          r.confirmedBy = 'System (migration)';
          changed = true;
        }
      });
      if (changed) store.set('res', reservations);

      if (!store.get('bookingHolds', null)) store.set('bookingHolds', []);
      if (!store.get('paymentIntents', null)) store.set('paymentIntents', []);
      store.set('schema', SCHEMA_VERSION);
      console.info(`Migration to v${SCHEMA_VERSION} complete.`);
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
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    }
  },
  resetDemoData() {
    this.resetDemo();
  },

  // ─── Unique ID Generator (Collision-Free) ───
  nextId(prefix) {
    const cleanPrefix = (prefix || '').replace(/[^A-Z]/g, '');
    const counter = this.nextSequence(cleanPrefix || 'GEN', 1000);
    return (prefix || 'ID-') + counter;
  },

  nextSequence(prefix, start = 1000) {
    const seqs = store.get('_sequences', {});
    const cur = Number(seqs[prefix] || start);
    const nextVal = cur + 1;
    seqs[prefix] = nextVal;
    store.set('_sequences', seqs);
    return nextVal;
  },

  nextOR() {
    const seq = this.nextSequence('OR', 50100);
    return 'OR-' + String(seq).padStart(5, '0');
  },

  getPayments() {
    return store.get('payments', []);
  },

  savePayments(list) {
    store.set('payments', list);
    this.emit('Payment', 'save', list.length);
  },




  // ─── Room Types & Rooms ───
  getTypes() {
    const raw = store.get('types', DEFAULT_TYPES);
    return raw.map(t => ({
      ...t,
      desc: t.desc || t.description || `${t.n} accommodation with standard room comforts.`,
      description: t.desc || t.description || `${t.n} accommodation with standard room comforts.`,
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
  getRoomTypes() {
    return this.getTypes();
  },
  saveRoomTypes(types) {
    return this.saveTypes(types);
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
    return m.some(r => Number(r.room) === num && (r.status || r.st) !== 'Resolved' && (r.outOfService || r.oos));
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
      if (roomHk.s === 'Dirty') return { s: 'Dirty' };
      if (roomHk.s === 'In progress') return { s: 'In progress' };
      if (roomHk.s === 'Clean' || roomHk.s === 'Inspected') return { s: 'Available' };
      if (roomHk.s) return { s: roomHk.s };
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
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    }
  },
  saveRes(list) {
    this.saveReservations(list);
  },
  saveReservation(res) {
    if (!res || !res.c) return null;
    const list = this.getReservations();
    const idx = list.findIndex(r => r.c.toUpperCase() === String(res.c).toUpperCase());
    if (idx !== -1) {
      list[idx] = res;
    } else {
      list.unshift(res);
    }
    this.saveReservations(list);
    this.emit('Reservation', 'save', res.c);
    return res;
  },
  findRes(code) {
    if (!code) return null;
    const target = String(code).trim().toUpperCase();
    return this.getReservations().find(r => r.c.toUpperCase() === target) || null;
  },

  createReservation(data) {
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      throw new Error('Authentication required: a signed-in guest or staff session is required to create a reservation.');
    }

    // Security check: Guest session cannot spoof walk-in or createdBy
    if (!staffSession && guestSession) {
      if (data.source && data.source !== 'Online') {
        throw new Error('Unauthorized source: guest accounts cannot create Walk-in or Staff-assisted reservations.');
      }
      if (data.createdBy) {
        throw new Error('Unauthorized createdBy: guest accounts cannot specify staff createdBy credentials.');
      }
    }

    // Staff session requires source and createdBy
    let source = 'Online';
    let createdBy = null;
    let idType = data.idType || '';
    let idNumber = data.idNumber || '';

    if (staffSession) {
      source = data.source || 'Walk-in';
      createdBy = data.createdBy || {
        id: staffSession.id,
        name: staffSession.name,
        role: staffSession.role
      };
      if (source === 'Walk-in' && (!idType || !idNumber)) {
        throw new Error('Government ID verification required: Walk-in room bookings require valid ID Type and ID Number.');
      }
    }

    // Server-side guard: Online reservations require valid payment and cannot be created unpaid or by staff sessions
    if (source === 'Online') {
      if (staffSession && !data.holdId) {
        throw new Error('Staff sessions cannot create Online reservations. Use Walk-in or Staff-assisted reservation in the staff portal.');
      }
      if (!data.initialPayment && !data.holdId) {
        throw new Error('Unpaid online reservations are prohibited. Online bookings require confirmed down payment.');
      }
    }

    const res = this.getReservations();
    const code = this.nextId('HTL-');
    const guestName = (guestSession ? (guestSession.name || data.g || data.guestName) : (data.g || data.guestName || '')).trim();
    const guestEmail = (guestSession ? guestSession.email : (data.email || '')).trim();
    const guestPhone = (guestSession ? (guestSession.phone || data.ph || data.phone) : (data.ph || data.phone || '')).trim();

    if (!guestName) {
      throw new Error('Guest full name is required.');
    }
    if (!guestPhone) {
      throw new Error('Philippine mobile contact number is required.');
    }

    const roomType = data.t || data.roomType || '';
    const typeObj = this.getTypes().find(t => t.n === roomType);
    const guests = Number(data.gu || data.guests || 1);

    // Enforce room capacity in Data Layer
    if (typeObj && guests > typeObj.g) {
      throw new Error(`Party size (${guests} guests) exceeds maximum capacity for ${roomType} (max ${typeObj.g} guests).`);
    }

    // Date validation
    const ci = data.i || data.checkIn || today();
    const co = data.o || data.checkOut || addDays(ci, 1);
    if (co <= ci) {
      throw new Error('Check-out date must be after check-in date.');
    }

    const rateVal = Number(data.rt || data.rate || (typeObj ? typeObj.r : 3200));
    const nights = Math.max(1, typeof dateDiff === 'function' ? dateDiff(ci, co) : 1);
    const stayTotal = rateVal * nights;
    const depPct = data.depositPct != null ? data.depositPct : ((typeof CONFIG !== 'undefined' && CONFIG.depositPct) ? CONFIG.depositPct : 50);
    const depReq = data.depositRequired != null ? data.depositRequired : Math.ceil(stayTotal * (depPct / 100));

    const newRes = {
      c: code,
      g: guestName,
      t: roomType,
      n: Number(data.n || data.roomNum || 0),
      i: ci,
      o: co,
      gu: guests,
      ph: guestPhone,
      email: guestEmail,
      m: data.m || data.paymentMethod || 'Credit card',
      p: 'Unpaid',
      st: (source === 'Online' && (data.initialPayment || data.holdId)) ? 'Confirmed' : (data.st || 'Pending'),
      note: data.note || data.notes || '',
      rt: rateVal,
      promo: data.promo || null,
      source: source,
      createdBy: createdBy,
      idType: idType,
      idNumber: idNumber,
      guestId: guestEmail || (source === 'Walk-in' ? `WALK-${code}` : ''),
      depositPct: depPct,
      depositRequired: depReq,
      depositPaid: 0,
      balanceDue: stayTotal,
      holdId: data.holdId || '',
      paymentIntentId: data.paymentIntentId || '',
      confirmedAt: data.initialPayment ? (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()) : null,
      confirmedBy: data.initialPayment ? (data.confirmedBy || (source === 'Walk-in' ? (staffSession?.name || 'Front Desk') : 'System (payment)')) : null,
      created: today(),
      pay: [],
      x: []
    };

    // If walk-in, also register or link profile record
    if (source === 'Walk-in') {
      this.createGuestProfile({
        name: guestName,
        phone: guestPhone,
        email: guestEmail,
        source: 'Walk-in',
        idType: idType,
        idNumber: idNumber,
        notes: `Walk-in guest registered at front desk (${today()})`
      });
    }

    if (data.initialPayment) {
      const p = data.initialPayment;
      const orNum = this.nextOR();
      const pAmt = Math.round(Number(p.amount));
      newRes.depositPaid = pAmt;
      newRes.pay.push({
        id: orNum,
        or: orNum,
        d: today(),
        a: pAmt,
        amt: pAmt,
        m: p.method,
        k: p.kind || 'Deposit',
        t: p.kind || 'Deposit',
        note: p.note || (source === 'Walk-in' ? 'Walk-in front desk settlement' : `${newRes.depositPct}% down payment on booking`),
        auth: p.auth || (source === 'Walk-in' ? 'AUTH-DESK' : ''),
        ref: p.ref || '',
        cardLast4: p.cardLast4 || ''
      });
      if (data.checkInNow && ci <= today()) {
        newRes.st = 'Checked-in';
      } else {
        newRes.st = 'Confirmed';
      }
      newRes.confirmedAt = newRes.confirmedAt || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString());
      newRes.confirmedBy = newRes.confirmedBy || (source === 'Walk-in' ? (staffSession?.name || 'Front Desk') : 'System (payment)');
    }

    const calculatedTotal = this.tot ? this.tot(newRes) : stayTotal;
    newRes.balanceDue = Math.max(0, calculatedTotal - newRes.depositPaid);
    this.syncPaymentStatus(newRes);
    res.unshift(newRes);
    this.saveReservations(res);

    const actor = staffSession ? `${staffSession.name} (${staffSession.role})` : guestName;
    this.audit(`Created reservation (${source})`, 'Reservation', code, `${newRes.g} (${newRes.t}) by ${actor}`);
    return newRes;
  },
  createRes(data) {
    return this.createReservation(data);
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
    if (!r) return 1;
    const ci = r.ci || r.i;
    const co = r.co || r.o;
    if (!ci || !co) return 1;
    return Math.max(1, dateDiff(ci, co));
  },
  roomChg(r) {
    if (!r) return 0;
    const typeRate = Number(r.rt || r.rate) || (DEFAULT_TYPES.find(t => t.n === r.t) || {}).r || 3200;
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
  bal(r) { return this.balOf(r); },
  balance(r) { return this.balOf(r); },
  depAmt(r) {
    if (!r) return 0;
    if (r.depositRequired != null) return r.depositRequired;
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : { depositPct: 50 };
    const pct = r.depositPct || cfg.depositPct || 50;
    const tot = this.tot ? this.tot(r) : (r.total || (r.rt || 3200));
    return Math.ceil(tot * (pct / 100));
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
    this.audit(`Payment ${entry.id}`, 'Payment', r.c, `${peso(amount)} via ${method} (${kind})`);
    return entry;
  },

  // Polymorphic Charge Handler (accepts code string or reservation object)
  addFolioCharge(codeOrObj, descOrOpts, amount, cat) {
    if (typeof descOrOpts === 'object' && descOrOpts !== null) {
      return this.addCharge(codeOrObj, descOrOpts.desc || descOrOpts.description, descOrOpts.amt || descOrOpts.amount, descOrOpts.cat || descOrOpts.category);
    }
    return this.addCharge(codeOrObj, descOrOpts, amount, cat);
  },

  addCharge(codeOrObj, desc, amount, cat = 'Incidentals') {
    let r = typeof codeOrObj === 'string' ? this.findRes(codeOrObj) : codeOrObj;
    if (!r) throw new Error('Reservation not found: ' + codeOrObj);

    r.x = r.x || [];
    const entry = {
      id: this.nextId('AUD-'),
      d: today(),
      desc: String(desc).trim(),
      amt: Math.round(Number(amount)),
      cat: cat || 'Incidentals'
    };
    r.x.push(entry);
    this.syncPaymentStatus(r);
    this.updateReservation(r.c, r);
    this.audit('Added charge', 'Folio', r.c, `${desc} (${peso(amount)})`);
    return entry;
  },

  // Check-In Domain Rule: date <= today, room is clean, deposit paid
  checkIn(code, assignedRoomNum) {
    const r = this.findRes(code);
    if (!r) return { success: false, error: 'Reservation not found.' };

    if (assignedRoomNum) {
      r.n = Number(assignedRoomNum);
    }
    if (!r.n) {
      return { success: false, error: 'No room assigned to this reservation.' };
    }

    const T = today();
    if (r.i > T) {
      return { success: false, error: `Cannot check in early. Scheduled arrival date is ${r.i}.` };
    }
    if (!this.isRoomClean(r.n)) {
      return { success: false, error: `Cannot check in: Room ${r.n} is currently marked Dirty or undergoing cleaning.` };
    }
    const reqDep = r.depositRequired != null ? r.depositRequired : this.depAmt(r);
    if (this.paidAmt(r) < reqDep) {
      return { success: false, error: `Cannot check in: Required deposit (${peso(reqDep)}) has not been settled.` };
    }

    r.st = 'Checked-in';
    this.updateReservation(r.c, r);
    this.audit('Check-in', 'Reservation', r.c, `Guest ${r.g} checked into Room ${r.n}`);
    return { success: true, res: r };
  },

  // Check-Out Domain Rule: mark Checked-out, mark room Dirty in HK, award loyalty points
  checkOut(code, overrideReason = '') {
    const r = this.findRes(code);
    if (!r) return { success: false, error: 'Reservation not found.' };

    const bal = this.balance ? this.balance(r) : 0;
    if (bal > 0 && !overrideReason) {
      return { success: false, error: `Cannot check out with outstanding balance of ₱${bal.toLocaleString()}. Settle folio first.`, balance: bal };
    }

    r.st = 'Checked-out';
    this.updateReservation(r.c, r);
    this.setRoomHK(r.n, { s: 'Dirty', p: 'Urgent' });

    // Award loyalty points on stay completion
    const pointsEarned = Math.floor(this.tot(r) / 100) * CONFIG.loyalty.earnRate;
    if (pointsEarned > 0) {
      this.addLoyaltyPoints(r.g, pointsEarned, 'Completed stay settlement', r.c);
    }

    this.audit('Check-out', 'Reservation', r.c, `Guest ${r.g} checked out. Room ${r.n} marked Dirty.`);
    return { success: true, res: r };
  },

  // Cancellation Policy Rule: >= 3 days free cancel, < 3 days retain 1st night
  cancelReservation(code, by = 'staff') {
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      return { success: false, error: 'Authentication required to cancel a reservation.' };
    }

    const r = this.findRes(code);
    if (!r) return { success: false, error: 'Reservation not found.' };

    // Guest ownership check
    if (guestSession && !staffSession) {
      const guestEmail = (guestSession.email || '').toLowerCase().trim();
      if (!r.email || r.email.toLowerCase().trim() !== guestEmail) {
        return { success: false, error: 'Unauthorized: you can only cancel reservations linked to your own account.' };
      }
    }

    if (r.st === 'Checked-in' || r.s === 'Checked-in') {
      return { success: false, error: 'Checked-in stays cannot be cancelled. Use early check-out instead.' };
    }
    if (r.st === 'Cancelled' || r.s === 'Cancelled') {
      return { success: false, error: 'Reservation is already cancelled.' };
    }

    const T = today();
    const daysUntilArrival = dateDiff(T, r.i);
    const totalPaid = (r.pay || []).filter(p => p.k !== 'Refund' && p.t !== 'Refund').reduce((s, p) => s + (Number(p.a || p.amt) || 0), 0);
    const priorRefunds = (r.pay || []).filter(p => p.k === 'Refund' || p.t === 'Refund').reduce((s, p) => s + (Number(p.a || p.amt) || 0), 0);
    const paid = Math.max(0, totalPaid - priorRefunds);
    let refundAmt = 0;
    let retainedFee = 0;

    const freeDays = (typeof CONFIG !== 'undefined' && CONFIG.freeCancelDays != null) ? CONFIG.freeCancelDays : 3;
    const feePct = (typeof CONFIG !== 'undefined' && CONFIG.lateCancelFeePct != null) ? CONFIG.lateCancelFeePct : 30;

    if (daysUntilArrival >= freeDays) {
      refundAmt = paid;
      retainedFee = 0;
    } else {
      retainedFee = Math.round(paid * (feePct / 100) * 100) / 100;
      refundAmt = Math.max(0, Math.round((paid - retainedFee) * 100) / 100);
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
        note: daysUntilArrival >= freeDays ? 'Full policy refund' : `Late cancellation policy refund less ${feePct}% fee`,
        auth: 'REF-CANCEL',
        ref: r.c
      });
    }

    r.st = 'Cancelled';
    r.s = 'Cancelled';
    this.syncPaymentStatus(r);
    this.updateReservation(r.c, r);
    this.audit('Cancellation', 'Reservation', r.c, `Cancelled by ${by}. Retained: ${peso(retainedFee)}, Refunded: ${peso(refundAmt)}`);
    return { success: true, refundAmt, retainedFee, fee: retainedFee, res: r };
  },

  // Claim Walk-in / Staff-assisted Booking into a Guest Portal Account
  claimWalkInReservation(code, lastNameOrPhone, guestEmail) {
    if (!code || !lastNameOrPhone || !guestEmail) {
      return { success: false, error: 'Booking code, verification credential (last name or phone), and guest email are required.' };
    }
    const r = this.findRes(code);
    if (!r) {
      return { success: false, error: 'Reservation not found with reference code ' + code };
    }

    const verifyTerm = String(lastNameOrPhone).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const resNameClean = (r.g || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const resPhoneClean = String(r.ph || '').replace(/[^0-9]/g, '');
    const resLastName = (r.g || '').trim().split(/\s+/).pop().toLowerCase().replace(/[^a-z0-9]/g, '');

    const phoneMatch = verifyTerm.length >= 7 && resPhoneClean.includes(verifyTerm);
    const nameMatch = verifyTerm.length >= 2 && (resLastName === verifyTerm || resNameClean.includes(verifyTerm));

    if (!phoneMatch && !nameMatch) {
      return { success: false, error: 'Verification failed: the last name or phone number does not match this reservation.' };
    }

    r.email = guestEmail.trim().toLowerCase();
    r.claimedAt = today();
    r.claimedBy = guestEmail.trim().toLowerCase();
    this.updateReservation(r.c, r);

    this.createGuestProfile({
      name: r.g,
      email: r.email,
      phone: r.ph,
      notes: `Claimed walk-in booking ${r.c} on ${today()}`
    });

    this.audit('Claimed reservation', 'Reservation', r.c, `Walk-in booking claimed by ${guestEmail}`);
    return { success: true, res: r };
  },

  // ─── Staff & Guest Profiles ───
  getStaff() {
    const list = store.get('staff', []);
    return list.map(s => {
      if (s.id === 8 || s.email === 'restaurant@pupsj.edu.ph' || s.email === 'kitchen@pupsj.edu.ph' || (s.name && s.name.includes('Marco Valdez'))) {
        return { ...s, name: 'Rechelle Cansila', email: 'restaurant@pupsj.edu.ph', department: 'Restaurant', role: 'Restaurant Receptionist' };
      }
      return s;
    });
  },
  saveStaff(list) {
    store.set('staff', list);
  },
  getAdminAccounts() {
    return store.get('adminAccounts', []);
  },
  saveAdminAccounts(list) {
    store.set('adminAccounts', list);
  },
  findStaffByEmail(email) {
    if (!email) return null;
    const em = email.trim().toLowerCase();
    const staffMatch = this.getStaff().find(s => s.email && s.email.toLowerCase() === em);
    if (staffMatch) return staffMatch;
    const adminAccounts = this.getAdminAccounts();
    const adminMatch = adminAccounts.find(a => a.email && a.email.toLowerCase() === em);
    if (adminMatch) return adminMatch;
    if (em === 'admin@pupsj.edu.ph') {
      return { id: 0, adminId: 'ADM-001', name: 'Superadmin', email: 'admin@pupsj.edu.ph', role: 'superadmin' };
    }
    if (em === 'hotel@pupsj.edu.ph') {
      return { id: 2, name: 'Hotel Receptionist', email: 'hotel@pupsj.edu.ph', role: 'hotel_receptionist' };
    }
    if (em === 'restaurant@pupsj.edu.ph') {
      return { id: 8, name: 'Rechelle Cansila', email: 'restaurant@pupsj.edu.ph', role: 'restaurant_receptionist' };
    }
    return null;
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

  createGuestProfile(data) {
    const accounts = this.getGuestAccounts();
    const name = (data.name || '').trim();
    if (!name) return { success: false, error: 'Guest name is required.' };
    const email = (data.email || '').trim().toLowerCase();
    const phone = (data.phone || '').trim();
    const existing = accounts.find(a => a.name.toLowerCase() === name.toLowerCase() || (email && a.email.toLowerCase() === email));
    if (existing) {
      if (phone) existing.phone = phone;
      if (email) existing.email = email;
      if (data.notes !== undefined) existing.notes = data.notes;
      if (data.preferences !== undefined) existing.preferences = data.preferences;
      this.saveGuestAccounts(accounts);
      this.audit('Updated guest profile', 'GuestProfile', name, `Updated details for ${name}`);
      return { success: true, profile: existing };
    }
    const newAcc = {
      name,
      email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@guest.local`,
      phone,
      notes: data.notes || '',
      preferences: data.preferences || '',
      created: today()
    };
    accounts.unshift(newAcc);
    this.saveGuestAccounts(accounts);
    if (data.initialPoints) {
      this.addLoyaltyPoints(name, Number(data.initialPoints), 'Registration Welcome Bonus');
    }
    this.audit('Created guest profile', 'GuestProfile', name, `Registered ${name} in CRM`);
    return { success: true, profile: newAcc };
  },

  saveGuest(data) {
    if (!data) return null;
    const name = (data.name || '').trim();
    if (!name) return { success: false, error: 'Guest name is required.' };
    const accounts = this.getGuestAccounts();
    const existing = accounts.find(a => (a.name && a.name.toLowerCase() === name.toLowerCase()) || (data.email && a.email && a.email.toLowerCase() === data.email.trim().toLowerCase()));
    if (existing) {
      if (data.name) existing.name = data.name.trim();
      if (data.phone) existing.phone = data.phone.trim();
      if (data.email) existing.email = data.email.trim();
      if (data.address !== undefined) existing.address = data.address;
      if (data.notes !== undefined) existing.notes = data.notes;
      if (data.preferences !== undefined) existing.preferences = data.preferences;
      this.saveGuestAccounts(accounts);
      this.audit('Saved guest profile', 'GuestProfile', existing.name, 'Updated guest details in CRM');
      return { success: true, profile: existing };
    }
    return this.createGuestProfile(data);
  },

  updateGuestProfile(originalName, updates) {
    const accounts = this.getGuestAccounts();
    const acc = accounts.find(a => a.name.toLowerCase() === originalName.toLowerCase());
    if (acc) {
      if (updates.name) acc.name = updates.name.trim();
      if (updates.phone) acc.phone = updates.phone.trim();
      if (updates.email) acc.email = updates.email.trim();
      if (updates.notes !== undefined) acc.notes = updates.notes;
      if (updates.preferences !== undefined) acc.preferences = updates.preferences;
      this.saveGuestAccounts(accounts);
    }
    this.audit('Updated guest profile', 'GuestProfile', originalName, `Modified contact details and notes`);
    return { success: true };
  },

  deleteGuestProfile(name) {
    const accounts = this.getGuestAccounts().filter(a => a.name.toLowerCase() !== name.toLowerCase());
    this.saveGuestAccounts(accounts);
    this.audit('Deleted guest profile', 'GuestProfile', name, `Removed from registered accounts`);
    return { success: true };
  },

  // ─── Session Management (Isolated Per-Tab via sessionStorage with store fallback) ───
  getStaffSession() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const val = sessionStorage.getItem('pupsj_sessionStaff');
        if (val) {
          const u = JSON.parse(val);
          if (u && (u.role === 'restaurant_receptionist' || u.email === 'restaurant@pupsj.edu.ph' || (u.name && u.name.includes('Marco Valdez')))) {
            if (u.name !== 'Rechelle Cansila') {
              u.name = 'Rechelle Cansila';
              sessionStorage.setItem('pupsj_sessionStaff', JSON.stringify(u));
            }
          }
          return u;
        }
        // If guest session active in this tab, do not fall back to staff session
        if (sessionStorage.getItem('pupsj_sessionGuest')) {
          return null;
        }
      }
    } catch (e) { }
    // Fallback: Check store for active cross-tab session
    try {
      const persisted = store.get('sessionStaff', null);
      if (persisted && typeof persisted === 'object') {
        if (persisted.role === 'restaurant_receptionist' || persisted.email === 'restaurant@pupsj.edu.ph' || (persisted.name && persisted.name.includes('Marco Valdez'))) {
          persisted.name = 'Rechelle Cansila';
        }
        return persisted;
      }
    } catch (e) { }
    return null;
  },
  setStaffSession(user) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('pupsj_sessionStaff', JSON.stringify(user));
        sessionStorage.removeItem('pupsj_sessionGuest');
      }
    } catch (e) { }
    store.remove('sessionGuest');
    store.set('sessionStaff', user);
  },
  clearStaffSession() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('pupsj_sessionStaff');
      }
    } catch (e) { }
    store.remove('sessionStaff');
  },

  getGuestSession() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const val = sessionStorage.getItem('pupsj_sessionGuest');
        if (val) return JSON.parse(val);
      }
    } catch (e) { }
    return null;
  },
  setGuestSession(guest) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('pupsj_sessionGuest', JSON.stringify(guest));
        sessionStorage.removeItem('pupsj_sessionStaff');
      }
    } catch (e) { }
    store.remove('sessionStaff');
    store.remove('sessionGuest');
  },
  clearGuestSession() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('pupsj_sessionGuest');
      }
    } catch (e) { }
    store.remove('sessionGuest');
    if (typeof window !== 'undefined' && typeof window.clearPendingIntent === 'function') {
      window.clearPendingIntent();
    }
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

    const scope = context.scope || context.type;
    if (scope && p.appliesTo !== 'both' && p.appliesTo !== scope && p.appliesTo !== 'credit') {
      return { valid: false, error: `Promo applies to ${p.appliesTo} only.` };
    }

    if (p.minNights && context.nights && Number(context.nights) < p.minNights) {
      return { valid: false, error: `Requires a minimum stay of ${p.minNights} nights.` };
    }

    if (p.minSpend && context.spend && Number(context.spend) < p.minSpend) {
      return { valid: false, error: `Requires a minimum spend of ${peso(p.minSpend)}.` };
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
      num: Number(t.num || t.name.replace(/\D/g, '') || 1),
      status: t.status || t.st || 'Free',
      st: t.status || t.st || 'Free'
    }));
  },
  saveTables(list) {
    const normalized = list.map(t => ({
      ...t,
      num: Number(t.num || t.name.replace(/\D/g, '') || 1),
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
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      throw new Error('Authentication required: a signed-in guest or staff session is required to reserve a dining table.');
    }

    if (guestSession) {
      if (data.source && data.source !== 'Online') {
        throw new Error('Unauthorized source: guest accounts cannot set walk-in table reservations.');
      }
      if (data.createdBy) {
        throw new Error('Unauthorized createdBy: guest accounts cannot specify staff credentials.');
      }
    }

    const guestName = (guestSession ? (guestSession.name || data.guestName || data.guest) : (data.guestName || data.guest || '')).trim();
    const phone = (guestSession ? (guestSession.phone || data.phone) : (data.phone || '')).trim();
    const email = guestSession ? guestSession.email : (data.email || '').trim();

    if (!guestName) {
      throw new Error('Guest full name is required for dining table reservation.');
    }
    if (!phone) {
      throw new Error('Contact phone number is required.');
    }

    const party = Number(data.partySize || data.party || 2);
    const date = data.date || today();
    const time = data.time || '18:00';

    // Operating hours check (06:00 to 22:00)
    const [hh, mm] = time.split(':').map(Number);
    const timeMins = (hh || 0) * 60 + (mm || 0);
    if (timeMins < 6 * 60 || timeMins > 22 * 60) {
      throw new Error('Restaurant operating hours are 6:00 AM to 10:00 PM. Please select a time within this window.');
    }

    // Dynamic table assignment: 90-minute slot collision check
    const tables = this.getTables();
    const existingTableRes = this.getTableRes().filter(t => t.date === date && t.status !== 'Cancelled' && t.status !== 'Completed' && t.status !== 'No-show');

    const eligibleTables = tables
      .filter(tbl => tbl.seats >= party)
      .sort((a, b) => a.seats - b.seats);

    let assignedTable = null;
    for (const tbl of eligibleTables) {
      const conflict = existingTableRes.some(t => {
        if (Number(t.tableNum) !== Number(tbl.num)) return false;
        const [th, tm] = (t.time || '12:00').split(':').map(Number);
        const tMins = (th || 0) * 60 + (tm || 0);
        return Math.abs(tMins - timeMins) < 90;
      });
      if (!conflict) {
        assignedTable = tbl;
        break;
      }
    }

    if (!assignedTable && !data.allowWaitlist && eligibleTables.length > 0) {
      throw new Error(`No tables for ${party} guests available at ${time} on ${fmtDate(date)}. All suitable tables are reserved within this 90-minute dining window.`);
    }

    const list = this.getTableRes();
    const code = this.nextId('TRS-');
    const tableNum = assignedTable ? assignedTable.num : Number(data.tableNum || (eligibleTables[0] ? eligibleTables[0].num : 1));
    const tableId = assignedTable ? assignedTable.id : (tableNum ? 'TBL-' + tableNum : '');

    const item = {
      code,
      guestName,
      guest: guestName,
      phone,
      email,
      date,
      time,
      partySize: party,
      party,
      tableNum,
      table: tableNum,
      tableId,
      status: staffSession ? 'Confirmed' : 'Pending',
      notes: data.notes || '',
      promo: data.promo || null,
      source: staffSession ? (data.source || 'Walk-in') : 'Online',
      createdBy: staffSession ? (data.createdBy || { id: staffSession.id, name: staffSession.name, role: staffSession.role }) : null,
      created: `${today()} ${nowTime()}`
    };

    list.unshift(item);
    this.saveTableRes(list);

    // Increment promo usage ONLY AFTER table reservation is successfully saved
    if (data.promo && data.promo.code) {
      this.incrementPromo(data.promo.code);
    }

    const actor = staffSession ? `${staffSession.name} (${staffSession.role})` : guestName;
    this.audit('Reserved dining table', 'TableReservation', code, `${guestName} (${party} guests, Table ${tableNum}) by ${actor}`);
    return item;
  },

  getOrders() {
    const list = store.get('orders', []);
    return list.map(o => ({
      ...o,
      subtotal: Number(o.subtotal || 0),
      room: o.room ?? (o.target && o.target.startsWith('Room') ? Number(o.target.replace(/\D/g, '')) : ''),
      table: o.table ?? (o.target && o.target.startsWith('Table') ? Number(o.target.replace(/\D/g, '')) : ''),
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
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    }
  },
  createOrder(data) {
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      throw new Error('Authentication required: a signed-in guest or staff session is required to place an order.');
    }

    if (!staffSession && guestSession) {
      if (data.source && data.source !== 'Online') {
        throw new Error('Unauthorized source: guest accounts cannot set walk-in orders.');
      }
      if (data.createdBy) {
        throw new Error('Unauthorized createdBy: guest accounts cannot specify staff credentials.');
      }
      // For guest in-room dining orders: require checked-in reservation
      if (data.type === 'In-room') {
        const reservations = this.getReservations();
        const activeStay = reservations.find(r =>
          (r.email.toLowerCase() === guestSession.email.toLowerCase() || (data.resCode && r.c === data.resCode)) &&
          r.st === 'Checked-in'
        );
        if (!activeStay) {
          throw new Error('In-room dining is exclusively available to guests with an active Checked-in stay.');
        }
        data.room = activeStay.n;
        data.target = `Room ${activeStay.n}`;
        data.resCode = activeStay.c;
        data.linkedRes = activeStay.c;
      }
    }

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
      target: data.target || (data.room ? `Room ${data.room}` : data.table ? `Table ${data.table}` : 'Counter'),
      room: data.room || '',
      table: data.table || '',
      resCode: data.resCode || data.linkedRes || '',
      linkedRes: data.resCode || data.linkedRes || '',
      lines,
      subtotal,
      status: 'New',
      payStatus: 'Unpaid',
      source: staffSession ? (data.source || 'Walk-in') : 'Online',
      createdBy: staffSession ? (data.createdBy || { id: staffSession.id, name: staffSession.name, role: staffSession.role }) : null,
      guestEmail: guestSession ? guestSession.email : (data.guestEmail || ''),
      created: `${today()} ${nowTime()}`,
      updated: `${today()} ${nowTime()}`,
      paymentKind: 'Pending Settlement'
    };

    list.unshift(order);
    this.saveOrders(list);
    const actor = staffSession ? `${staffSession.name} (${staffSession.role})` : (guestSession ? guestSession.name : 'Guest');
    this.audit('Placed restaurant order', 'Order', code, `${order.type} for ${order.target} by ${actor}`);
    return order;
  },
  updateOrderStatus(code, status) {
    const list = this.getOrders();
    const idx = list.findIndex(o => o.code === code);
    if (idx === -1) return null;
    list[idx].status = status;
    list[idx].updated = `${today()} ${nowTime()}`;
    this.saveOrders(list);
    this.audit(`Order ${code} status: ${status}`, 'Order', code, `Updated kitchen status to ${status}`);
    return list[idx];
  },
  billOrder(code, paymentKind, meta = {}) {
    const list = this.getOrders();
    const order = list.find(o => o.code === code);
    if (!order) return { success: false, error: 'Order not found.' };

    let method = 'Cash';
    if (typeof paymentKind === 'object' && paymentKind !== null) {
      meta = { ...paymentKind, ...meta };
      paymentKind = meta.method || 'Cash';
      method = meta.method || 'Cash';
    } else if (typeof paymentKind === 'string') {
      method = meta.method || paymentKind;
    }

    if (paymentKind === 'room' || paymentKind === 'Room folio' || paymentKind === 'Room Charge') {
      const res = this.findRes(order.resCode || order.linkedRes || meta.resCode);
      if (!res || res.st !== 'Checked-in') {
        return { success: false, error: 'Cannot charge to room: reservation is not currently checked-in.' };
      }
      this.addCharge(res, `Restaurant: ${order.code}`, order.subtotal, 'Dining');
      order.payStatus = 'Room folio';
      order.paymentKind = `Charged to ${res.c}`;
      order.linkedRes = res.c;
      order.resCode = res.c;
    } else {
      const orNo = this.nextOR();
      order.payStatus = 'Paid';
      order.paymentKind = `${method} (OR: ${orNo})`;
      meta.orNum = orNo;

      // Record in unified payments ledger
      const payments = this.getPayments();
      payments.push({
        orNo,
        or: orNo,
        id: orNo,
        date: today(),
        time: nowTime(),
        timestamp: Date.now(),
        kind: 'Payment',
        method: method,
        amount: Number(meta.amount != null ? meta.amount : (order.subtotal || 0)),
        refType: 'Order',
        refId: order.code,
        authRef: meta.ref || `POS-${order.code}`,
        cashier: (this.getStaffSession() && this.getStaffSession().name) || 'Cashier',
        status: 'Completed'
      });
      this.savePayments(payments);
    }

    // When a Dine-in order is settled, transition table to Needs cleaning
    if (order.type === 'Dine-in' && (order.table || order.tableNo)) {
      const tNum = order.table || order.tableNo;
      const tables = this.getTables();
      const t = tables.find(x => x.num === tNum || x.id === tNum);
      if (t) {
        t.st = 'Needs cleaning';
        t.status = 'Needs cleaning';
        this.saveTables(tables);
      }
    }

    order.updated = `${today()} ${nowTime()}`;
    this.saveOrders(list);
    this.audit(`Billed order ${code}`, 'Order', code, `Method: ${method || paymentKind}, OR: ${meta.orNum || 'FOLIO'}`);
    this.emit('Order', 'bill', code);
    return { success: true, orNum: meta.orNum || '', order };
  },

  cancelOrder(code, reason = 'Customer request / void') {
    const list = this.getOrders();
    const idx = list.findIndex(o => o.code === code);
    if (idx === -1) return { success: false, error: 'Order not found.' };
    list[idx].status = 'Cancelled';
    list[idx].payStatus = 'Cancelled';
    list[idx].notes = (list[idx].notes ? list[idx].notes + ' | ' : '') + `[Cancelled: ${reason}]`;
    list[idx].updated = `${today()} ${nowTime()}`;
    this.saveOrders(list);
    this.audit(`Voided order ${code}`, 'Order', code, `Reason: ${reason}`);
    return { success: true, order: list[idx] };
  },

  addItemsToOrder(code, additionalLines) {
    const list = this.getOrders();
    const order = list.find(o => o.code === code);
    if (!order) return { success: false, error: 'Order not found.' };
    order.lines = order.lines || [];
    additionalLines.forEach(l => {
      const existing = order.lines.find(x => x.id === l.id);
      if (existing) {
        existing.qty += Number(l.qty || 1);
      } else {
        order.lines.push({
          id: l.id,
          name: l.name,
          qty: Number(l.qty || 1),
          unitPrice: Number(l.unitPrice || l.price || 0),
          price: Number(l.unitPrice || l.price || 0),
          note: l.note || ''
        });
      }
    });
    order.subtotal = order.lines.reduce((s, l) => s + (l.qty * (l.unitPrice || l.price || 0)), 0);
    order.updated = `${today()} ${nowTime()}`;
    this.saveOrders(list);
    this.audit(`Added items to order ${code}`, 'Order', code, `New subtotal: ${peso(order.subtotal)}`);
    return { success: true, order };
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
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      throw new Error('Authentication required: sign in is required to send concierge messages.');
    }

    const list = this.getThreads();
    const id = this.nextId('MSG-');
    const gn = (guestSession ? (guestSession.name || guestName) : (guestName || 'Website Visitor')).trim();
    const email = guestSession ? guestSession.email : (contact || '').trim();

    const newThread = {
      id,
      guestName: gn,
      guest: gn,
      guestEmail: email,
      contact: email || String(contact || '').trim(),
      resCode: String(resCode || '').trim(),
      subject: String(subject || 'General Inquiry').trim(),
      status: 'Open',
      unreadStaff: 1,
      unreadGuest: 0,
      updated: `${today()} ${nowTime()}`,
      updatedAt: `${today()} ${nowTime()}`,
      messages: [
        { sender: gn, role: 'guest', time: `${today()} ${nowTime()}`, text: String(messageText).trim() }
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
      time: `${today()} ${nowTime()}`,
      text: text.trim()
    });
    t.updated = `${today()} ${nowTime()}`;
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
      created: `${today()} ${nowTime()}`
    };
    list.unshift(item);
    this.saveInquiries(list);
    this.audit('Contact inquiry submitted', 'Inquiry', ref, `${item.name} (${item.type})`);
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
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      throw new Error('Authentication required: a signed-in guest or staff session is required to request housekeeping.');
    }

    const list = this.getHkRequests();
    const id = this.nextId('HKR-');
    const gName = (guestSession ? (guestSession.name || guestName) : (guestName || `Room ${roomNum}`)).trim();
    const req = {
      id,
      room: Number(roomNum),
      guestName: gName,
      guestEmail: guestSession ? guestSession.email : '',
      resCode: (resCode || '').trim(),
      item: String(item).trim(),
      notes: String(notes || '').trim(),
      status: 'Open',
      st: 'Open',
      assignedTo: '',
      assigned: '',
      source: staffSession ? 'Staff' : 'Guest Portal',
      createdBy: staffSession ? { id: staffSession.id, name: staffSession.name, role: staffSession.role } : null,
      created: `${today()} ${nowTime()}`,
      updated: `${today()} ${nowTime()}`
    };
    list.unshift(req);
    this.saveHkRequests(list);
    this.audit('Guest housekeeping request', 'HousekeepingRequest', id, `Room ${roomNum}: ${item}`);
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
      created: `${today()} ${nowTime()}`,
      resolved: ''
    };
    list.unshift(req);
    this.saveMaintenance(list);
    this.audit('Created maintenance request', 'Maintenance', id, `Room ${roomNum}: ${issue}`);
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
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      throw new Error('Authentication required: a signed-in guest account is required to submit feedback.');
    }

    const list = this.getFeedback();
    const id = this.nextId('FB-');
    const gName = (guestSession ? (guestSession.name || data.guestName || data.guest) : (data.guestName || data.guest || '')).trim();
    const gEmail = guestSession ? guestSession.email : (data.email || '').trim();

    const item = {
      id,
      resCode: data.resCode || '',
      guestName: gName,
      guest: gName,
      guestEmail: gEmail,
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
    this.audit('Guest feedback submitted', 'Feedback', id, `${gName} (${item.ratingOverall}/5)`);
    return item;
  },

  // ─── Loyalty Ledger & Redemptions ───
  getLoyaltyLedger() {
    return store.get('loyalty', []);
  },
  saveLoyaltyLedger(list) {
    store.set('loyalty', list);
  },
  adjustLoyaltyPoints(guestName, points, notes = '', ref = '') {
    return this.addLoyaltyPoints(guestName, points, notes, ref);
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
      return { success: false, error: `Insufficient loyalty points. Requires ${reward.points} points; current balance is ${currentPoints}.` };
    }

    this.addLoyaltyPoints(guestName, -reward.points, `Redeemed: ${reward.name}`, reward.id);
    this.audit('Loyalty redemption', 'Loyalty', reward.id, `${guestName} redeemed ${reward.name}`);
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
      time: `${today()} ${nowTime()}`,
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

  // ─── Live Dynamic Notifications (Derived Live & Portal-Aware) ───
  getNotifications(portalType) {
    const T = today();
    const items = [];

    // Automatically detect portal if not explicitly provided
    let portal = portalType;
    if (!portal && typeof window !== 'undefined' && window.location) {
      const normPath = window.location.pathname.replace(/\\/g, '/');
      if (normPath.includes('/hotel/')) portal = 'hotel';
      else if (normPath.includes('/restaurant/')) portal = 'restaurant';
      else if (normPath.includes('/guest/')) portal = 'guest';
      else if (normPath.includes('/management/')) portal = 'management';
      else {
        const staff = this.getStaffSession();
        if (staff && staff.role === 'hotel_receptionist') portal = 'hotel';
        else if (staff && staff.role === 'restaurant_receptionist') portal = 'restaurant';
        else portal = 'management';
      }
    }
    if (!portal) portal = 'management';

    const base = portal === 'hotel' ? '../hotel/' :
      portal === 'restaurant' ? '../restaurant/' :
        portal === 'guest' ? '../guest/' : '../management/';

    const includeHotel = portal === 'hotel' || portal === 'management';
    const includeRest = portal === 'restaurant' || portal === 'management';

    // 1. Online Bookings (Instant confirmed room bookings)
    if (includeHotel) {
      const storedNotifs = store.get('notifications', []);
      storedNotifs.forEach(n => {
        items.push({
          id: n.id || ('notif-bk-' + (n.refId || n.code)),
          type: 'booking',
          title: n.title || `New Online Booking ${n.refId || ''}`,
          desc: n.message || `Confirmed online room reservation`,
          url: `${base}reservations.html?code=${n.refId || ''}`,
          time: n.time ? (n.time.includes('T') ? n.time.slice(0, 16).replace('T', ' ') : n.time) : 'Recent'
        });
      });
    }

    // 2. Unread guest message threads
    if (includeHotel) {
      this.getThreads()
        .filter(t => t.unreadStaff > 0 && t.status === 'Open')
        .forEach(t => {
          items.push({
            id: 'notif-msg-' + t.id,
            type: 'message',
            title: `Message from ${t.guestName}`,
            desc: t.subject,
            url: `${base}messages.html?id=${t.id}`,
            time: t.updated
          });
        });
    }

    // 3. New contact inquiries
    if (includeHotel) {
      this.getInquiries()
        .filter(i => i.status === 'New')
        .forEach(i => {
          items.push({
            id: 'notif-inq-' + (i.ref || i.id),
            type: 'inquiry',
            title: `New Inquiry: ${i.name}`,
            desc: i.type,
            url: `${base}inquiries.html?ref=${i.ref || i.id}`,
            time: i.created
          });
        });
    }

    // 4. Arrivals today
    if (includeHotel) {
      this.getReservations()
        .filter(r => r.i === T && (r.st === 'Confirmed' || r.st === 'Pending'))
        .forEach(r => {
          items.push({
            id: 'notif-arr-' + r.c,
            type: 'arrival',
            title: `Arrival Today: ${r.g}`,
            desc: `${r.t} (Room ${r.n}) · ${r.p}`,
            url: `${base}reservations.html?code=${r.c}`,
            time: 'Today'
          });
        });
    }

    // 5. Urgent dirty rooms
    if (includeHotel) {
      const hk = this.getHK();
      Object.entries(hk).forEach(([room, h]) => {
        if (h.s !== 'Clean' && h.p === 'Urgent') {
          items.push({
            id: 'notif-hk-' + room,
            type: 'housekeeping',
            title: `Urgent Cleaning: Room ${room}`,
            desc: 'Needs turnover for arriving guest',
            url: `${base}housekeeping.html`,
            time: 'Urgent'
          });
        }
      });
    }

    // 6. Urgent maintenance
    if (includeHotel) {
      this.getMaintenance()
        .filter(x => x.status === 'Open' && x.priority === 'Urgent')
        .forEach(x => {
          items.push({
            id: 'notif-m-' + x.id,
            type: 'maintenance',
            title: `Urgent Maintenance: Room ${x.room}`,
            desc: x.issue,
            url: `${base}maintenance.html?id=${x.id}`,
            time: x.created
          });
        });
    }

    // 7. New restaurant orders (POS & In-room)
    if (includeRest) {
      this.getOrders()
        .filter(o => o.status === 'New')
        .forEach(o => {
          items.push({
            id: 'notif-ord-' + o.code,
            type: 'order',
            title: `New Order ${o.code}`,
            desc: `${o.type} · ${o.target}`,
            url: `${base}orders.html?code=${o.code}`,
            time: o.created
          });
        });

      // 8. Table reservations today
      const tableBookings = store.get('tableReservations', []);
      tableBookings
        .filter(tb => tb.date === T && tb.status === 'Confirmed')
        .forEach(tb => {
          items.push({
            id: 'notif-tbl-' + (tb.code || tb.id),
            type: 'table',
            title: `Table Booking: ${tb.guestName || tb.name}`,
            desc: `${tb.area || 'Dining'} (${tb.partySize || 2} pax) at ${tb.time}`,
            url: `${base}tables.html`,
            time: tb.time || 'Today'
          });
        });
    }

    // 9. Superadmin Pending Approvals
    if (portal === 'management') {
      const pendingApprovals = store.get('approvalRequests', []).filter(a => a.status === 'Pending');
      pendingApprovals.forEach(ap => {
        items.push({
          id: 'notif-apr-' + ap.id,
          type: 'approval',
          title: `Pending Approval: ${ap.action}`,
          desc: `${ap.requestedBy || 'Staff'} · ${ap.reason || ''}`,
          url: `${base}approvals.html`,
          time: ap.created || 'Pending'
        });
      });
    }

    return items;
  },

  // ─── Guest Self-Service Notifications ───
  getGuestNotifications(guestSession) {
    if (!guestSession) return [];
    const items = [];
    const guestEmail = (guestSession.email || '').toLowerCase();
    const guestName = (guestSession.name || '').toLowerCase();

    // 1. Confirmed room reservations
    const reservations = this.getReservations().filter(r =>
      (r.em && r.em.toLowerCase() === guestEmail) || (r.g && r.g.toLowerCase() === guestName)
    );
    reservations.forEach(r => {
      items.push({
        id: 'notif-gst-res-' + r.c,
        type: 'reservation',
        title: `Reservation ${r.c} (${r.st})`,
        desc: `${r.t} · ${fmtDate(r.i)} to ${fmtDate(r.o)}`,
        url: 'guest-portal.html#reservations',
        time: fmtDate(r.i)
      });
    });

    // 2. Active food orders
    const orders = this.getOrders().filter(o =>
      (o.guestEmail && o.guestEmail.toLowerCase() === guestEmail) ||
      (o.room && reservations.some(r => String(r.n) === String(o.room)))
    );
    orders.filter(o => o.status !== 'Cancelled').forEach(o => {
      items.push({
        id: 'notif-gst-ord-' + o.code,
        type: 'order',
        title: `Dining Order ${o.code}: ${o.status}`,
        desc: `${(o.lines || []).map(l => l.name).join(', ')}`,
        url: 'guest-portal.html#orders',
        time: o.created || 'Today'
      });
    });

    // 3. Staff replies in messaging
    this.getThreads().filter(t => (t.guestEmail || '').toLowerCase() === guestEmail).forEach(t => {
      if (t.messages && t.messages.some(m => m.role === 'staff')) {
        const lastStaffMsg = [...t.messages].reverse().find(m => m.role === 'staff');
        items.push({
          id: 'notif-gst-msg-' + t.id,
          type: 'message',
          title: `Reply from Concierge: ${t.subject}`,
          desc: lastStaffMsg ? lastStaffMsg.text : 'New message from staff',
          url: 'guest-portal.html#messages',
          time: t.updated || 'Recent'
        });
      }
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


// Cross-Tab Reactivity Listener
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.startsWith('pupsj.')) {
      const entity = e.key.replace('pupsj.', '');
      window.dispatchEvent(new CustomEvent('pupsj:data-change', {
        detail: { entity, action: 'storage-sync', external: true, time: Date.now() }
      }));
    }
  });
}
