import type {
  Buyer, CommunityPost, FarmerProfile, NetworkState, RequirementPost, Review,
  ServiceProvider,
} from './networkTypes';
import { NETWORK_SEED_VERSION } from './networkTypes';

const daysAgo = (days: number): string => new Date(Date.now() - days * 86400000).toISOString();

export function seedNetwork(): NetworkState {
  const providers: ServiceProvider[] = [
    { id: 'p1', name: 'Ramesh Yadav', type: 'provider', village: 'Shivpuri', district: 'Indore', state: 'Madhya Pradesh', crop: 'Soybean', verified: true, rating: 4.8, reviews: 213, distanceKm: 3.2, badges: ['provider', 'farmer'], joinedDaysAgo: 320, initials: 'RY', category: 'tractor', pricing: '₹800/day', availability: 'today', trustScore: 96, completedJobs: 148, skills: ['Tractor', 'Rotavator', 'Tiller'], responseMins: 5 },
    { id: 'p2', name: 'Suresh Patil', type: 'provider', village: 'Kharadi', district: 'Pune', state: 'Maharashtra', crop: 'Sugarcane', verified: true, rating: 4.6, reviews: 96, distanceKm: 5.8, badges: ['provider'], joinedDaysAgo: 210, initials: 'SP', category: 'harvesting', pricing: '₹1,200/acre', availability: 'tomorrow', trustScore: 91, completedJobs: 76, skills: ['Harvester', 'Combine', 'Cane Cutter'], responseMins: 12 },
    { id: 'p3', name: 'Anita Devi', type: 'provider', village: 'Bahadurpur', district: 'Patna', state: 'Bihar', crop: 'Rice', verified: true, rating: 4.9, reviews: 58, distanceKm: 4.1, badges: ['provider'], joinedDaysAgo: 150, initials: 'AD', category: 'threshing', pricing: '₹600/acre', availability: 'today', trustScore: 94, completedJobs: 51, skills: ['Thresher', 'Winnowing'], responseMins: 8 },
    { id: 'p4', name: 'Vikram Singh', type: 'provider', village: 'Sangrur', district: 'Sangrur', state: 'Punjab', crop: 'Wheat', verified: true, rating: 4.7, reviews: 142, distanceKm: 6.4, badges: ['provider', 'dealer'], joinedDaysAgo: 400, initials: 'VS', category: 'drone', pricing: '₹1,500/acre', availability: 'week', trustScore: 89, completedJobs: 63, skills: ['Drone Spraying', 'Crop Survey'], responseMins: 20 },
    { id: 'p5', name: 'Dr. Meena Joshi', type: 'provider', village: 'Kothrud', district: 'Pune', state: 'Maharashtra', crop: 'Vegetables', verified: true, rating: 4.9, reviews: 177, distanceKm: 8.3, badges: ['provider'], joinedDaysAgo: 280, initials: 'MJ', category: 'veterinary', pricing: '₹500/visit', availability: 'today', trustScore: 97, completedJobs: 210, skills: ['Livestock Care', 'Vaccination'], responseMins: 3 },
    { id: 'p6', name: 'Harpreet Kaur', type: 'provider', village: 'Ludhiana', district: 'Ludhiana', state: 'Punjab', crop: 'Cotton', verified: false, rating: 4.4, reviews: 34, distanceKm: 2.9, badges: [], joinedDaysAgo: 60, initials: 'HK', category: 'soil-testing', pricing: '₹400/sample', availability: 'tomorrow', trustScore: 82, completedJobs: 29, skills: ['Soil Testing', 'NPK Report'], responseMins: 15 },
    { id: 'p7', name: 'Manoj Bhai Patel', type: 'provider', village: 'Anand', district: 'Anand', state: 'Gujarat', crop: 'Milk', verified: true, rating: 4.7, reviews: 89, distanceKm: 7.5, badges: ['provider'], joinedDaysAgo: 190, initials: 'MP', category: 'transport', pricing: '₹18/km', availability: 'today', trustScore: 90, completedJobs: 98, skills: ['Truck', 'Tempo', 'Cold Van'], responseMins: 10 },
    { id: 'p8', name: 'Gopal Kumar', type: 'provider', village: 'Bhagalpur', district: 'Bhagalpur', state: 'Bihar', crop: 'Litchi', verified: true, rating: 4.5, reviews: 41, distanceKm: 9.1, badges: ['provider'], joinedDaysAgo: 120, initials: 'GK', category: 'cold-storage', pricing: '₹35/quintal', availability: 'week', trustScore: 87, completedJobs: 44, skills: ['Cold Storage', 'Crate Rent'], responseMins: 25 },
    { id: 'p9', name: 'Raju Bhandari', type: 'provider', village: 'Chittoor', district: 'Chittoor', state: 'Andhra Pradesh', crop: 'Tomato', verified: true, rating: 4.6, reviews: 72, distanceKm: 4.6, badges: ['provider'], joinedDaysAgo: 160, initials: 'RB', category: 'labour', pricing: '₹300/day', availability: 'today', trustScore: 88, completedJobs: 132, skills: ['Field Labour', 'Harvest Crew'], responseMins: 6 },
    { id: 'p10', name: 'Dr. Shyam Rao', type: 'provider', village: 'Warangal', district: 'Warangal', state: 'Telangana', crop: 'Cotton', verified: true, rating: 4.8, reviews: 118, distanceKm: 6.1, badges: ['provider'], joinedDaysAgo: 340, initials: 'SR', category: 'consultant', pricing: '₹700/hour', availability: 'tomorrow', trustScore: 93, completedJobs: 87, skills: ['IPM', 'Fertigation Plan', 'Nutrient Mgmt'], responseMins: 9 },
    { id: 'p11', name: 'Kishan Mehta', type: 'provider', village: 'Nashik', district: 'Nashik', state: 'Maharashtra', crop: 'Grapes', verified: true, rating: 4.7, reviews: 64, distanceKm: 10.2, badges: ['provider'], joinedDaysAgo: 230, initials: 'KM', category: 'mechanic', pricing: '₹350/visit', availability: 'tomorrow', trustScore: 86, completedJobs: 54, skills: ['Tractor Repair', 'Pump Set', 'PTO Fix'], responseMins: 18 },
  ];

  const farmers: FarmerProfile[] = [
    { id: 'f1', name: 'Lakshmi Reddy', type: 'farmer', village: 'Kurnool', district: 'Kurnool', state: 'Andhra Pradesh', crop: 'Groundnut', verified: true, rating: 4.9, reviews: 42, distanceKm: 2.4, badges: ['farmer'], joinedDaysAgo: 260, initials: 'LR', farmerType: 'verified', farmSize: '8 acres', produce: ['Groundnut', 'Cotton'] },
    { id: 'f2', name: 'Jagdish Maurya', type: 'farmer', village: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh', crop: 'Bajra', verified: true, rating: 4.6, reviews: 28, distanceKm: 5.1, badges: ['farmer'], joinedDaysAgo: 180, initials: 'JM', farmerType: 'progressive', farmSize: '5 acres', produce: ['Bajra', 'Mustard'] },
    { id: 'f3', name: 'Sunita Wagh', type: 'farmer', village: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', crop: 'Turmeric', verified: true, rating: 4.8, reviews: 36, distanceKm: 3.8, badges: ['farmer'], joinedDaysAgo: 300, initials: 'SW', farmerType: 'organic', farmSize: '4 acres', produce: ['Turmeric', 'Ginger'] },
    { id: 'f4', name: 'Anwar Ali', type: 'farmer', village: 'Sikar', district: 'Sikar', state: 'Rajasthan', crop: 'Wheat', verified: true, rating: 4.7, reviews: 22, distanceKm: 7.9, badges: ['farmer'], joinedDaysAgo: 90, initials: 'AA', farmerType: 'young', farmSize: '6 acres', produce: ['Wheat', 'Barley'] },
    { id: 'f5', name: 'Kavita Rani', type: 'farmer', village: 'Ambala', district: 'Ambala', state: 'Haryana', crop: 'Rice', verified: true, rating: 4.9, reviews: 51, distanceKm: 4.4, badges: ['farmer'], joinedDaysAgo: 410, initials: 'KR', farmerType: 'women', farmSize: '3 acres', produce: ['Rice', 'Sesame'] },
    { id: 'f6', name: 'Baban Patil (FPO)', type: 'farmer', village: 'Kolhapur', district: 'Kolhapur', state: 'Maharashtra', crop: 'Sugarcane', verified: true, rating: 4.8, reviews: 67, distanceKm: 6.6, badges: ['farmer', 'buyer'], joinedDaysAgo: 520, initials: 'BP', farmerType: 'fpo', farmSize: '120 acres (FPO)', produce: ['Sugarcane', 'Maize'] },
    { id: 'f7', name: 'Dharmendra Sahani', type: 'farmer', village: 'Muzaffarpur', district: 'Muzaffarpur', state: 'Bihar', crop: 'Litchi', verified: false, rating: 4.3, reviews: 12, distanceKm: 3.3, badges: [], joinedDaysAgo: 45, initials: 'DS', farmerType: 'nearby', farmSize: '2 acres', produce: ['Litchi', 'Mango'] },
    { id: 'f8', name: 'Reena Sharma', type: 'farmer', village: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', crop: 'Guar', verified: true, rating: 4.7, reviews: 31, distanceKm: 5.5, badges: ['farmer'], joinedDaysAgo: 200, initials: 'RS', farmerType: 'progressive', farmSize: '7 acres', produce: ['Guar', 'Cumin'] },
  ];

  const buyers: Buyer[] = [
    { id: 'b1', name: 'Mahajan Traders', type: 'buyer', village: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', crop: 'All', verified: true, rating: 4.6, reviews: 89, distanceKm: 0, badges: ['buyer'], joinedDaysAgo: 480, initials: 'MT', buyerType: 'wholesaler', lookingFor: 'Soybean, Mustard, Pulses', minQty: '500 quintal', openToEnquiry: true },
    { id: 'b2', name: 'FreshMart Retail', type: 'buyer', village: 'Pune', district: 'Pune', state: 'Maharashtra', crop: 'Vegetables', verified: true, rating: 4.5, reviews: 54, distanceKm: 0, badges: ['buyer'], joinedDaysAgo: 300, initials: 'FR', buyerType: 'retailer', lookingFor: 'Tomato, Onion, Potato', minQty: '100 quintal', openToEnquiry: true },
    { id: 'b3', name: 'Amul Kisan Dairy', type: 'buyer', village: 'Anand', district: 'Anand', state: 'Gujarat', crop: 'Milk', verified: true, rating: 4.9, reviews: 210, distanceKm: 0, badges: ['buyer'], joinedDaysAgo: 800, initials: 'AK', buyerType: 'processor', lookingFor: 'Fresh milk, Fodder', minQty: '500 L/day', openToEnquiry: true },
    { id: 'b4', name: 'Global Spice Exports', type: 'buyer', village: 'Kochi', district: 'Ernakulam', state: 'Kerala', crop: 'Spices', verified: true, rating: 4.8, reviews: 76, distanceKm: 0, badges: ['buyer'], joinedDaysAgo: 380, initials: 'GS', buyerType: 'exporter', lookingFor: 'Turmeric, Chilli, Ginger', minQty: '1000 kg', openToEnquiry: true },
    { id: 'b5', name: 'Kisan FPO Federation', type: 'buyer', village: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', crop: 'All', verified: true, rating: 4.7, reviews: 63, distanceKm: 0, badges: ['buyer', 'farmer'], joinedDaysAgo: 550, initials: 'KF', buyerType: 'fpo', lookingFor: 'Wheat, Paddy, Pulses', minQty: '1000 quintal', openToEnquiry: true },
  ];

  const requirements: RequirementPost[] = [
    { id: 'r1', type: 'tractor', title: 'Need tractor for 5 acre plowing', description: 'Need a 45HP tractor with rotavator for land preparation near Shivpuri. Rate: ₹800/day.', location: 'Shivpuri, Indore', amount: '₹800/day', postedByName: 'Ramchandra Verma', createdAt: daysAgo(0), urgency: 'today', responses: 4, open: true },
    { id: 'r2', type: 'labour', title: 'Need 8 labourers for paddy transplant', description: 'Labour needed for 3 days for paddy transplanting. Food and transport provided.', location: 'Bahadurpur, Patna', amount: '₹300/day', postedByName: 'Anita Devi', createdAt: daysAgo(0), urgency: 'today', responses: 2, open: true },
    { id: 'r3', type: 'harvester', title: 'Combine harvester for wheat', description: 'Need combine harvester for 20 acre wheat harvest next week.', location: 'Sangrur, Punjab', amount: '₹1,100/acre', postedByName: 'Vikram Singh', createdAt: daysAgo(1), urgency: 'week', responses: 6, open: true },
    { id: 'r4', type: 'buyer', title: 'Selling 200 quintal soybean', description: 'Ready to sell this season soybean at market-linked price. Buyer contact welcome.', location: 'Mhow, Indore', amount: '₹4,200/quintal', postedByName: 'Lakshmi Reddy', createdAt: daysAgo(1), urgency: 'week', responses: 3, open: true },
    { id: 'r5', type: 'fertilizer', title: 'Bulk DAP + Urea requirement', description: 'Need DAP and Urea at cooperative rates for 30 acre wheat crop.', location: 'Varanasi, UP', amount: 'Best rate', postedByName: 'Jagdish Maurya', createdAt: daysAgo(2), urgency: 'flexible', responses: 5, open: true },
    { id: 'r6', type: 'cold-storage', title: 'Cold storage for 50 tonne onion', description: 'Need cold storage for onion stock for 3 months. Prefer near Nashik.', location: 'Nashik, Maharashtra', amount: '₹35/quintal', postedByName: 'Kishan Mehta', createdAt: daysAgo(2), urgency: 'week', responses: 1, open: true },
  ];

  const community: CommunityPost[] = [
    { id: 'c1', kind: 'tip', author: 'Dr. Shyam Rao', authorType: 'provider', text: 'Tip: For soybean at flowering stage, irrigate lightly before 9 AM. Heavy midday watering burns flowers in 40°C heat.', likes: 132, comments: 21, createdAt: daysAgo(0) },
    { id: 'c2', kind: 'success', author: 'Lakshmi Reddy', authorType: 'farmer', text: 'Success: Harvested 9 quintal/acre groundnut this season — 20% more than last year. Used soil-testing based fertilizer plan from the network. 🌾', likes: 210, comments: 34, createdAt: daysAgo(1) },
    { id: 'c3', kind: 'question', author: 'Anwar Ali', authorType: 'farmer', text: 'Question: My wheat leaves are turning yellow near the base. Is this nitrogen deficiency or yellow rust? Photos attached.', likes: 47, comments: 18, createdAt: daysAgo(1) },
    { id: 'c4', kind: 'gov', author: 'AgriConnect Team', authorType: 'provider', text: 'Govt update: PM-KISAN 17th installment begins this month. Check eligibility and update your bank details in your profile.', likes: 96, comments: 12, createdAt: daysAgo(2) },
    { id: 'c5', kind: 'photo', author: 'Sunita Wagh', authorType: 'farmer', text: 'My organic turmeric field at Nagpur — no chemicals for 3 years. Harvest in 2 weeks! 📷', likes: 154, comments: 26, createdAt: daysAgo(2) },
    { id: 'c6', kind: 'ai', author: 'AgriConnect AI', authorType: 'provider', ai: true, text: 'Discussions you may like: "Drone spraying rates in your area" and "Best time to sell soybean". Farmers near you are discussing both this week.', likes: 31, comments: 6, createdAt: daysAgo(0) },
  ];

  const reviews: Review[] = [
    { id: 'rv1', targetId: 'p1', author: 'Ramchandra Verma', rating: 5, comment: 'Ramesh bhaiya did excellent tilling. On time, fair rate, tractor in great condition.', createdAt: daysAgo(6) },
    { id: 'rv2', targetId: 'p5', author: 'Kavita Rani', rating: 5, comment: 'Dr. Meena treated my cow quickly. Very knowledgeable and gentle.', createdAt: daysAgo(12) },
    { id: 'rv3', targetId: 'p2', author: 'Gopal Kumar', rating: 4, comment: 'Harvest done on schedule. Only issue — combine arrived 1 hour late.', createdAt: daysAgo(20) },
  ];

  return {
    version: NETWORK_SEED_VERSION,
    myName: 'You',
    myVillage: 'Shivpuri',
    myCrop: 'Soybean',
    providers,
    farmers,
    buyers,
    requirements,
    community,
    reviews,
    threads: [],
    bookings: [
      {
        id: 'bk1',
        service: 'Tractor + Rotavator (3 acres)',
        providerName: 'Ramesh Yadav',
        providerId: 'p1',
        date: '2026-08-08',
        amount: '₹2,400',
        status: 'accepted',
        invoice: {
          id: 'INV-2026-0142',
          issuedAt: daysAgo(1),
          items: [
            { label: 'Plowing (3 acres × ₹800)', amount: '₹2,400' },
            { label: 'Rotavator (included)', amount: '₹0' },
          ],
          total: '₹2,400',
        },
        createdAt: daysAgo(2),
      },
      {
        id: 'bk2',
        service: 'Soil testing (2 samples)',
        providerName: 'Harpreet Kaur',
        providerId: 'p6',
        date: '2026-08-12',
        amount: '₹800',
        status: 'pending',
        createdAt: daysAgo(1),
      },
    ],
  };
}
