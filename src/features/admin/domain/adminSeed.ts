import type { AdminState, AdminRole, AdminUser } from './adminTypes';
import { ADMIN_SEED_VERSION } from './adminTypes';

/**
 * Realistic demo seed for the AgriConnect admin dashboard.
 * Dates are generated relative to "now" so the overview charts and
 * "x days ago" columns always look live.
 */

const DAY = 24 * 60 * 60 * 1000;

const daysAgo = (n: number): string => new Date(Date.now() - n * DAY).toISOString();
const daysFromNow = (n: number): string => new Date(Date.now() + n * DAY).toISOString();

export const uid = (): string =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

/* ── RBAC seed (must exist first — everything references these) ───────── */

export const seedAdminRoles: AdminRole[] = [
  {
    id: 'role-super',
    name: 'Super Admin',
    description: 'Unrestricted access across every module.',
    permissions: ['*'],
    memberCount: 1,
    protected: true,
  },
  {
    id: 'role-ops',
    name: 'Operations Manager',
    description: 'Manages users, orders, rentals and support tickets.',
    permissions: [
      'farmers.read', 'farmers.write', 'orders.read', 'orders.write',
      'rentals.read', 'rentals.write', 'support.read', 'support.write',
      'verification.read', 'verification.write', 'reports.read',
    ],
    memberCount: 2,
    protected: false,
  },
  {
    id: 'role-content',
    name: 'Content Editor',
    description: 'Publishes news, knowledge hub, FAQ and scheme content.',
    permissions: [
      'news.read', 'news.write', 'knowledge.read', 'knowledge.write',
      'faq.read', 'faq.write', 'schemes.read', 'schemes.write', 'push.read',
    ],
    memberCount: 2,
    protected: false,
  },
  {
    id: 'role-finance',
    name: 'Finance Officer',
    description: 'Owns payments, subscriptions and advertising budgets.',
    permissions: [
      'payments.read', 'payments.write', 'subscriptions.read',
      'subscriptions.write', 'ads.read', 'ads.write',
    ],
    memberCount: 1,
    protected: false,
  },
  {
    id: 'role-analyst',
    name: 'Analyst',
    description: 'Read-only access to analytics, crash reports and weather.',
    permissions: [
      'analytics.read', 'crash.read', 'weather.read', 'mandi.read',
      'farmers.read', 'orders.read', 'audit.read',
    ],
    memberCount: 1,
    protected: false,
  },
];

export const seedAdminUsers: AdminUser[] = [
  {
    id: 'admin-1',
    name: 'Priya Sharma',
    email: 'priya@agriconnnect.app',
    phone: '+91 98100 00001',
    roleId: 'role-super',
    status: 'Active',
    lastLogin: daysAgo(0),
    twoFactor: true,
  },
  {
    id: 'admin-2',
    name: 'Rahul Verma',
    email: 'rahul@agriconnnect.app',
    phone: '+91 98100 00002',
    roleId: 'role-ops',
    status: 'Active',
    lastLogin: daysAgo(1),
    twoFactor: true,
  },
  {
    id: 'admin-3',
    name: 'Sunita Rao',
    email: 'sunita@agriconnnect.app',
    phone: '+91 98100 00003',
    roleId: 'role-content',
    status: 'Active',
    lastLogin: daysAgo(2),
    twoFactor: false,
  },
  {
    id: 'admin-4',
    name: 'Arjun Nair',
    email: 'arjun@agriconnnect.app',
    phone: '+91 98100 00004',
    roleId: 'role-finance',
    status: 'Active',
    lastLogin: daysAgo(0),
    twoFactor: false,
  },
  {
    id: 'admin-5',
    name: 'Meera Joshi',
    email: 'meera@agriconnnect.app',
    phone: '+91 98100 00005',
    roleId: 'role-analyst',
    status: 'Inactive',
    lastLogin: daysAgo(18),
    twoFactor: false,
  },
];

/* ── Farmers ──────────────────────────────────────────────────────────── */

const seedFarmers: AdminState['farmers'] = [
  { id: 'f-01', name: 'Rajesh Verma', phone: '+91 98200 11223', village: 'Sanganer', district: 'Jaipur', state: 'Rajasthan', landSize: 4.5, unit: 'ha', primaryCrop: 'Wheat', joined: daysAgo(340), status: 'Active', verification: 'Verified', orders: 12, rating: 4.8 },
  { id: 'f-02', name: 'Gurpreet Singh', phone: '+91 98150 33221', village: 'Ludhiana', district: 'Ludhiana', state: 'Punjab', landSize: 8, unit: 'ha', primaryCrop: 'Rice', joined: daysAgo(520), status: 'Active', verification: 'Verified', orders: 21, rating: 4.9 },
  { id: 'f-03', name: 'Sunita Devi', phone: '+91 98300 44556', village: 'Indore Rural', district: 'Indore', state: 'Madhya Pradesh', landSize: 2, unit: 'ha', primaryCrop: 'Soybean', joined: daysAgo(210), status: 'Active', verification: 'Verified', orders: 8, rating: 4.6 },
  { id: 'f-04', name: 'Mahesh Patel', phone: '+91 98400 55667', village: 'Nashik', district: 'Nashik', state: 'Maharashtra', landSize: 3.2, unit: 'ha', primaryCrop: 'Onion', joined: daysAgo(480), status: 'Suspended', verification: 'Verified', orders: 15, rating: 3.9 },
  { id: 'f-05', name: 'Lakshmi Iyer', phone: '+91 98500 66778', village: 'Erode', district: 'Erode', state: 'Tamil Nadu', landSize: 1.6, unit: 'ha', primaryCrop: 'Turmeric', joined: daysAgo(95), status: 'Active', verification: 'Verified', orders: 4, rating: 4.5 },
  { id: 'f-06', name: 'Arvind Kumar', phone: '+91 98600 77889', village: 'Ajmer', district: 'Ajmer', state: 'Rajasthan', landSize: 6, unit: 'ha', primaryCrop: 'Mustard', joined: daysAgo(60), status: 'Pending', verification: 'Unverified', orders: 0, rating: 0 },
  { id: 'f-07', name: 'Geeta Bai', phone: '+91 98700 88990', village: 'Chomu', district: 'Jaipur', state: 'Rajasthan', landSize: 1.2, unit: 'ha', primaryCrop: 'Vegetables', joined: daysAgo(730), status: 'Active', verification: 'Verified', orders: 32, rating: 4.7 },
  { id: 'f-08', name: 'Bharat Chaudhary', phone: '+91 98800 99001', village: 'Hapur', district: 'Hapur', state: 'Uttar Pradesh', landSize: 5, unit: 'ha', primaryCrop: 'Sugarcane', joined: daysAgo(12), status: 'Pending', verification: 'Unverified', orders: 0, rating: 0 },
  { id: 'f-09', name: 'Kavita Reddy', phone: '+91 98900 11234', village: 'Kurnool', district: 'Kurnool', state: 'Andhra Pradesh', landSize: 2.8, unit: 'ha', primaryCrop: 'Cotton', joined: daysAgo(150), status: 'Active', verification: 'Verified', orders: 6, rating: 4.2 },
  { id: 'f-10', name: 'Mohan Das', phone: '+91 98000 22345', village: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', landSize: 1.1, unit: 'ha', primaryCrop: 'Banana', joined: daysAgo(400), status: 'Active', verification: 'Verified', orders: 11, rating: 4.1 },
  { id: 'f-11', name: 'Ramesh Patil', phone: '+91 97900 33456', village: 'Kolhapur', district: 'Kolhapur', state: 'Maharashtra', landSize: 3.5, unit: 'ha', primaryCrop: 'Sugarcane', joined: daysAgo(28), status: 'Pending', verification: 'Unverified', orders: 0, rating: 0 },
  { id: 'f-12', name: 'Sita Devi', phone: '+91 97800 44567', village: 'Patna', district: 'Patna', state: 'Bihar', landSize: 0.8, unit: 'ha', primaryCrop: 'Paddy', joined: daysAgo(260), status: 'Active', verification: 'Verified', orders: 5, rating: 4.4 },
];

/* ── Equipment Owners ─────────────────────────────────────────────────── */

const seedEquipmentOwners: AdminState['equipmentOwners'] = [
  { id: 'eo-01', name: 'Ramesh Kumar', phone: '+91 98111 22334', location: 'Sanganer, Jaipur', state: 'Rajasthan', machines: 3, categories: 'Tractor, Rotavator', rating: 4.8, revenue: 184500, status: 'Active', joined: daysAgo(420) },
  { id: 'eo-02', name: 'Suresh Singh', phone: '+91 98222 33445', location: 'Ludhiana', state: 'Punjab', machines: 5, categories: 'Tractor, Cultivator, Seeder', rating: 4.5, revenue: 221000, status: 'Active', joined: daysAgo(380) },
  { id: 'eo-03', name: 'Vikram Jat', phone: '+91 98333 44556', location: 'Hisar', state: 'Haryana', machines: 2, categories: 'Tractor, Plough', rating: 4.9, revenue: 132000, status: 'Active', joined: daysAgo(310) },
  { id: 'eo-04', name: 'Amit Patel', phone: '+91 98444 55667', location: 'Anand', state: 'Gujarat', machines: 4, categories: 'Tractor, Harvester', rating: 4.6, revenue: 195500, status: 'Active', joined: daysAgo(520) },
  { id: 'eo-05', name: 'Devi Lal', phone: '+91 98555 66778', location: 'Sikar', state: 'Rajasthan', machines: 1, categories: 'Tractor', rating: 4.2, revenue: 48500, status: 'Suspended', joined: daysAgo(180) },
  { id: 'eo-06', name: 'Krishna Murthy', phone: '+91 98666 77889', location: 'Vijayawada', state: 'Andhra Pradesh', machines: 3, categories: 'Sprayer, Tractor', rating: 4.7, revenue: 148000, status: 'Active', joined: daysAgo(240) },
  { id: 'eo-07', name: 'Harpreet Gill', phone: '+91 98777 88990', location: 'Amritsar', state: 'Punjab', machines: 2, categories: 'Combine Harvester', rating: 4.4, revenue: 276000, status: 'Pending', joined: daysAgo(8) },
];

/* ── Marketplace Products ─────────────────────────────────────────────── */

const seedProducts: AdminState['products'] = [
  { id: 'p-01', name: 'Urea Fertilizer', category: 'Fertilizer', seller: 'Krishi Mandal Stores', price: 266, unit: '45kg bag', stock: 340, rating: 4.3, status: 'Active', added: daysAgo(200) },
  { id: 'p-02', name: 'DAP Fertilizer', category: 'Fertilizer', seller: 'Krishi Mandal Stores', price: 1350, unit: '50kg bag', stock: 120, rating: 4.5, status: 'Active', added: daysAgo(180) },
  { id: 'p-03', name: 'Hybrid Wheat Seeds (HD-3086)', category: 'Seed', seller: 'Bharat Seed Co.', price: 850, unit: '10kg packet', stock: 65, rating: 4.6, status: 'Active', added: daysAgo(160) },
  { id: 'p-04', name: 'Pesticide Sprayer (16L)', category: 'Tool', seller: 'FarmTech Solutions', price: 1200, unit: 'unit', stock: 42, rating: 4.1, status: 'Active', added: daysAgo(140) },
  { id: 'p-05', name: 'Neem Oil 1500ppm', category: 'Pesticide', seller: 'Organic Agro', price: 480, unit: '1L bottle', stock: 0, rating: 4.2, status: 'Out of Stock', added: daysAgo(120) },
  { id: 'p-06', name: 'Maize Hybrid Seeds', category: 'Seed', seller: 'Bharat Seed Co.', price: 620, unit: '5kg packet', stock: 88, rating: 4.4, status: 'Active', added: daysAgo(110) },
  { id: 'p-07', name: 'Poultry Feed (Starter)', category: 'Feed', seller: 'NutriFarm Feeds', price: 1560, unit: '50kg bag', stock: 210, rating: 4.7, status: 'Active', added: daysAgo(90) },
  { id: 'p-08', name: 'Cotton Seeds (Bt)', category: 'Seed', seller: 'Kisan Seeds', price: 720, unit: '450g packet', stock: 34, rating: 3.9, status: 'Active', added: daysAgo(75) },
  { id: 'p-09', name: 'Tractor Trolley Tyres', category: 'Tool', seller: 'FarmTech Solutions', price: 8900, unit: 'pair', stock: 8, rating: 4.0, status: 'Draft', added: daysAgo(30) },
  { id: 'p-10', name: 'Fungicide Mancozeb 75% WP', category: 'Pesticide', seller: 'CropCare', price: 320, unit: '500g pack', stock: 150, rating: 4.5, status: 'Active', added: daysAgo(25) },
  { id: 'p-11', name: 'Tomato Seeds (Arka Rakshak)', category: 'Seed', seller: 'Kisan Seeds', price: 540, unit: '10g packet', stock: 0, rating: 4.3, status: 'Hidden', added: daysAgo(18) },
  { id: 'p-12', name: 'Bamboo Sticks Bundle', category: 'Crop', seller: 'GreenGrow Supplies', price: 260, unit: 'bundle of 25', stock: 500, rating: 4.1, status: 'Active', added: daysAgo(10) },
];

/* ── Orders ───────────────────────────────────────────────────────────── */

const seedOrders: AdminState['orders'] = [
  { id: 'ORD-10241', customer: 'Rajesh Verma', items: 'Urea Fertilizer ×2', total: 532, paymentMethod: 'UPI', status: 'Delivered', placed: daysAgo(1) },
  { id: 'ORD-10240', customer: 'Sunita Devi', items: 'Neem Oil 1500ppm ×1', total: 480, paymentMethod: 'Cash on Delivery', status: 'Processing', placed: daysAgo(1) },
  { id: 'ORD-10239', customer: 'Gurpreet Singh', items: 'DAP Fertilizer ×4, Wheat Seeds ×2', total: 7100, paymentMethod: 'UPI', status: 'Shipped', placed: daysAgo(2) },
  { id: 'ORD-10238', customer: 'Kavita Reddy', items: 'Cotton Seeds (Bt) ×2', total: 1440, paymentMethod: 'Net Banking', status: 'Delivered', placed: daysAgo(2) },
  { id: 'ORD-10237', customer: 'Lakshmi Iyer', items: 'Fungicide Mancozeb ×3', total: 960, paymentMethod: 'UPI', status: 'Delivered', placed: daysAgo(3) },
  { id: 'ORD-10236', customer: 'Sita Devi', items: 'Poultry Feed (Starter) ×1', total: 1560, paymentMethod: 'Cash on Delivery', status: 'Pending', placed: daysAgo(3) },
  { id: 'ORD-10235', customer: 'Mohan Das', items: 'Pesticide Sprayer ×1', total: 1200, paymentMethod: 'Card', status: 'Delivered', placed: daysAgo(4) },
  { id: 'ORD-10234', customer: 'Mahesh Patel', items: 'Hybrid Wheat Seeds ×1', total: 850, paymentMethod: 'UPI', status: 'Cancelled', placed: daysAgo(5) },
  { id: 'ORD-10233', customer: 'Geeta Bai', items: 'Bamboo Sticks Bundle ×4', total: 1040, paymentMethod: 'UPI', status: 'Delivered', placed: daysAgo(5) },
  { id: 'ORD-10232', customer: 'Arvind Kumar', items: 'DAP Fertilizer ×1', total: 1350, paymentMethod: 'Cash on Delivery', status: 'Refunded', placed: daysAgo(6) },
  { id: 'ORD-10231', customer: 'Ramesh Patil', items: 'Poultry Feed (Starter) ×2', total: 3120, paymentMethod: 'UPI', status: 'Shipped', placed: daysAgo(6) },
  { id: 'ORD-10230', customer: 'Bharat Chaudhary', items: 'Urea Fertilizer ×1', total: 266, paymentMethod: 'Cash on Delivery', status: 'Pending', placed: daysAgo(7) },
  { id: 'ORD-10229', customer: 'Kavita Reddy', items: 'Fungicide Mancozeb ×2', total: 640, paymentMethod: 'Card', status: 'Delivered', placed: daysAgo(8) },
  { id: 'ORD-10228', customer: 'Sunita Devi', items: 'Pesticide Sprayer ×1, Bamboo ×2', total: 1720, paymentMethod: 'UPI', status: 'Processing', placed: daysAgo(9) },
];

/* ── Tractor Rentals ──────────────────────────────────────────────────── */

const seedTractorRentals: AdminState['tractorRentals'] = [
  { id: 'TR-5011', farmer: 'Rajesh Verma', tractor: 'Mahindra 575 DI', owner: 'Ramesh Kumar', rate: 800, duration: '6 hours', total: 4800, status: 'Completed', booked: daysAgo(4) },
  { id: 'TR-5010', farmer: 'Gurpreet Singh', tractor: 'Sonalika Tiger', owner: 'Suresh Singh', rate: 900, duration: '2 days', total: 14400, status: 'In Progress', booked: daysAgo(1) },
  { id: 'TR-5009', farmer: 'Lakshmi Iyer', tractor: 'John Deere 5310', owner: 'Vikram Jat', rate: 1100, duration: '8 hours', total: 8800, status: 'Confirmed', booked: daysAgo(2) },
  { id: 'TR-5008', farmer: 'Sunita Devi', tractor: 'Swaraj 855', owner: 'Amit Patel', rate: 850, duration: '5 hours', total: 4250, status: 'Pending', booked: daysAgo(0) },
  { id: 'TR-5007', farmer: 'Geeta Bai', tractor: 'Mahindra 575 DI', owner: 'Ramesh Kumar', rate: 800, duration: '4 hours', total: 3200, status: 'Completed', booked: daysAgo(10) },
  { id: 'TR-5006', farmer: 'Mohan Das', tractor: 'Sonalika Tiger', owner: 'Suresh Singh', rate: 900, duration: '1 day', total: 7200, status: 'Cancelled', booked: daysAgo(12) },
  { id: 'TR-5005', farmer: 'Kavita Reddy', tractor: 'Swaraj 855', owner: 'Amit Patel', rate: 850, duration: '3 hours', total: 2550, status: 'Completed', booked: daysAgo(15) },
  { id: 'TR-5004', farmer: 'Bharat Chaudhary', tractor: 'John Deere 5310', owner: 'Vikram Jat', rate: 1100, duration: '1 day', total: 8800, status: 'Pending', booked: daysAgo(0) },
  { id: 'TR-5003', farmer: 'Ramesh Patil', tractor: 'Mahindra 575 DI', owner: 'Ramesh Kumar', rate: 800, duration: '6 hours', total: 4800, status: 'In Progress', booked: daysAgo(0) },
  { id: 'TR-5002', farmer: 'Sita Devi', tractor: 'Swaraj 855', owner: 'Amit Patel', rate: 850, duration: '2 hours', total: 1700, status: 'Completed', booked: daysAgo(20) },
];

/* ── Government Schemes ───────────────────────────────────────────────── */

const seedSchemes: AdminState['schemes'] = [
  { id: 's-01', title: 'PM Kisan Samman Nidhi', ministry: 'Ministry of Agriculture', benefit: '₹6,000/year in 3 instalments', eligibility: 'Small & marginal farmers (<2 ha)', state: 'All India', deadline: '', status: 'Active' },
  { id: 's-02', title: 'Kisan Credit Card (KCC)', ministry: 'NABARD', benefit: 'Low-interest crop loans up to ₹3 lakh', eligibility: 'All farmers', state: 'All India', deadline: '', status: 'Active' },
  { id: 's-03', title: 'Soil Health Card Scheme', ministry: 'Ministry of Agriculture', benefit: 'Free soil testing & nutrient report', eligibility: 'All farmers', state: 'All India', deadline: daysFromNow(90), status: 'Active' },
  { id: 's-04', title: 'Pradhan Mantri Fasal Bima Yojana', ministry: 'Ministry of Agriculture', benefit: 'Crop insurance at 2% premium', eligibility: 'All farmers growing notified crops', state: 'All India', deadline: daysFromNow(45), status: 'Active' },
  { id: 's-05', title: 'PM-KUSUM Solar Pump Scheme', ministry: 'Ministry of New & Renewable Energy', benefit: '60% subsidy on solar water pumps', eligibility: 'Farmers with land ownership', state: 'Rajasthan', deadline: daysFromNow(30), status: 'Active' },
  { id: 's-06', title: 'Rythu Bharosa', ministry: 'State Agriculture Dept.', benefit: '₹11,000/year per farmer family', eligibility: 'All cultivators in AP', state: 'Andhra Pradesh', deadline: daysFromNow(15), status: 'Active' },
  { id: 's-07', title: 'Sub-mission on Agricultural Mechanization', ministry: 'Ministry of Agriculture', benefit: 'Up to 50% subsidy on implements', eligibility: 'Small & marginal farmers', state: 'All India', deadline: '', status: 'Upcoming' },
  { id: 's-08', title: 'PM Formalisation of Micro Food Enterprises', ministry: 'Ministry of Food Processing', benefit: 'Credit support up to ₹10 lakh', eligibility: 'Food processing units', state: 'All India', deadline: daysFromNow(120), status: 'Active' },
  { id: 's-09', title: 'Mukhyamantri Krishi Yojana', ministry: 'State Agriculture Dept.', benefit: 'Input subsidy on seeds & fertiliser', eligibility: 'Marginal farmers (<1 ha)', state: 'Uttar Pradesh', deadline: daysAgo(2), status: 'Closed' },
];

/* ── News ─────────────────────────────────────────────────────────────── */

const seedNews: AdminState['newsArticles'] = [
  { id: 'n-01', title: 'MSP Hike for Wheat Announced by Central Govt', source: 'DD Kisan', category: 'Policy', published: daysAgo(1), views: 48200, status: 'Published' },
  { id: 'n-02', title: 'Heavy Rains Expected in Jaipur District Next Week', source: 'IMD', category: 'Weather', published: daysAgo(0), views: 21900, status: 'Published' },
  { id: 'n-03', title: 'New Subsidy on Solar Pumps — Apply Now', source: 'Agri Dept', category: 'Scheme', published: daysAgo(1), views: 30500, status: 'Published' },
  { id: 'n-04', title: 'Onion Prices Surge 18% in Nashik Mandi', source: 'AgriWatch', category: 'Market', published: daysAgo(2), views: 15400, status: 'Published' },
  { id: 'n-05', title: 'Kharif Sowing Crosses 65% of Normal Area', source: 'PIB', category: 'Policy', published: daysAgo(3), views: 9800, status: 'Published' },
  { id: 'n-06', title: 'Drip Irrigation: PMKSY Window Closes 15 Aug', source: 'Krishi Jagran', category: 'Scheme', published: daysAgo(4), views: 12200, status: 'Published' },
  { id: 'n-07', title: 'Why Early Blight Is Spreading in Potato Belts', source: 'ICAR', category: 'Crop Advisory', published: daysAgo(5), views: 28700, status: 'Published' },
  { id: 'n-08', title: 'UP Government Launches Free Soil Testing Camps', source: 'Agri Dept', category: 'State', published: daysAgo(6), views: 6400, status: 'Draft' },
  { id: 'n-09', title: 'Fertilizer Subsidy Reforms Under Review', source: 'Reuters', category: 'Policy', published: daysAgo(10), views: 8100, status: 'Archived' },
];

/* ── Knowledge Hub ────────────────────────────────────────────────────── */

const seedKnowledge: AdminState['knowledgeArticles'] = [
  { id: 'k-01', title: 'Complete Guide to Wheat Sowing for Maximum Yield', category: 'Crop Cultivation', author: 'Dr. Anita Sharma', language: 'Hindi', published: daysAgo(30), views: 45200, status: 'Published' },
  { id: 'k-02', title: 'Identifying and Treating Early Blight in Tomatoes', category: 'Pest & Disease', author: 'Dr. Rajesh Kulkarni', language: 'English', published: daysAgo(25), views: 38900, status: 'Published' },
  { id: 'k-03', title: 'Soil Testing: How to Read Your Soil Health Card', category: 'Soil Health', author: 'ICAR Agronomy', language: 'Hindi', published: daysAgo(20), views: 21400, status: 'Published' },
  { id: 'k-04', title: 'Drip Irrigation 101: Layout and Subsidy', category: 'Irrigation', author: 'WaterTech Experts', language: 'Marathi', published: daysAgo(18), views: 18700, status: 'Published' },
  { id: 'k-05', title: 'Organic Farming: Neem Oil Formulations', category: 'Organic Farming', author: 'Organic Agro', language: 'English', published: daysAgo(15), views: 12900, status: 'Published' },
  { id: 'k-06', title: 'Tractor Maintenance Checklist for Monsoon', category: 'Machinery', author: 'Ravi Engineer', language: 'Hindi', published: daysAgo(12), views: 16100, status: 'Published' },
  { id: 'k-07', title: 'Dairy Farming: Calf Care in First 90 Days', category: 'Livestock', author: 'Dr. Nisha Patel', language: 'Gujarati', published: daysAgo(10), views: 9400, status: 'Published' },
  { id: 'k-08', title: 'Post-Harvest Losses: Cold Storage Basics', category: 'Post-Harvest', author: 'AgriLogistics', language: 'English', published: daysAgo(8), views: 7300, status: 'Draft' },
  { id: 'k-09', title: 'Integrated Pest Management for Cotton', category: 'Pest & Disease', author: 'Dr. Anita Sharma', language: 'Telugu', published: daysAgo(6), views: 15600, status: 'Published' },
  { id: 'k-10', title: 'Microirrigation Subsidy Schemes by State', category: 'Irrigation', author: 'Scheme Desk', language: 'Hindi', published: daysAgo(4), views: 6800, status: 'Published' },
];

/* ── FAQ ──────────────────────────────────────────────────────────────── */

const seedFaqs: AdminState['faqs'] = [
  { id: 'faq-01', question: 'How do I create my digital farmer profile?', answer: 'Tap "My Profile" in the bottom navigation and follow the 3-step wizard to add personal, farm and crop details.', category: 'Account', sortOrder: 1, status: 'Published' },
  { id: 'faq-02', question: 'How do I hire a tractor for my field?', answer: 'Go to Tractor Rental, choose a nearby machine, pick date/time and confirm. The owner accepts within a few hours.', category: 'Rentals', sortOrder: 2, status: 'Published' },
  { id: 'faq-03', question: 'How accurate are the mandi prices shown?', answer: 'Prices are sourced from state-level mandi boards and refreshed every 30 minutes.', category: 'Market', sortOrder: 3, status: 'Published' },
  { id: 'faq-04', question: 'Can I apply for PM-KISAN through the app?', answer: 'We link directly to the official portal and pre-fill your details. Final application is on the government site.', category: 'Schemes', sortOrder: 4, status: 'Published' },
  { id: 'faq-05', question: 'What languages are supported?', answer: 'The app supports 12 Indian languages. Switch from the settings or the language icon on the home screen.', category: 'Account', sortOrder: 5, status: 'Published' },
  { id: 'faq-06', question: 'Is the AI crop doctor free?', answer: 'Yes, basic crop advice from the AI assistant is free for all registered farmers.', category: 'AI Assistant', sortOrder: 6, status: 'Published' },
  { id: 'faq-07', question: 'How do KYC verification works?', answer: 'Upload your Aadhaar or voter ID from the profile section. Our team verifies within 24-48 hours.', category: 'Account', sortOrder: 7, status: 'Draft' },
  { id: 'faq-08', question: 'Who do I contact for a refund?', answer: 'Open a support ticket from Help & Support or call the helpline at 1800-XXX-XXXX.', category: 'Support', sortOrder: 8, status: 'Published' },
];

/* ── AI Prompts ───────────────────────────────────────────────────────── */

const seedAiPrompts: AdminState['aiPrompts'] = [
  { id: 'ai-01', title: 'Crop Disease Diagnosis', prompt: 'Analyze symptoms described: {symptom}. Suggest likely disease, prevention and safe organic/chemical treatment for {crop} in {state}.', category: 'Crop Doctor', model: 'Llama 3.3 70B', version: 'v1.4', usage: 48200, status: 'Active' },
  { id: 'ai-02', title: 'Mandi Price Insight', prompt: 'Summarize price movement for {crop} in {market} over the last 30 days and advise whether to sell now or hold in storage.', category: 'Market', model: 'Llama 3.3 70B', version: 'v1.2', usage: 21800, status: 'Active' },
  { id: 'ai-03', title: 'Fertilizer Recommendation', prompt: 'Given soil report {soil}, crop {crop} and stage {stage}, recommend fertilizer dose (N-P-K) per acre.', category: 'Soil & Fertilizer', model: 'Llama 3.3 70B', version: 'v2.0', usage: 15300, status: 'Active' },
  { id: 'ai-04', title: 'Weather Advisory', prompt: 'Based on forecast {forecast} for {district}, advise irrigation and sowing actions for {crop}.', category: 'Weather', model: 'Llama 3.3 70B', version: 'v1.1', usage: 9200, status: 'Active' },
  { id: 'ai-05', title: 'Scheme Eligibility Check', prompt: 'Check eligibility of farmer profile {profile} against scheme {scheme} and list missing documents.', category: 'Schemes', model: 'Llama 3.3 70B', version: 'v1.0', usage: 7400, status: 'Active' },
  { id: 'ai-06', title: 'Pest Identification (Image)', prompt: 'Using the uploaded image {image}, identify the pest and recommend a safe control plan for {crop}.', category: 'Crop Doctor', model: 'Llava 1.6', version: 'v0.9', usage: 11800, status: 'Active' },
  { id: 'ai-07', title: 'Loan & Insurance Advisor', prompt: 'Recommend the best loan or insurance product for farmer {profile} based on landholding and income.', category: 'Finance', model: 'Llama 3.3 70B', version: 'v1.3', usage: 3800, status: 'Draft' },
  { id: 'ai-08', title: 'Cattle Health Triage', prompt: 'Assess severity of {symptom} in {breed} cattle and advise whether to consult a vet urgently.', category: 'Livestock', model: 'Llama 3.3 70B', version: 'v1.0', usage: 2100, status: 'Disabled' },
];

/* ── Push Notifications ───────────────────────────────────────────────── */

const seedPushCampaigns: AdminState['pushCampaigns'] = [
  { id: 'push-01', title: 'MSP Hike Alert', audience: 'All farmers', message: 'Wheat MSP hiked to ₹2,425/quintal. Sell smart this season!', scheduled: daysAgo(1), sent: 184200, opened: 96500, status: 'Sent' },
  { id: 'push-02', title: 'Kharif Advisory', audience: 'Rice & Soybean farmers', message: 'Rainfall expected this week — delay urea top-dressing by 3 days.', scheduled: daysAgo(0), sent: 52100, opened: 30100, status: 'Sent' },
  { id: 'push-03', title: 'Solar Pump Subsidy Window', audience: 'Rajasthan farmers', message: 'PM-KUSUM window closes in 30 days. Apply from the Schemes tab.', scheduled: daysFromNow(1), sent: 0, opened: 0, status: 'Scheduled' },
  { id: 'push-04', title: 'Onion Storage Tip', audience: 'Nashik onion growers', message: 'Cold storage rates are stable — holding till festival demand may add ₹200/q.', scheduled: daysFromNow(3), sent: 0, opened: 0, status: 'Scheduled' },
  { id: 'push-05', title: 'App 2.0 Launch', audience: 'All users', message: 'New Digital Farmer Profile is live! Set up your farm in minutes.', scheduled: daysAgo(6), sent: 231000, opened: 121000, status: 'Sent' },
  { id: 'push-06', title: 'Weekend Tractors Discount', audience: 'Active renters', message: 'Flat 10% off tractor rentals this weekend. Book now!', scheduled: daysAgo(3), sent: 38400, opened: 17200, status: 'Sent' },
  { id: 'push-07', title: 'Festival Dhamaka Sale', audience: 'All users', message: 'Up to 30% off seeds & fertilisers till Sunday.', scheduled: daysFromNow(5), sent: 0, opened: 0, status: 'Draft' },
];

/* ── Weather Readings ─────────────────────────────────────────────────── */

const seedWeather: AdminState['weatherReadings'] = [
  { id: 'w-01', station: 'SKM-JAIPUR-01', district: 'Jaipur', state: 'Rajasthan', temp: 32, humidity: 45, rainfall: 0, wind: 12, condition: 'Sunny', updated: daysAgo(0) },
  { id: 'w-02', station: 'SKM-LUDH-02', district: 'Ludhiana', state: 'Punjab', temp: 28, humidity: 72, rainfall: 18, wind: 8, condition: 'Light Rain', updated: daysAgo(0) },
  { id: 'w-03', station: 'SKM-NASH-03', district: 'Nashik', state: 'Maharashtra', temp: 30, humidity: 61, rainfall: 4, wind: 10, condition: 'Cloudy', updated: daysAgo(0) },
  { id: 'w-04', station: 'SKM-INDR-04', district: 'Indore', state: 'Madhya Pradesh', temp: 29, humidity: 68, rainfall: 22, wind: 9, condition: 'Thunderstorm', updated: daysAgo(0) },
  { id: 'w-05', station: 'SKM-EROD-05', district: 'Erode', state: 'Tamil Nadu', temp: 33, humidity: 58, rainfall: 0, wind: 14, condition: 'Sunny', updated: daysAgo(0) },
  { id: 'w-06', station: 'SKM-AJME-06', district: 'Ajmer', state: 'Rajasthan', temp: 34, humidity: 32, rainfall: 0, wind: 18, condition: 'Hazy', updated: daysAgo(1) },
  { id: 'w-07', station: 'SKM-HAPU-07', district: 'Hapur', state: 'Uttar Pradesh', temp: 31, humidity: 75, rainfall: 9, wind: 6, condition: 'Cloudy', updated: daysAgo(1) },
  { id: 'w-08', station: 'SKM-KURN-08', district: 'Kurnool', state: 'Andhra Pradesh', temp: 35, humidity: 48, rainfall: 0, wind: 15, condition: 'Sunny', updated: daysAgo(1) },
  { id: 'w-09', station: 'SKM-COIM-09', district: 'Coimbatore', state: 'Tamil Nadu', temp: 31, humidity: 66, rainfall: 3, wind: 11, condition: 'Cloudy', updated: daysAgo(2) },
  { id: 'w-10', station: 'SKM-PATN-10', district: 'Patna', state: 'Bihar', temp: 30, humidity: 79, rainfall: 27, wind: 7, condition: 'Heavy Rain', updated: daysAgo(2) },
];

/* ── Mandi Data ───────────────────────────────────────────────────────── */

const seedMandi: AdminState['mandiPrices'] = [
  { id: 'm-01', crop: 'Wheat', market: 'Jaipur Mandi', state: 'Rajasthan', minPrice: 2214, maxPrice: 2598, modalPrice: 2406, unit: '/quintal', trend: 'up', updated: daysAgo(0) },
  { id: 'm-02', crop: 'Basmati Rice', market: 'Karnal Mandi', state: 'Haryana', minPrice: 3842, maxPrice: 4510, modalPrice: 4176, unit: '/quintal', trend: 'down', updated: daysAgo(0) },
  { id: 'm-03', crop: 'Maize', market: 'Gulbarga Mandi', state: 'Karnataka', minPrice: 1980, maxPrice: 2324, modalPrice: 2152, unit: '/quintal', trend: 'down', updated: daysAgo(1) },
  { id: 'm-04', crop: 'Soybean', market: 'Indore Mandi', state: 'Madhya Pradesh', minPrice: 4271, maxPrice: 5013, modalPrice: 4642, unit: '/quintal', trend: 'up', updated: daysAgo(0) },
  { id: 'm-05', crop: 'Cotton', market: 'Nagpur Mandi', state: 'Maharashtra', minPrice: 6571, maxPrice: 7713, modalPrice: 7142, unit: '/quintal', trend: 'up', updated: daysAgo(1) },
  { id: 'm-06', crop: 'Mustard', market: 'Jaipur Mandi', state: 'Rajasthan', minPrice: 5028, maxPrice: 5902, modalPrice: 5465, unit: '/quintal', trend: 'stable', updated: daysAgo(0) },
  { id: 'm-07', crop: 'Gram (Chana)', market: 'Delhi Mandi', state: 'Delhi', minPrice: 4889, maxPrice: 5739, modalPrice: 5314, unit: '/quintal', trend: 'up', updated: daysAgo(2) },
  { id: 'm-08', crop: 'Groundnut', market: 'Rajkot Mandi', state: 'Gujarat', minPrice: 5317, maxPrice: 6241, modalPrice: 5779, unit: '/quintal', trend: 'down', updated: daysAgo(1) },
  { id: 'm-09', crop: 'Onion', market: 'Nashik Mandi', state: 'Maharashtra', minPrice: 1685, maxPrice: 1979, modalPrice: 1832, unit: '/quintal', trend: 'down', updated: daysAgo(0) },
  { id: 'm-10', crop: 'Potato', market: 'Agra Mandi', state: 'Uttar Pradesh', minPrice: 1220, maxPrice: 1432, modalPrice: 1326, unit: '/quintal', trend: 'up', updated: daysAgo(0) },
  { id: 'm-11', crop: 'Tomato', market: 'Bangalore Mandi', state: 'Karnataka', minPrice: 2492, maxPrice: 2926, modalPrice: 2709, unit: '/quintal', trend: 'up', updated: daysAgo(1) },
  { id: 'm-12', crop: 'Sugarcane', market: 'Muzaffarnagar Mandi', state: 'Uttar Pradesh', minPrice: 347, maxPrice: 407, modalPrice: 377, unit: '/quintal', trend: 'up', updated: daysAgo(2) },
  { id: 'm-13', crop: 'Cumin (Jeera)', market: 'Unjha Mandi', state: 'Gujarat', minPrice: 39451, maxPrice: 46313, modalPrice: 42882, unit: '/quintal', trend: 'down', updated: daysAgo(1) },
  { id: 'm-14', crop: 'Turmeric', market: 'Erode Mandi', state: 'Tamil Nadu', minPrice: 9449, maxPrice: 11093, modalPrice: 10271, unit: '/quintal', trend: 'up', updated: daysAgo(0) },
  { id: 'm-15', crop: 'Red Chilli', market: 'Guntur Mandi', state: 'Andhra Pradesh', minPrice: 11873, maxPrice: 13937, modalPrice: 12905, unit: '/quintal', trend: 'down', updated: daysAgo(3) },
  { id: 'm-16', crop: 'Arhar (Tur Dal)', market: 'Latur Mandi', state: 'Maharashtra', minPrice: 6405, maxPrice: 7519, modalPrice: 6962, unit: '/quintal', trend: 'up', updated: daysAgo(0) },
];

/* ── Reports & Complaints ─────────────────────────────────────────────── */

const seedReports: AdminState['reports'] = [
  { id: 'r-01', reporter: 'Sunita Devi', type: 'Complaint', category: 'Marketplace', subject: 'Delivered fertiliser bag was damaged', priority: 'Medium', status: 'Open', created: daysAgo(0) },
  { id: 'r-02', reporter: 'Mahesh Patel', type: 'Complaint', category: 'Rentals', subject: 'Tractor arrived 3 hours late', priority: 'High', status: 'In Progress', created: daysAgo(1) },
  { id: 'r-03', reporter: 'Arvind Kumar', type: 'Report', category: 'Price Data', subject: 'Mandi price for mustard seems stale', priority: 'Low', status: 'Resolved', created: daysAgo(2) },
  { id: 'r-04', reporter: 'Kavita Reddy', type: 'Report', category: 'Technical', subject: 'Crop doctor gave wrong pesticide dose', priority: 'High', status: 'In Progress', created: daysAgo(2) },
  { id: 'r-05', reporter: 'Geeta Bai', type: 'Complaint', category: 'Payments', subject: 'Double charged for store order', priority: 'Critical', status: 'Open', created: daysAgo(0) },
  { id: 'r-06', reporter: 'Mohan Das', type: 'Report', category: 'Content', subject: 'News article translation is incorrect', priority: 'Low', status: 'Closed', created: daysAgo(5) },
  { id: 'r-07', reporter: 'Sita Devi', type: 'Complaint', category: 'Community', subject: 'Inappropriate comments on my post', priority: 'Medium', status: 'Resolved', created: daysAgo(4) },
  { id: 'r-08', reporter: 'Ramesh Patil', type: 'Report', category: 'Schemes', subject: 'Scheme eligibility shows wrong land size', priority: 'Medium', status: 'Open', created: daysAgo(1) },
];

/* ── User Verification ────────────────────────────────────────────────── */

const seedVerification: AdminState['verificationRequests'] = [
  { id: 'v-01', user: 'Rajesh Verma', type: 'Farmer', document: 'Aadhaar Card', submitted: daysAgo(0), status: 'Approved' },
  { id: 'v-02', user: 'Arvind Kumar', type: 'Farmer', document: 'Aadhaar Card', submitted: daysAgo(1), status: 'Pending' },
  { id: 'v-03', user: 'Harpreet Gill', type: 'Tractor Owner', document: 'RC Book + Aadhaar', submitted: daysAgo(2), status: 'Pending' },
  { id: 'v-04', user: 'Bharat Chaudhary', type: 'Farmer', document: 'Voter ID', submitted: daysAgo(1), status: 'Pending' },
  { id: 'v-05', user: 'Sunita Devi', type: 'Store Owner', document: 'GST Certificate', submitted: daysAgo(3), status: 'Approved' },
  { id: 'v-06', user: 'Ramesh Patil', type: 'Farmer', document: 'Aadhaar Card', submitted: daysAgo(4), status: 'Rejected' },
  { id: 'v-07', user: 'Krishna Murthy', type: 'Cattle Owner', document: 'Aadhaar + Cattle ID', submitted: daysAgo(2), status: 'Pending' },
  { id: 'v-08', user: 'Suresh Singh', type: 'Tractor Owner', document: 'RC Book', submitted: daysAgo(10), status: 'Approved' },
];

/* ── KYC ──────────────────────────────────────────────────────────────── */

const seedKyc: AdminState['kycRecords'] = [
  { id: 'kyc-01', user: 'Rajesh Verma', idType: 'Aadhaar', riskScore: 12, submitted: daysAgo(340), expires: daysFromNow(200), status: 'Verified' },
  { id: 'kyc-02', user: 'Gurpreet Singh', idType: 'Aadhaar', riskScore: 8, submitted: daysAgo(520), expires: daysFromNow(90), status: 'Verified' },
  { id: 'kyc-03', user: 'Arvind Kumar', idType: 'Voter ID', riskScore: 55, submitted: daysAgo(2), expires: daysFromNow(360), status: 'Pending' },
  { id: 'kyc-04', user: 'Mahesh Patel', idType: 'Aadhaar', riskScore: 41, submitted: daysAgo(480), expires: daysFromNow(150), status: 'Verified' },
  { id: 'kyc-05', user: 'Bharat Chaudhary', idType: 'PAN Card', riskScore: 78, submitted: daysAgo(1), expires: daysFromNow(360), status: 'Pending' },
  { id: 'kyc-06', user: 'Ramesh Patil', idType: 'Aadhaar', riskScore: 88, submitted: daysAgo(30), expires: daysFromNow(200), status: 'Rejected' },
  { id: 'kyc-07', user: 'Geeta Bai', idType: 'Aadhaar', riskScore: 15, submitted: daysAgo(730), expires: daysAgo(5), status: 'Expired' },
  { id: 'kyc-08', user: 'Kavita Reddy', idType: 'Voter ID', riskScore: 22, submitted: daysAgo(150), expires: daysFromNow(330), status: 'Verified' },
];

/* ── Payments ─────────────────────────────────────────────────────────── */

const seedPayments: AdminState['payments'] = [
  { id: 'PAY-9001', payer: 'Rajesh Verma', purpose: 'Store Order ORD-10241', method: 'UPI', amount: 532, fee: 0, status: 'Success', date: daysAgo(1) },
  { id: 'PAY-9000', payer: 'Gurpreet Singh', purpose: 'Store Order ORD-10239', method: 'UPI', amount: 7100, fee: 0, status: 'Success', date: daysAgo(2) },
  { id: 'PAY-8999', payer: 'Sunita Devi', purpose: 'Store Order ORD-10240', method: 'COD', amount: 480, fee: 0, status: 'Pending', date: daysAgo(1) },
  { id: 'PAY-8998', payer: 'Sita Devi', purpose: 'Store Order ORD-10236', method: 'COD', amount: 1560, fee: 0, status: 'Pending', date: daysAgo(3) },
  { id: 'PAY-8997', payer: 'Kavita Reddy', purpose: 'Store Order ORD-10238', method: 'Net Banking', amount: 1440, fee: 12, status: 'Success', date: daysAgo(2) },
  { id: 'PAY-8996', payer: 'Arvind Kumar', purpose: 'Store Order ORD-10232 (refund)', method: 'UPI', amount: 1350, fee: 0, status: 'Refunded', date: daysAgo(6) },
  { id: 'PAY-8995', payer: 'Lakshmi Iyer', purpose: 'Subscription — Pro (monthly)', method: 'UPI', amount: 199, fee: 0, status: 'Success', date: daysAgo(3) },
  { id: 'PAY-8994', payer: 'Geeta Bai', purpose: 'Store Order ORD-10233', method: 'UPI', amount: 1040, fee: 0, status: 'Success', date: daysAgo(5) },
  { id: 'PAY-8993', payer: 'Mohan Das', purpose: 'Store Order ORD-10235', method: 'Card', amount: 1200, fee: 18, status: 'Success', date: daysAgo(4) },
  { id: 'PAY-8992', payer: 'Ramesh Patil', purpose: 'Store Order ORD-10231', method: 'UPI', amount: 3120, fee: 0, status: 'Failed', date: daysAgo(6) },
  { id: 'PAY-8991', payer: 'Mahesh Patel', purpose: 'Store Order ORD-10234 (cancelled)', method: 'UPI', amount: 850, fee: 0, status: 'Refunded', date: daysAgo(5) },
  { id: 'PAY-8990', payer: 'Bharat Chaudhary', purpose: 'Store Order ORD-10230', method: 'COD', amount: 266, fee: 0, status: 'Pending', date: daysAgo(7) },
];

/* ── Subscription Plans ───────────────────────────────────────────────── */

const seedSubscriptionPlans: AdminState['subscriptionPlans'] = [
  { id: 'sp-01', name: 'Free', price: 0, period: 'Forever', features: 'Basic market data, weather, community', subscribers: 184200, status: 'Active' },
  { id: 'sp-02', name: 'Pro', price: 199, period: 'Monthly', features: 'AI crop doctor, price alerts, priority support', subscribers: 12400, status: 'Active' },
  { id: 'sp-03', name: 'Pro Yearly', price: 1990, period: 'Yearly', features: 'Everything in Pro, 2 months free', subscribers: 3200, status: 'Active' },
  { id: 'sp-04', name: 'Farmer Plus', price: 499, period: 'Monthly', features: 'Unlimited AI, scheme assist, offline mode', subscribers: 5400, status: 'Active' },
  { id: 'sp-05', name: 'Agency Bundle', price: 999, period: 'Monthly', features: 'Multi-profile management for FPOs/agencies', subscribers: 210, status: 'Draft' },
  { id: 'sp-06', name: 'Legacy Bronze', price: 99, period: 'Monthly', features: 'Legacy plan — grandfathered users only', subscribers: 880, status: 'Archived' },
];

/* ── User Subscriptions ───────────────────────────────────────────────── */

const seedUserSubscriptions: AdminState['userSubscriptions'] = [
  { id: 'us-01', user: 'Rajesh Verma', plan: 'Pro', start: daysAgo(120), renew: daysFromNow(10), status: 'Active' },
  { id: 'us-02', user: 'Gurpreet Singh', plan: 'Pro Yearly', start: daysAgo(200), renew: daysFromNow(165), status: 'Active' },
  { id: 'us-03', user: 'Sunita Devi', plan: 'Farmer Plus', start: daysAgo(45), renew: daysFromNow(20), status: 'Active' },
  { id: 'us-04', user: 'Lakshmi Iyer', plan: 'Pro', start: daysAgo(3), renew: daysFromNow(27), status: 'Trial' },
  { id: 'us-05', user: 'Mahesh Patel', plan: 'Pro', start: daysAgo(400), renew: daysAgo(12), status: 'Expired' },
  { id: 'us-06', user: 'Mohan Das', plan: 'Free', start: daysAgo(400), renew: daysAgo(0), status: 'Cancelled' },
  { id: 'us-07', user: 'Geeta Bai', plan: 'Farmer Plus', start: daysAgo(90), renew: daysFromNow(5), status: 'Active' },
  { id: 'us-08', user: 'Kavita Reddy', plan: 'Pro', start: daysAgo(10), renew: daysFromNow(20), status: 'Active' },
];

/* ── Advertisements ───────────────────────────────────────────────────── */

const seedAds: AdminState['ads'] = [
  { id: 'ad-01', title: 'Krishi Mandal Fertiliser Banner', advertiser: 'Krishi Mandal Stores', placement: 'Home Banner', budget: 25000, impressions: 182000, clicks: 9100, status: 'Active' },
  { id: 'ad-02', title: 'Bharat Seed Co. Spotlight', advertiser: 'Bharat Seed Co.', placement: 'Marketplace Spotlight', budget: 40000, impressions: 265000, clicks: 15800, status: 'Active' },
  { id: 'ad-03', title: 'PM-KUSUM Awareness Card', advertiser: 'State Agri Dept.', placement: 'Schemes Feed', budget: 0, impressions: 120000, clicks: 3200, status: 'Active' },
  { id: 'ad-04', title: 'FarmTech Sprayer Promo', advertiser: 'FarmTech Solutions', placement: 'Store Carousel', budget: 15000, impressions: 72000, clicks: 4100, status: 'Paused' },
  { id: 'ad-05', title: 'Sonalika Tractor Weekend', advertiser: 'Sonalika Motors', placement: 'Rental Home', budget: 60000, impressions: 198000, clicks: 12400, status: 'Active' },
  { id: 'ad-06', title: 'NutriFarm Feed Campaign', advertiser: 'NutriFarm Feeds', placement: 'Home Banner', budget: 12000, impressions: 31000, clicks: 900, status: 'Ended' },
];

/* ── Support Tickets ──────────────────────────────────────────────────── */

const seedSupportTickets: AdminState['supportTickets'] = [
  { id: 'ST-7001', user: 'Sunita Devi', subject: 'Order not delivered in 5 days', category: 'Orders', priority: 'High', status: 'Open', agent: 'Unassigned', created: daysAgo(0) },
  { id: 'ST-7000', user: 'Arvind Kumar', subject: 'Unable to verify my farmer profile', category: 'Account', priority: 'Medium', status: 'In Progress', agent: 'Rahul Verma', created: daysAgo(1) },
  { id: 'ST-6999', user: 'Geeta Bai', subject: 'Double charge on UPI order', category: 'Payments', priority: 'Critical', status: 'Open', agent: 'Unassigned', created: daysAgo(1) },
  { id: 'ST-6998', user: 'Mohan Das', subject: 'Tractor booking cancellation refund', category: 'Rentals', priority: 'Medium', status: 'Waiting', agent: 'Rahul Verma', created: daysAgo(2) },
  { id: 'ST-6997', user: 'Kavita Reddy', subject: 'Weather widget not updating', category: 'Technical', priority: 'Low', status: 'Resolved', agent: 'Meera Joshi', created: daysAgo(3) },
  { id: 'ST-6996', user: 'Sita Devi', subject: 'How to switch app language?', category: 'Account', priority: 'Low', status: 'Closed', agent: 'Support Bot', created: daysAgo(4) },
  { id: 'ST-6995', user: 'Bharat Chaudhary', subject: 'KYC document rejected incorrectly', category: 'KYC', priority: 'High', status: 'In Progress', agent: 'Rahul Verma', created: daysAgo(2) },
  { id: 'ST-6994', user: 'Ramesh Patil', subject: 'Scheme benefit not credited', category: 'Schemes', priority: 'High', status: 'Open', agent: 'Unassigned', created: daysAgo(1) },
  { id: 'ST-6993', user: 'Krishna Murthy', subject: 'Cattle listing verification status', category: 'Marketplace', priority: 'Medium', status: 'Waiting', agent: 'Sunita Rao', created: daysAgo(5) },
  { id: 'ST-6992', user: 'Harpreet Gill', subject: 'Rental payout delayed', category: 'Payments', priority: 'High', status: 'In Progress', agent: 'Arjun Nair', created: daysAgo(6) },
];

/* ── App Analytics (14-day deterministic series) ──────────────────────── */

const seedAppAnalytics: AdminState['appAnalytics'] = Array.from({ length: 14 }, (_, i) => {
  const base = 140000 - i * 2100;
  const wave = ((i % 7) - 3) * 4000;
  const activeUsers = base + wave;
  return {
    date: new Date(Date.now() - (13 - i) * DAY).toISOString().slice(0, 10),
    activeUsers,
    newSignups: Math.round(820 + ((i * 37) % 140)),
    sessions: Math.round(activeUsers * 2.6),
    orders: Math.round(620 + ((i * 53) % 120)),
    retention: 100 - (i * 2.4),
  };
});

/* ── Crash Reports ────────────────────────────────────────────────────── */

const seedCrashReports: AdminState['crashReports'] = [
  { id: 'cr-01', version: '2.4.1', platform: 'Android', error: 'TypeError: Cannot read properties of undefined (reading "temp") in WeatherWidget', count: 128, usersAffected: 96, lastOccurred: daysAgo(0), status: 'Investigating' },
  { id: 'cr-02', version: '2.4.1', platform: 'Android', error: 'RangeError: Invalid time value in FarmLedger date formatter', count: 74, usersAffected: 61, lastOccurred: daysAgo(1), status: 'Investigating' },
  { id: 'cr-03', version: '2.4.0', platform: 'iOS', error: 'EXC_BAD_ACCESS on SoilHealthCard chart render', count: 41, usersAffected: 38, lastOccurred: daysAgo(2), status: 'Fixed' },
  { id: 'cr-04', version: '2.4.1', platform: 'Web', error: 'Failed to fetch /api/mandi — 504 Gateway Timeout', count: 210, usersAffected: 154, lastOccurred: daysAgo(0), status: 'New' },
  { id: 'cr-05', version: '2.3.9', platform: 'Android', error: 'SQLiteException: no such table: kisan_chat_sessions', count: 32, usersAffected: 29, lastOccurred: daysAgo(5), status: 'Fixed' },
  { id: 'cr-06', version: '2.4.1', platform: 'Android', error: 'NullPointerException in OfflineBanner visibility check', count: 18, usersAffected: 15, lastOccurred: daysAgo(3), status: 'Ignored' },
  { id: 'cr-07', version: '2.4.0', platform: 'Web', error: 'Uncaught SyntaxError in dynamic import of module AgriStore', count: 9, usersAffected: 9, lastOccurred: daysAgo(7), status: 'Fixed' },
  { id: 'cr-08', version: '2.4.1', platform: 'iOS', error: 'UIApplicationDelegate: Background task crashed during sync', count: 23, usersAffected: 21, lastOccurred: daysAgo(1), status: 'New' },
];

/* ── Seed audit trail (historical, non-admin generated) ──────────────── */

const seedAuditLogs: AdminState['auditLogs'] = [
  { id: 'al-01', actor: 'system', action: 'STATUS', entity: 'schemes', entityId: 's-09', summary: 'Auto-closed scheme: Mukhyamantri Krishi Yojana (deadline passed)', timestamp: daysAgo(2) },
  { id: 'al-02', actor: 'system', action: 'STATUS', entity: 'mandiPrices', entityId: 'm-05', summary: 'Auto-refreshed modal price for Cotton in Nagpur Mandi', timestamp: daysAgo(1) },
  { id: 'al-03', actor: 'Priya Sharma', action: 'APPROVE', entity: 'verificationRequests', entityId: 'v-01', summary: 'Approved farmer verification for Rajesh Verma', timestamp: daysAgo(0) },
  { id: 'al-04', actor: 'Rahul Verma', action: 'ASSIGN', entity: 'supportTickets', entityId: 'ST-7000', summary: 'Assigned ticket to Rahul Verma', timestamp: daysAgo(1) },
  { id: 'al-05', actor: 'Arjun Nair', action: 'STATUS', entity: 'payments', entityId: 'PAY-8992', summary: 'Marked failed payment for retry (Ramesh Patil)', timestamp: daysAgo(1) },
  { id: 'al-06', actor: 'Priya Sharma', action: 'LOGIN', entity: 'adminUsers', entityId: 'admin-1', summary: 'Priya Sharma signed in to admin console', timestamp: daysAgo(0) },
];

/* ── Root seed builder ────────────────────────────────────────────────── */

export const buildSeedState = (): AdminState => ({
  version: ADMIN_SEED_VERSION,
  seededAt: new Date().toISOString(),
  farmers: seedFarmers,
  equipmentOwners: seedEquipmentOwners,
  products: seedProducts,
  orders: seedOrders,
  tractorRentals: seedTractorRentals,
  schemes: seedSchemes,
  newsArticles: seedNews,
  knowledgeArticles: seedKnowledge,
  faqs: seedFaqs,
  aiPrompts: seedAiPrompts,
  pushCampaigns: seedPushCampaigns,
  weatherReadings: seedWeather,
  mandiPrices: seedMandi,
  reports: seedReports,
  verificationRequests: seedVerification,
  kycRecords: seedKyc,
  payments: seedPayments,
  subscriptionPlans: seedSubscriptionPlans,
  userSubscriptions: seedUserSubscriptions,
  ads: seedAds,
  supportTickets: seedSupportTickets,
  appAnalytics: seedAppAnalytics,
  crashReports: seedCrashReports,
  auditLogs: seedAuditLogs,
  adminRoles: seedAdminRoles,
  adminUsers: seedAdminUsers,
});
