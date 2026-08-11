-- SEED MARKETPLACE LISTINGS: Labor, Cattle, Tractor
-- 
-- Moves previously hardcoded/mocked production data into the database so the
-- marketplace serves real records instead of in-memory sample lists.
--
-- Tables touched:
--   1. laborers            (seed real labor teams)
--   2. livestock           (seed real cattle directory for Pashu Mela)
--   3. cattle_listings     (seed real cattle marketplace listings)
--   4. tractor_listings    (NEW — seed real tractor & machinery hire catalog)
--
-- The tractor_hire edge function and the AgriStore/LaborHire/PashuMela/
-- CattleMarket components read these tables; their in-code fallback arrays
-- remain only as empty-database placeholders.

-- ── 1. Seed laborers ─────────────────────────────────────────────────────
INSERT INTO public.laborers (name, skill, location, rate, count, status) VALUES
  ('Raju Team',           'Harvesting',     'Rampura',        450, 5, 'Available'),
  ('Mukesh Bhai',         'Spraying',       'Sanganer',       600, 1, 'Available'),
  ('Sita Devi Group',     'Sowing/Weeding', 'Chomu',          400, 8, 'Busy'),
  ('Bharat Threshing',    'Threshing',      'Dausa',          550, 6, 'Available'),
  ('Gopal Verma Group',   'Ploughing',      'Baswa',          500, 4, 'Available'),
  ('Kavita Grafting',     'Grafting',       'Sikar',          650, 3, 'Busy'),
  ('Mahendra Team',       'Picking',        'Jaipur (Bassi)', 420, 9, 'Available'),
  ('Sunita Weeders',      'Weeding',        'Tonk',           380, 7, 'Available');

-- ── 2. Seed livestock directory (Pashu Mela) ─────────────────────────────
-- The PashuMela component reads a rich LivestockItem shape; the base table only
-- had name/breed/price/location/status, so extend it to match the UI fields.
ALTER TABLE public.livestock
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS milk TEXT,
  ADD COLUMN IF NOT EXISTS age TEXT,
  ADD COLUMN IF NOT EXISTS distance TEXT,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS seller TEXT,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

UPDATE public.livestock SET type = name WHERE type IS NULL;

INSERT INTO public.livestock
  (name, type, breed, milk, price, age, location, distance, image, seller, verified, status) VALUES
  ('Buffalo', 'Buffalo', 'Murrah',     '12L/day', 65000, '2 Lactation', 'Rampura',      '5 km',  'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=600', 'Ramesh Kumar',    true,  'Available'),
  ('Cow',     'Cow',     'Gir',        '14L/day', 55000, '1 Lactation', 'Sanganer',      '8 km',  'https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?auto=format&fit=crop&q=80&w=600', 'Suresh Patel',    true,  'Available'),
  ('Cow',     'Cow',     'Jersey',     '18L/day', 45000, '3 Lactation', 'Chomu',         '12 km', 'https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?auto=format&fit=crop&q=80&w=600', 'Meena Devi',      true,  'Available'),
  ('Buffalo', 'Buffalo', 'Nili Ravi',  '15L/day', 72000, '2 Lactation', 'Dausa',         '9 km',  'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=600', 'Vikram Jat',      true,  'Available'),
  ('Goat',    'Goat',    'Sirohi',     'N/A',     12000, '8 months',    'Baswa',         '14 km', 'https://images.unsplash.com/photo-1523851668568-0dbb67e0e3df?auto=format&fit=crop&q=80&w=600', 'Raju Meena',      true,  'Available'),
  ('Goat',    'Goat',    'Jamunapari', 'N/A',     15000, '10 months',   'Sikar',         '20 km', 'https://images.unsplash.com/photo-1523851668568-0dbb67e0e3df?auto=format&fit=crop&q=80&w=600', 'Kavita Sharma',   false, 'Busy'),
  ('Buffalo', 'Buffalo', 'Murrah',     '16L/day', 78000, '2 Lactation', 'Bassi',         '7 km',  'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=600', 'Mahendra Singh',  true,  'Available'),
  ('Cow',     'Cow',     'Sahiwal',    '16L/day', 60000, '2 Lactation', 'Tonk',          '18 km', 'https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?auto=format&fit=crop&q=80&w=600', 'Sunita Kumari',   true,  'Available'),
  ('Poultry', 'Poultry', 'Vannaraja',  'N/A',       450, '3 weeks',     'Chomu',         '12 km', 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=600', 'Gopal Verma',     true,  'Available'),
  ('Goat',    'Goat',    'Beetal',     'N/A',     18000, '1 year',      'Rampura',       '5 km',  'https://images.unsplash.com/photo-1523851668568-0dbb67e0e3df?auto=format&fit=crop&q=80&w=600', 'Suresh Patel',    true,  'Available');

-- ── 3. Seed cattle_listings marketplace ──────────────────────────────────
-- seller_id is NULL for platform-seeded listings; RLS lets these in and they
-- are marked verified since they came from the curated directory.
ALTER TABLE public.cattle_listings ALTER COLUMN seller_id DROP NOT NULL;

DROP POLICY IF EXISTS "Authenticated users can create listings" ON public.cattle_listings;
CREATE POLICY "Authenticated users can create listings" ON public.cattle_listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id OR seller_id IS NULL);

INSERT INTO public.cattle_listings
  (seller_id, type, breed, milk_yield, price, age, location, description, is_verified, is_active) VALUES
  (NULL, 'Buffalo', 'Murrah',     '12L/day', 65000, '2 Lactation', 'Rampura',  'High-yield Murrah buffalo, healthy and vaccinated.',            true,  true),
  (NULL, 'Cow',     'Gir',        '14L/day', 55000, '1 Lactation', 'Sanganer', 'Pure Gir cow, calm temperament, A2 milk.',                     true,  true),
  (NULL, 'Cow',     'Jersey',     '18L/day', 45000, '3 Lactation', 'Chomu',    'Strong Jersey cross, good feed conversion.',                   true,  true),
  (NULL, 'Buffalo', 'Nili Ravi',  '15L/day', 72000, '2 Lactation', 'Dausa',    'Nili Ravi with excellent fat content in milk.',                 true,  true),
  (NULL, 'Goat',    'Sirohi',     NULL,      12000, '8 months',    'Baswa',    'Sirohi goat bred for meat, disease resistant.',                 true,  true),
  (NULL, 'Goat',    'Jamunapari', NULL,      15000, '10 months',   'Sikar',    'Large Jamunapari doe, good milk producer.',                     true,  true),
  (NULL, 'Cow',     'Sahiwal',    '16L/day', 60000, '2 Lactation', 'Tonk',     'Indigenous Sahiwl, excellent for tropical climates.',           true,  true),
  (NULL, 'Poultry', 'Vannaraja',  NULL,        450, '3 weeks',     'Chomu',    'Dual-purpose backyard poultry birds.',                         true,  true);

-- ── 4. Tractor & machinery hire catalog ──────────────────────────────────
-- Full-featured table matching the tractor-hire edge function Listing shape.
CREATE TABLE IF NOT EXISTS public.tractor_listings (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  brand         TEXT NOT NULL,
  hp            INTEGER,
  implements    TEXT[] NOT NULL DEFAULT '{}',
  owner_id      TEXT NOT NULL,
  owner_name    TEXT NOT NULL,
  owner_name_hi TEXT,
  owner_phone   TEXT NOT NULL,
  owner_rating  NUMERIC,
  owner_jobs    INTEGER,
  owner_verified BOOLEAN DEFAULT false,
  owner_joined  TEXT,
  owner_response TEXT,
  owner_avatar  TEXT,
  owner_village TEXT,
  owner_city    TEXT,
  owner_state   TEXT,
  owner_lat     NUMERIC,
  owner_lng     NUMERIC,
  rate_hour     NUMERIC NOT NULL,
  rate_acre     NUMERIC NOT NULL,
  rate_day      NUMERIC NOT NULL,
  deposit       NUMERIC NOT NULL,
  rating        NUMERIC,
  reviews       INTEGER,
  status        TEXT NOT NULL DEFAULT 'available',
  next_available TEXT,
  year          INTEGER,
  engine        TEXT,
  lifting       TEXT,
  fuel          TEXT,
  cabin         BOOLEAN DEFAULT false,
  features      TEXT[] NOT NULL DEFAULT '{}',
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  lat           NUMERIC,
  lng           NUMERIC,
  color         TEXT,
  popular       BOOLEAN DEFAULT false,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tractor_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tractor_listings_public_select" ON public.tractor_listings FOR SELECT USING (true);
CREATE POLICY "tractor_listings_admin_all" ON public.tractor_listings FOR ALL
  USING (auth.role() = 'service_role');

ALTER PUBLICATION supabase_realtime ADD TABLE public.tractor_listings;

INSERT INTO public.tractor_listings (
  id, name, category, brand, hp, implements,
  owner_id, owner_name, owner_name_hi, owner_phone, owner_rating, owner_jobs, owner_verified, owner_joined, owner_response, owner_avatar, owner_village, owner_city, owner_state, owner_lat, owner_lng,
  rate_hour, rate_acre, rate_day, deposit, rating, reviews, status, next_available,
  year, engine, lifting, fuel, cabin, features, city, state, lat, lng, color, popular, description
) VALUES
  ('t-1', 'Mahindra 575 DI', 'Tractor', 'Mahindra', 45, ARRAY['Rotavator','Cultivator'], 'o-1', 'Ramesh Kumar', 'रमेश कुमार', '+919811000111', 4.9, 142, true, '2021', '< 10 min', 'RK', 'Gillanwala', 'Jaipur', 'Rajasthan', 26.9124, 75.7873, 800, 1200, 7000, 2000, 4.8, 86, 'available', 'Available now', 2021, '2730 cc', '1400 kg', 'Diesel', false, ARRAY['Hydraulic','Power Steering','GPS Fitted'], 'Jaipur', 'Rajasthan', 26.9124, 75.7873, '#16a34a', true, 'Well maintained 45 HP Mahindra with new rotavator. Best for ploughing and sowing on medium farms.'),
  ('t-2', 'Sonalika Tiger 55', 'Tractor', 'Sonalika', 55, ARRAY['Plough','Harvester'], 'o-2', 'Suresh Singh', 'सुरेश सिंह', '+919811000222', 4.6, 98, true, '2020', '< 30 min', 'SS', 'Dhana Kalan', 'Ludhiana', 'Punjab', 30.901, 75.8573, 900, 1400, 8000, 2500, 4.5, 61, 'busy', 'Today 5 PM', 2019, '3100 cc', '1600 kg', 'Diesel', false, ARRAY['Front Trolley Hook','Heavy Duty','Certified'], 'Ludhiana', 'Punjab', 30.901, 75.8573, '#2563eb', true, 'Powerful 55 HP Tiger for heavy operations. Currently engaged; available by evening.'),
  ('t-3', 'John Deere 5310', 'Tractor', 'John Deere', 55, ARRAY['Rotavator','Plough'], 'o-3', 'Vikram Jat', 'विक्रम जाट', '+919811000333', 5, 210, true, '2019', '< 5 min', 'VJ', 'Chhani', 'Bharatpur', 'Rajasthan', 27.2173, 77.4901, 1100, 1600, 10000, 3000, 4.9, 128, 'available', 'Available now', 2022, '2900 cc', '1750 kg', 'Diesel', true, ARRAY['AC Cabin','8+8 Syncro','Telematics'], 'Bharatpur', 'Rajasthan', 27.2173, 77.4901, '#ca8a04', true, 'Premium John Deere with AC cabin and GPS. Ideal for large landholdings and contract work.'),
  ('t-4', 'Swaraj 855', 'Tractor', 'Swaraj', 52, ARRAY['Seeder','Cultivator'], 'o-4', 'Amit Patel', 'अमित पटेल', '+919811000444', 4.7, 121, true, '2020', '< 15 min', 'AP', 'Pratapgarh', 'Kanpur', 'Uttar Pradesh', 26.4499, 80.3319, 850, 1300, 7500, 2000, 4.6, 74, 'available', 'Available now', 2018, '2900 cc', '1300 kg', 'Diesel', false, ARRAY['Synchronised Gearbox','Compact'], 'Kanpur', 'Uttar Pradesh', 26.4499, 80.3319, '#dc2626', false, 'Reliable Swaraj with good fuel efficiency for small to medium farms.'),
  ('t-5', 'Massey Ferguson 241', 'Tractor', 'Massey Ferguson', 42, ARRAY['Rotavator','Plough'], 'o-5', 'Gurmeet Singh', 'गुरमीत सिंह', '+919811000555', 4.4, 87, true, '2021', '< 20 min', 'GS', 'Bhadaur', 'Barnala', 'Punjab', 30.3738, 75.5484, 780, 1250, 6900, 2000, 4.4, 53, 'available', 'Available now', 2020, '2600 cc', '1350 kg', 'Diesel', false, ARRAY['Power Steering','Low Fuel Consumption'], 'Barnala', 'Punjab', 30.3738, 75.5484, '#9333ea', false, 'Fuel-efficient MF 241 ideal for ploughing and light hauling.'),
  ('t-6', 'Kubota M5-091', 'Harvester', 'Kubota', NULL, ARRAY['Wheat','Paddy'], 'o-6', 'Dilip Mahato', 'दिलीप महतो', '+919811000666', 4.8, 76, true, '2022', '< 10 min', 'DM', 'Makhdumpur', 'Jehanabad', 'Bihar', 25.2151, 84.9883, 2400, 2200, 22000, 5000, 4.8, 44, 'available', 'Available now', 2023, '3100 cc', '0 kg', 'Diesel', true, ARRAY['Self Propelled','18 ft Header','Straw Baler'], 'Jehanabad', 'Bihar', 25.2151, 84.9883, '#0891b2', true, 'Modern combine harvester with 18 ft header. Perfect for wheat and paddy harvest season.'),
  ('t-7', 'Mahindra Rotavator 4FT', 'Rotavator', 'Mahindra', NULL, ARRAY['Ploughing','Seedbed'], 'o-7', 'Prakash Nair', 'प्रकाश नायर', '+919811000777', 4.5, 132, true, '2020', '< 15 min', 'PN', 'Vellayani', 'Thiruvananthapuram', 'Kerala', 8.4371, 76.9826, 550, 900, 5000, 1500, 4.5, 92, 'available', 'Available now', 2022, '0 cc', '0 kg', 'PTO Driven', false, ARRAY['Heavy Duty Blades','360° PTO','Depth Control'], 'Thiruvananthapuram', 'Kerala', 8.4371, 76.9826, '#16a34a', true, '4 ft heavy-duty rotavator that mounts on any 35-55 HP tractor. Great for seedbed preparation.'),
  ('t-8', 'Sonalika Plough 3-Typr', 'Plough', 'Sonalika', NULL, ARRAY['Mould Board'], 'o-8', 'Ravi Yadav', 'रवि यादव', '+919811000888', 4.3, 65, false, '2023', '< 40 min', 'RY', 'Sarai', 'Varanasi', 'Uttar Pradesh', 25.3176, 82.9739, 500, 850, 4500, 1200, 4.2, 37, 'available', 'Available now', 2021, '0 cc', '0 kg', 'PTO Driven', false, ARRAY['Mould Board Plough','Disc Attachment'], 'Varanasi', 'Uttar Pradesh', 25.3176, 82.9739, '#ca8a04', false, '3-tyne mould board plough for deep tilling. Pairs with 40+ HP tractors.'),
  ('t-9', 'Kubota M7-171', 'Tractor', 'Kubota', 170, ARRAY['Rotavator','Plough','Seeder'], 'o-9', 'Harpreet Kaur', 'हरप्रीत कौर', '+919811000999', 4.7, 58, true, '2022', '< 10 min', 'HK', 'Khera', 'Mansa', 'Punjab', 29.9884, 75.3832, 1800, 2500, 16000, 4500, 4.7, 29, 'busy', 'Tomorrow 8 AM', 2023, '6100 cc', '3100 kg', 'Diesel', true, ARRAY['AC Cabin','Powershift 24x24','Auto Guidance'], 'Mansa', 'Punjab', 29.9884, 75.3832, '#0891b2', true, 'High horsepower Kubota for contractors. Auto-guidance ready for precision farming.'),
  ('t-10', 'Swaraj XT Tractor', 'Tractor', 'Swaraj', 42, ARRAY['Rotavator'], 'o-10', 'Mahesh Gowda', 'महेश गौड़ा', '+919822000111', 4.6, 110, true, '2020', '< 20 min', 'MG', 'Hosahalli', 'Mysuru', 'Karnataka', 12.2958, 76.6394, 700, 1100, 6200, 1800, 4.6, 83, 'available', 'Available now', 2020, '2700 cc', '1250 kg', 'Diesel', false, ARRAY['Tilt Steering','Dual Clutch'], 'Mysuru', 'Karnataka', 12.2958, 76.6394, '#16a34a', false, 'Dependable Swaraj XT for inter-cultivation and hauling. Driver available.'),
  ('t-11', 'FieldKing Harvester', 'Harvester', 'FieldKing', NULL, ARRAY['Paddy','Soybean'], 'o-11', 'Nilesh Pawar', 'निलेश पवार', '+919822000222', 4.4, 71, true, '2021', '< 15 min', 'NP', 'Manjari', 'Pune', 'Maharashtra', 18.5204, 73.8567, 2200, 2100, 20000, 5000, 4.4, 39, 'maintenance', 'In 2 days', 2021, '3400 cc', '0 kg', 'Diesel', true, ARRAY['Comfort Cabin','Paddy Header','Auto Level'], 'Pune', 'Maharashtra', 18.5204, 73.8567, '#dc2626', false, 'FieldKing harvester under routine maintenance. Back in service shortly.'),
  ('t-12', 'Tirth Agro Seed Drill', 'Seeder', 'Tirth', NULL, ARRAY['Seed Drill','Fertilizer'], 'o-12', 'Karan Rathore', 'करण राठौड़', '+919822000333', 4.6, 94, true, '2019', '< 10 min', 'KR', 'Semari', 'Kota', 'Rajasthan', 25.2138, 75.8648, 600, 1000, 5400, 1500, 4.6, 58, 'available', 'Available now', 2022, '0 cc', '0 kg', 'PTO Driven', false, ARRAY['9 Row','Fertilizer Hopper','Zero Till'], 'Kota', 'Rajasthan', 25.2138, 75.8648, '#9333ea', true, '9-row zero-till seed drill with fertilizer attachment for faster sowing.'),
  ('t-13', 'VST 30HP Tractor', 'Tractor', 'VST', 30, ARRAY['Cultivator'], 'o-13', 'Sundar Rajan', 'सुंदर राजन', '+919822000444', 4.5, 66, true, '2021', '< 25 min', 'SR', 'Kallakurichi', 'Villupuram', 'Tamil Nadu', 11.74, 78.995, 620, 950, 5600, 1500, 4.5, 41, 'available', 'Available now', 2019, '1800 cc', '900 kg', 'Diesel', false, ARRAY['Compact','Orchard Friendly'], 'Villupuram', 'Tamil Nadu', 11.74, 78.995, '#2563eb', false, 'Compact 30 HP VST perfect for orchards and inter-row operations.'),
  ('t-14', 'Balwan Thresher', 'Thresher', 'Balwan', NULL, ARRAY['Wheat','Mustard'], 'o-14', 'Mohit Bishnoi', 'मोहित बिश्नोई', '+919822000555', 4.2, 47, false, '2023', '< 45 min', 'MB', 'Abhorsar', 'Bikaner', 'Rajasthan', 28.0229, 73.3119, 750, 800, 6500, 2000, 4.1, 22, 'available', 'Available now', 2021, '0 cc', '0 kg', 'PTO Driven', false, ARRAY['Grain Cleaner','Bagging Unit'], 'Bikaner', 'Rajasthan', 28.0229, 73.3119, '#ca8a04', false, 'High capacity thresher for wheat and mustard with integrated grain cleaner.'),
  ('t-15', 'New Holland 5630', 'Tractor', 'New Holland', 57, ARRAY['Rotavator','Plough','Baler'], 'o-15', 'Rajdeep Gill', 'राजदीप गिल', '+919822000666', 4.8, 134, true, '2019', '< 8 min', 'RG', 'Mehal Kalan', 'Moga', 'Punjab', 30.8165, 75.1681, 1000, 1500, 9000, 2500, 4.8, 96, 'available', 'Available now', 2022, '2800 cc', '1800 kg', 'Diesel', true, ARRAY['AC Cabin','24x8 Transmission','Baler Kit'], 'Moga', 'Punjab', 30.8165, 75.1681, '#16a34a', true, 'Versatile New Holland with baler kit. Great all-rounder for North Indian farming.'),
  ('t-16', 'Shaktiman Cultivator', 'Cultivator', 'Shaktiman', NULL, ARRAY['Interculture'], 'o-16', 'Bhavesh Solanki', 'भावेश सोलंकी', '+919822000777', 4.3, 58, true, '2022', '< 20 min', 'BS', 'Mehsana', 'Ahmedabad', 'Gujarat', 23.0225, 72.5714, 480, 820, 4300, 1200, 4.3, 33, 'available', 'Available now', 2020, '0 cc', '0 kg', 'PTO Driven', false, ARRAY['11 Tyne','Adjustable Depth','Spring Loaded'], 'Ahmedabad', 'Gujarat', 23.0225, 72.5714, '#0891b2', false, '11-tyne spring-loaded cultivator for fast interculture and weed control.'),
  ('t-17', 'Crompton Sprayer', 'Sprayer', 'Crompton', NULL, ARRAY['Pesticide','Weedicide'], 'o-17', 'Sujata Kulkarni', 'सुजाता कुलकर्णी', '+919822000888', 4.5, 72, true, '2021', '< 15 min', 'SK', 'Lasalgaon', 'Nashik', 'Maharashtra', 20.1427, 74.2235, 420, 700, 3800, 1000, 4.5, 49, 'available', 'Available now', 2023, '0 cc', '0 kg', 'PTO Driven', false, ARRAY['600 L Tank','Boom 12 m','Auto Mix'], 'Nashik', 'Maharashtra', 20.1427, 74.2235, '#16a34a', false, '600 litre boom sprayer with 12 m coverage for vineyards and vegetable farms.'),
  ('t-18', 'Eicher 548 Tractor', 'Tractor', 'Eicher', 48, ARRAY['Cultivator','Trolley'], 'o-18', 'Lokesh Reddy', 'लोकेश रेड्डी', '+919822000999', 4.4, 89, true, '2020', '< 18 min', 'LR', 'Medak', 'Hyderabad', 'Telangana', 17.385, 78.4867, 760, 1200, 6800, 2000, 4.4, 57, 'available', 'Available now', 2019, '2800 cc', '1350 kg', 'Diesel', false, ARRAY['Trolley Kit','Power Steering'], 'Hyderabad', 'Telangana', 17.385, 78.4867, '#2563eb', false, 'Sturdy Eicher with trolley kit for transport and light field work.'),
  ('t-19', 'CLAAS Dominator', 'Harvester', 'CLAAS', NULL, ARRAY['Paddy','Maize'], 'o-19', 'Anil Kumar', 'अनिल कुमार', '+919833000111', 4.7, 52, true, '2022', '< 12 min', 'AK', 'Palladam', 'Coimbatore', 'Tamil Nadu', 10.9957, 77.2536, 2600, 2400, 24000, 6000, 4.7, 31, 'available', 'Available now', 2023, '3600 cc', '0 kg', 'Diesel', true, ARRAY['GPS Yield Map','20 ft Header','Rotary Separator'], 'Coimbatore', 'Tamil Nadu', 10.9957, 77.2536, '#ca8a04', true, 'Premium CLAAS combine with GPS yield mapping. For large commercial harvests.'),
  ('t-20', 'Preet Plough', 'Plough', 'Preet', NULL, ARRAY['Disc Harrow'], 'o-20', 'Simran Sandhu', 'सिमरन संधू', '+919833000222', 4.6, 63, true, '2021', '< 10 min', 'SS2', 'Doraha', 'Ludhiana', 'Punjab', 30.8158, 76.1028, 520, 880, 4700, 1300, 4.6, 40, 'available', 'Available now', 2021, '0 cc', '0 kg', 'PTO Driven', false, ARRAY['Disc Harrow','Dual Gang'], 'Ludhiana', 'Punjab', 30.8158, 76.1028, '#9333ea', false, 'Heavy disc harrow for secondary tillage and clod breaking.'),
  ('t-21', 'Farmtrac 60 PowerMax', 'Tractor', 'Farmtrac', 60, ARRAY['Rotavator','Plough','Forklift'], 'o-21', 'Dhananjay Verma', 'धनंजय वर्मा', '+919833000333', 4.5, 77, true, '2020', '< 15 min', 'DV', 'Belwa', 'Gorakhpur', 'Uttar Pradesh', 26.7606, 83.3732, 920, 1350, 8200, 2500, 4.5, 55, 'maintenance', 'Tomorrow 11 AM', 2020, '3000 cc', '1600 kg', 'Diesel', false, ARRAY['Forklift Ready','8+2 Shift'], 'Gorakhpur', 'Uttar Pradesh', 26.7606, 83.3732, '#dc2626', false, 'Farmtrac 60 with forklift capability. Brief maintenance window currently.'),
  ('t-22', 'VST Shakti DI', 'Tractor', 'VST', 32, ARRAY['Rotavator','Water Pump'], 'o-22', 'Ganesh Hegde', 'गणेश हेगड़े', '+919833000444', 4.5, 68, true, '2021', '< 20 min', 'GH', 'Barkur', 'Udupi', 'Karnataka', 13.3409, 74.7452, 640, 980, 5800, 1500, 4.5, 46, 'available', 'Available now', 2022, '2000 cc', '950 kg', 'Diesel', false, ARRAY['Water Pump PTO','Compact','Oil Immersed Brakes'], 'Udupi', 'Karnataka', 13.3409, 74.7452, '#16a34a', false, 'Compact VST with PTO water pump, ideal for smallholdings and coastal farms.'),
  ('t-23', 'Kubota Rice Transplanter', 'Seeder', 'Kubota', NULL, ARRAY['Rice Planting'], 'o-23', 'Bibhuti Mohanty', 'बिभूति मोहंती', '+919833000555', 4.6, 41, true, '2022', '< 12 min', 'BM', 'Kendrapara', 'Bhubaneswar', 'Odisha', 20.2961, 85.8245, 1900, 2000, 17000, 4000, 4.6, 26, 'available', 'Available now', 2023, '1500 cc', '0 kg', 'Diesel', false, ARRAY['8 Row','Auto Leveling','Seedling Tray'], 'Bhubaneswar', 'Odisha', 20.2961, 85.8245, '#0891b2', true, '8-row rice transplanter that cuts planting time by 70%. Auto leveling for paddy fields.'),
  ('t-24', 'New Holland Drip Sprayer', 'Sprayer', 'New Holland', NULL, ARRAY['Drip','Foliar'], 'o-24', 'Fatima Sheikh', 'फातिमा शेख', '+919833000666', 4.4, 54, true, '2021', '< 15 min', 'FS', 'Uran', 'Navi Mumbai', 'Maharashtra', 18.8782, 72.9394, 450, 750, 4000, 1100, 4.4, 35, 'available', 'Available now', 2022, '0 cc', '0 kg', 'PTO Driven', false, ARRAY['800 L Tank','Foliar Kit','Drip Ready'], 'Navi Mumbai', 'Maharashtra', 18.8782, 72.9394, '#9333ea', false, 'Large-capacity sprayer for drip fertigation and foliar feeding.');
