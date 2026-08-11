import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage, DEFAULT_FAQS } from '@/lib/seo-config';
import { faqSchema } from '@/lib/structured-data';
import { cn } from '@/lib/utils';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';

const EXTENDED_FAQS = [
  ...DEFAULT_FAQS,
  { q: 'How accurate is the AI Crop Doctor?', a: 'The Crop Doctor AI is trained on thousands of labelled Indian crop images and returns a diagnosis with a confidence percentage. It is a strong first-line advisory tool; for critical cases we always recommend confirming with your local agriculture officer (Kisan Salahkar).' },
  { q: 'Does AgriConnect show live mandi prices for my local mandi?', a: 'Yes. We aggregate APMC mandi data across all 28 states. Search your crop and your state to see today\'s minimum, maximum, and modal prices from your nearest mandis.' },
  { q: 'How do I rent a tractor on AgriConnect?', a: 'Go to the Tractor Rental section, set your location, browse verified tractors and harvesters nearby, compare hourly/acre rates, and book instantly. Owners are verified with farmer ID and phone.' },
  { q: 'Are there any hidden charges?', a: 'No. AgriConnect is free for farmers. Tractor booking and marketplace transactions are between you and the owner; we never charge hidden commissions on mandi price or scheme information.' },
  { q: 'How do I get government scheme alerts?', a: 'Enable notifications in the app and choose your state. We\'ll alert you about new instalments (like PM-KISAN), application deadlines, and eligibility updates for schemes in your state.' },
  { q: 'Can I use AgriConnect offline?', a: 'Yes. Core features like mandi price snapshots, crop guides, and your farm ledger work offline. When you reconnect, data syncs automatically.' },
  { q: 'Is my data safe with AgriConnect?', a: 'Absolutely. Your data is encrypted in transit and at rest, we follow Indian data protection principles, and we never sell your data to third parties.' },
  { q: 'What is the weather forecast coverage?', a: 'We provide hyperlocal, hourly and 7-day forecasts for every district in India, including rainfall probability, humidity, wind speed, and crop-stage-specific advisories.' },
  { q: 'How do I use the Soil Health feature?', a: 'Use the Soil Test section to locate a nearby soil testing lab or KVK, understand your Soil Health Card report, and get customized fertilizer recommendations based on the results.' },
  { q: 'Does AgriConnect support voice input?', a: 'Yes. You can use voice input in Hindi and other Indian languages to ask Kisan AI questions, search crops, or fill forms hands-free in the field.' },
  { q: 'Which languages does the app support?', a: 'AgriConnect supports 12 Indian languages: English, Hindi, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, Bengali, Odia, and Assamese.' },
  { q: 'How do I delete my account?', a: 'Go to Settings → Privacy → Delete Account. Your data will be removed from our systems within 30 days as per our privacy policy.' },
  // ── Mandi Prices ──
  { q: 'What is the modal price in a mandi?', a: 'The modal price is the rate at which the maximum number of transactions happened in a mandi on a given day. It is the most reliable indicator of the going market rate for your crop.' },
  { q: 'How often are mandi prices updated?', a: 'APMC mandi prices on AgriConnect are refreshed daily during mandi hours. Historical trends cover the last 30 days so you can spot seasonal highs and lows.' },
  { q: 'Why do mandi prices differ between two cities?', a: 'Prices differ due to local demand, crop arrival volumes, transportation cost, storage availability, quality grading, and seasonal supply. Compare across mandis to find the best sale point.' },
  { q: 'Can I set a price alert for my crop?', a: 'Yes. Star your crop and set a target rate. AgriConnect will notify you when the price reaches your target so you can decide the best day to sell.' },
  { q: 'What is MSP and how is it different from mandi price?', a: 'MSP (Minimum Support Price) is the government-guaranteed floor price for notified crops, while mandi price is the actual market rate which can be higher or lower than MSP on a given day.' },
  { q: 'How do I check today\'s onion price in Nashik mandi?', a: 'Open the Mandi section, choose Maharashtra and Nashik, then search for onion. You will see today\'s minimum, maximum, and modal prices along with the 30-day trend.' },
  { q: 'What is a commodity APMC?', a: 'An APMC (Agricultural Produce Market Committee) is the government-regulated market where farmers sell their produce through licensed traders. AgriConnect tracks live rates from these markets.' },
  { q: 'Can I sell directly to a buyer without a middleman?', a: 'Yes. The AgriConnect marketplace lets you connect directly with verified buyers. Direct selling can improve your margin by 15-30% compared to traditional mandi auctions.' },
  { q: 'Are the mandi prices free?', a: 'Yes, mandi bhav, price trends, and price alerts are 100% free for farmers. There is no subscription fee to check live market rates.' },
  // ── Weather ──
  { q: 'How accurate is the AgriConnect weather forecast?', a: 'We use high-resolution global models localized to your district. Short-range (1-3 day) forecasts are highly accurate, while 7-day outlooks help you plan sowing and spraying windows.' },
  { q: 'Can weather forecasts help with pesticide spraying?', a: 'Yes. AgriConnect shows wind speed and rain probability for the next 24 hours, helping you avoid spraying before rain or in high wind, which wastes chemicals and harms crops.' },
  { q: 'What does "hyperlocal weather" mean?', a: 'Hyperlocal means forecasts are generated for your specific village or farm location, not just your city, giving you more relevant rain and temperature data for decision-making.' },
  { q: 'Does AgriConnect provide monsoon onset alerts?', a: 'Yes, we send monsoon onset and intensity alerts for your district so you can time sowing, fertilizing, and harvesting accordingly.' },
  { q: 'What is the best time to irrigate based on weather?', a: 'Avoid irrigation when heavy rain is forecast within 24 hours. Watering in early morning or evening reduces evaporation. AgriConnect marks rain windows so you don\'t waste water.' },
  { q: 'Can I see hourly rainfall probability?', a: 'Yes, the weather dashboard shows hourly rainfall probability for the next 24 hours and daily totals for the 7-day outlook.' },
  // ── Crop Diseases / AI ──
  { q: 'Which crops does the Crop Doctor support?', a: 'The AI Crop Doctor covers major Indian crops including wheat, rice, paddy, cotton, maize, soybean, sugarcane, tomato, potato, chilli, onion, groundnut, and banana.' },
  { q: 'How do I take a good leaf photo for diagnosis?', a: 'Hold the camera 20-30 cm from the affected leaf in natural daylight. Include both healthy and affected parts, and avoid shadows. One clear close-up gives the most accurate result.' },
  { q: 'What diseases can the AI detect?', a: 'It detects common fungal, bacterial, and viral issues like leaf rust, blight, powdery mildew, wilt, leaf spot, and nutrient deficiency symptoms, with recommended treatments.' },
  { q: 'Is the AI diagnosis a replacement for a doctor?', a: 'No. Use it as an instant first opinion. For confirmed treatment, especially for large farms, we recommend your nearest KVK or agriculture officer (Kisan Salahkar).' },
  { q: 'What organic remedies are suggested?', a: 'The app suggests organic options like neem oil spray, cow-urine solution, and bio-fungicides before chemical treatments, so you can farm the way you prefer.' },
  { q: 'How can I prevent crop disease instead of curing it?', a: 'Prevention tips include using certified seeds, crop rotation, proper spacing, balanced fertilizer, and scanning fields weekly. AgriConnect sends disease alerts when conditions favor outbreaks.' },
  // ── Government Schemes ──
  { q: 'What is PM-KISAN?', a: 'PM-KISAN provides ₹6,000 per year in three installments of ₹2,000 to eligible landholding farmer families through direct bank transfer. Check eligibility and status on pmkisan.gov.in.' },
  { q: 'How do I apply for PM Fasal Bima Yojana?', a: 'Apply before the notified deadline through your bank, CSC center, or the PMFBY portal. Premiums are 2% for Kharif, 1.5% for Rabi, and 5% for commercial crops.' },
  { q: 'What is the Kisan Credit Card (KCC) interest rate?', a: 'KCC offers short-term crop loans at a 7% base rate with 3% interest subvention, bringing the effective rate to 4% per annum when repaid on time.' },
  { q: 'How do I check PM-KISAN installment status?', a: 'Visit pmkisan.gov.in, click Beneficiary Status, and enter your Aadhaar or mobile number to view your payment history and next installment date.' },
  { q: 'Which schemes are available in my state?', a: 'Open the Schemes section, select your state, and see state-specific schemes like Rythu Bandhu (Telangana), KALIA (Odisha), and Bhamashah (Rajasthan) along with central schemes.' },
  { q: 'What documents do I need for scheme applications?', a: 'Typically Aadhaar, bank passbook with linked mobile, land records (khasra), and a passport-size photo. Requirements vary by scheme, and the app lists them per scheme.' },
  { q: 'Can AgriConnect help me apply for schemes?', a: 'AgriConnect tracks deadlines, eligibility, and step-by-step application guidance. For central schemes like PM-KISAN you can complete much of the process from your phone.' },
  { q: 'What is the Soil Health Card scheme?', a: 'The Soil Health Card gives you a personalized report of your soil\'s nutrient status with fertilizer recommendations. AgriConnect helps you interpret the report and locate testing labs.' },
  // ── Tractor / Machinery ──
  { q: 'How much does tractor rental cost?', a: 'Rates vary by region, model, and job — typically ₹800-1,500 per hour or ₹1,500-2,500 per acre for tilling. AgriConnect shows live rates from verified owners near you.' },
  { q: 'Are the tractor owners verified?', a: 'Yes. Owners are verified with farmer ID, Aadhaar, and phone. You can also read ratings and reviews from other farmers before booking.' },
  { q: 'Can I book a harvester or rotavator too?', a: 'Yes. Beyond tractors, you can book harvesters, rotavators, threshers, and sprayers based on availability in your area.' },
  { q: 'What if the owner cancels my booking?', a: 'You will be notified immediately and can re-book from other available owners in your area. Deposits, if any, are refunded automatically.' },
  { q: 'Is there a minimum rental duration?', a: 'Minimums are set by the owner, usually 2-3 hours or half an acre, and are shown clearly before you book so there are no surprises.' },
  // ── Smart Farming / AI ──
  { q: 'What is smart farming?', a: 'Smart farming uses data, sensors, weather, and AI to make better decisions — like when to sow, irrigate, fertilize, and sell. AgriConnect puts these tools on any smartphone.' },
  { q: 'Can AI really increase my yield?', a: 'Yes. Farmers using AI crop advice on AgriConnect have reported yield gains of 15-30% by catching diseases earlier, watering smarter, and timing fertilizer application.' },
  { q: 'What is the AI Kisan assistant?', a: 'The Kisan AI is a conversational assistant that answers farming questions in Hindi and other Indian languages — from sowing depth to fertilizer doses — using verified agricultural data.' },
  { q: 'Do I need the internet to use AI features?', a: 'Basic crop guides and saved data work offline. Live AI diagnosis and mandi prices need an internet connection, but your offline actions sync automatically when you reconnect.' },
  { q: 'Is AgriConnect suitable for small farmers?', a: 'Absolutely. AgriConnect is built for smallholder farmers first — everything is free, works on low-end phones, and supports voice input for hands-free use in the field.' },
  // ── Soil / Fertilizer ──
  { q: 'How do I know which fertilizer my soil needs?', a: 'Get a soil test first. The Soil Health Card tells you NPK and micronutrient levels. AgriConnect converts your report into a simple per-acre fertilizer dose recommendation.' },
  { q: 'What is the difference between NPK and DAP?', a: 'NPK is a balanced fertilizer containing nitrogen, phosphorus, and potassium in fixed ratios. DAP is high in phosphorus, best for root development at sowing time.' },
  { q: 'When should I apply urea?', a: 'Apply urea at top-dressing stages when the crop needs nitrogen most — typically 20-30 days after sowing for wheat. Avoid applying before heavy rain to prevent leaching.' },
  { q: 'What is a soil testing lab and how do I find one?', a: 'A soil testing lab analyzes your soil\'s nutrient and pH levels. AgriConnect locates the nearest lab or KVK and guides you on how to collect a proper soil sample.' },
  { q: 'What does soil pH mean for my crop?', a: 'pH measures soil acidity or alkalinity. Most crops prefer 6.0-7.5. Highly acidic or alkaline soil locks up nutrients, and the app recommends lime or gypsum corrections.' },
  // ── Irrigation ──
  { q: 'What is drip irrigation?', a: 'Drip irrigation delivers water directly to plant roots through a network of pipes and emitters, saving 40-60% water compared to flood irrigation. It works well for cash crops like tomato and grape.' },
  { q: 'How much water does paddy need?', a: 'Paddy typically needs 1,200-2,000 mm of water per season, depending on variety and soil. AgriConnect\'s irrigation planner helps you track field-level water application.' },
  { q: 'What is the best irrigation method for wheat?', a: 'Wheat does well with 4-5 well-timed irrigations (tillering, jointing, boot, milking, and grain filling) rather than frequent light waterings. Timing matters more than volume.' },
  { q: 'How do I save water in summer irrigation?', a: 'Irrigate early morning or late evening, mulch the soil, use drip or sprinkler systems, and check the weather forecast to avoid watering before rain.' },
  // ── Organic Farming ──
  { q: 'What is organic farming?', a: 'Organic farming avoids synthetic fertilizers and pesticides, relying instead on compost, green manure, bio-pesticides, and crop rotation to maintain soil health and yield.' },
  { q: 'Is organic farming profitable in India?', a: 'Organic produce can command 20-50% higher prices, and input costs are lower after the transition period. Certification through PGS or NPOP helps access premium markets.' },
  { q: 'Which crops are best for organic farming?', a: 'High-value crops like turmeric, ginger, basmati rice, pulses, vegetables, and fruits are well-suited. Sikkim\'s success shows all crops can be grown organically with good management.' },
  { q: 'How do I make compost at home?', a: 'Layer green waste (leaves, kitchen waste) with dry matter and cow dung, keep it moist, and turn it every 10-15 days. Compost is ready in 60-90 days and enriches soil naturally.' },
  // ── Livestock ──
  { q: 'How do I manage my cattle on AgriConnect?', a: 'The Livestock section lets you track each animal\'s health, vaccination dates, milk records, and feed costs so you can spot problems early and control expenses.' },
  { q: 'What vaccinations do cows need?', a: 'Cows need vaccinations for Foot and Mouth Disease (twice a year), Haemorrhagic Septicaemia, and Black Quarter. Keep a vaccination calendar in the app to never miss a dose.' },
  { q: 'How do I improve milk yield?', a: 'Focus on good fodder, clean water, regular milking at fixed times, and timely breeding. Track each animal\'s production to identify underperformers early.' },
  // ── Community / Market ──
  { q: 'Can I buy farm inputs like seeds and fertilizer on AgriConnect?', a: 'Yes. The Agri Store lets you compare prices of certified seeds, fertilizers, and pesticides from verified sellers and order directly.' },
  { q: 'How do I list my produce for sale?', a: 'Go to the Marketplace, add your produce with quantity, quality grade, and expected price. Verified buyers in your region can connect with you directly.' },
  { q: 'Is there a farmer community on AgriConnect?', a: 'Yes. The community forum lets farmers share local advice, market information, and experiences in their own language, moderated to keep discussions helpful.' },
  // ── Account / Tech ──
  { q: 'How do I register on AgriConnect?', a: 'Download the app or open the website, tap Sign Up, enter your mobile number, and verify with OTP. Your profile takes less than 2 minutes to set up.' },
  { q: 'Can I use the same account on multiple phones?', a: 'Yes, your account works across devices. You can also log out from all devices at once from Settings if you suspect unauthorized access.' },
  { q: 'What happens if I lose my phone?', a: 'Log in from a new phone with your number and OTP. Your data is stored securely in the cloud, so your records, bookmarks, and settings come back automatically.' },
  { q: 'Does AgriConnect run on low-end Android phones?', a: 'Yes. AgriConnect is optimized to run smoothly on low-cost Android devices and works well on slow 3G/4G connections with an offline mode.' },
  { q: 'How do I get support if I face a problem?', a: 'Use the in-app help, contact us from the app, or reach our kisan helpdesk on WhatsApp. We respond within a few hours on working days.' },
  { q: 'Is there a desktop/web version?', a: 'Yes, AgriConnect is available as a web app on any browser, and it can be installed on your phone as a fast app-like PWA.' },
  { q: 'How do I update my bank details for scheme payments?', a: 'Update bank details in your profile and ensure your Aadhaar is linked to the bank account. Scheme departments pay directly to the Aadhaar-linked account.' },
  // ── General Farming ──
  { q: 'What is the Kharif season?', a: 'Kharif is the monsoon cropping season (June-October). Major Kharif crops include paddy, cotton, soybean, and maize, sown after the monsoon starts.' },
  { q: 'What is the Rabi season?', a: 'Rabi is the winter cropping season (October-March). Major Rabi crops include wheat, mustard, gram, and lentils, harvested in spring.' },
  { q: 'What is crop rotation and why is it important?', a: 'Crop rotation means growing different crops in the same field in sequence. It breaks pest cycles, restores soil nutrients, and reduces the need for fertilizer.' },
  { q: 'How do I choose the right seed variety?', a: 'Choose varieties recommended for your region and season, certified for yield and disease resistance. Check your state\'s recommended variety list and seed availability in the app.' },
  { q: 'What is integrated pest management (IPM)?', a: 'IPM combines monitoring, natural predators, resistant varieties, and only-as-last-resort chemicals to control pests with minimal cost and environmental impact.' },
  { q: 'What are bio-pesticides?', a: 'Bio-pesticides use natural organisms or substances like neem, trichoderma, and bacillus to control pests. They are safe for pollinators and leave no harmful residues.' },
  { q: 'How do I prevent post-harvest losses?', a: 'Harvest at the right moisture level, dry produce properly, use clean storage, and monitor for pests. AgriConnect\'s cold storage locator helps reduce spoilage.' },
  { q: 'How do I find cold storage near me?', a: 'The Cold Storage section lists verified storage facilities near you with capacity, rates, and contact details so you can store produce safely.' },
  { q: 'What is the best time to sow wheat in India?', a: 'Wheat is sown from mid-November to early December in most of India for the Rabi season. Timing varies by state, and AgriConnect sends sowing windows based on your district.' },
  { q: 'How do I manage stubble without burning it?', a: 'Use the Happy Seeder, straw management system, or mulching techniques. Burning damages soil and attracts fines — the app connects you to stubble-management machinery near you.' },
  { q: 'How can I get a better price for graded produce?', a: 'Grading and cleaning your produce before sale can lift prices 10-20%. Use sorting, grading, and packing guidance plus live rates to sell at the right time.' },
  { q: 'What is the benefit of joining a farmer producer organization (FPO)?', a: 'FPOs pool produce for bulk sales, access institutional credit, and negotiate better input prices. AgriConnect helps you find and connect with FPOs in your area.' },
  { q: 'How do I get crop insurance claims paid faster?', a: 'Report losses promptly via the PMFBY portal or app with photos, and complete crop cutting experiments. AgriConnect guides you through the claim steps and documents needed.' },
  { q: 'Can I track my farm expenses in the app?', a: 'Yes. The Farm Ledger tracks seeds, fertilizer, labor, and machinery costs per crop so you know your real profit and can plan next season.' },
  { q: 'How does AgriConnect help with farming in Hindi?', a: 'The full app is available in Hindi and 11 other Indian languages, with voice input, so farmers can use every feature in their mother tongue.' },
  { q: 'What is a KVK and how can it help me?', a: 'A Krishi Vigyan Kendra (KVK) is a farm science center that provides training, soil testing, seed distribution, and expert advice. AgriConnect locates the nearest KVK and shares its contact.' },
  { q: 'How do I check the quality of seeds before buying?', a: 'Buy certified seeds with the green tag from verified sellers in the Agri Store. Check the germination percentage, variety suitability, and expiry date before purchase.' },
  { q: 'What is zero budget natural farming?', a: 'Zero budget natural farming (ZBNF) uses local inputs like cow dung, urine, and mulching instead of purchased fertilizer and pesticide, cutting input costs while maintaining soil life.' },
  { q: 'How do I manage weeds without expensive chemicals?', a: 'Combine timely weeding, mulching, proper spacing, and intercropping. Cover crops suppress weeds naturally and improve soil health at the same time.' },
  { q: 'What is the ideal plant spacing for tomato?', a: 'Tomato plants are usually spaced 60-75 cm between rows and 45-60 cm within a row. Good spacing improves air flow and reduces fungal diseases.' },
  { q: 'How do I know if my soil needs lime?', a: 'If your soil pH is below 5.5, it is acidic and likely needs lime. Test your soil, then apply the recommended lime dose, ideally 2-3 months before sowing.' },
  { q: 'What should I do if my crop is attacked by locusts?', a: 'Report immediately to your state agriculture department and use recommended chemical sprays at dawn or dusk. AgriConnect provides local locust alerts and action guides.' },
  { q: 'How do I dry and store grains safely?', a: 'Dry grains to 12-14% moisture, clean them well, and store in clean, airtight containers in a cool dry place. Use neem leaves or approved fumigants to prevent weevil damage.' },
  { q: 'Can I get a loan for farming through the app?', a: 'AgriConnect guides you through Kisan Credit Card applications and connects you with banks and cooperative institutions offering crop loans at subsidized rates.' },
  { q: 'How do I find nearby mandis for my crop?', a: 'Use the Nearby Mandis feature to see mandis within your area with today\'s rates, distance, and travel time, so you can choose the most profitable market.' },
  { q: 'What is crop insurance and who should buy it?', a: 'Crop insurance like PMFBY protects you against crop loss from natural calamities, pests, and diseases. Every farmer growing notified crops should enrol to avoid financial ruin from a bad season.' },
  { q: 'How do I track market trends for the next season?', a: 'Review 30-day price trends and the seasonal calendar in the Mandi section. Historical patterns help you choose crops that fetch better prices at harvest time.' },
  // ── Ecosystem / AI Advisory ──
  { q: 'What makes AgriConnect a "complete digital agriculture ecosystem"?', a: 'AgriConnect connects farmers, service providers, buyers, and agri experts on a single intelligent platform — combining live mandi bhav, AI advisory, machinery rental, hyperlocal weather, crop disease detection, IoT soil monitoring, digital laser fencing, farm tasks, and a knowledge hub. It digitizes the full farming cycle, not just one service.' },
  { q: 'What is the pay-per-acre AI advisory model?', a: 'Instead of a costly flat subscription, AgriConnect offers personalized AI farm advisory priced per acre. Based on your crop, soil, weather, and farming stage, you get stage-wise guidance on sowing, fertilizer, irrigation, and pest control — affordable even for small and marginal farmers.' },
  { q: 'How does AgriConnect personalize my farm advisory?', a: 'The AI advisory is based on four inputs: your crop and variety, your soil test results, live weather in your area, and the current farming stage. This gives you recommendations that match your exact field conditions rather than generic advice.' },
  { q: 'What does the "new-age farmer" vision mean?', a: 'AgriConnect aims to create the new-age farmer by making advanced tools — AI, IoT, data, and market intelligence — accessible to every farmer through a simple mobile app, so even a smallholder can farm with the precision of a large enterprise.' },
  // ── Machinery Rental / Marketplace ──
  { q: 'Which farming equipment can I rent on AgriConnect?', a: 'Instead of owning expensive machines, you can find, compare, and book tractors, harvesters, threshers, seed drills, rotavators, sprayers, and tillers from nearby verified owners — with transparent hourly or per-acre rates.' },
  { q: 'Can I earn money by renting out my idle machinery?', a: 'Yes. If you own a tractor, harvester, thresher, seed drill, or rotavator that sits idle between jobs, list it on the marketplace and earn extra income by renting it to nearby farmers. Owners are verified and get bookings with clear ratings.' },
  { q: 'Is AgriConnect a marketplace as well as a service platform?', a: 'Yes. Beyond advisory, AgriConnect is a full agricultural marketplace and service platform — machinery rental, farm labor, cattle trade, transport, agri-store inputs, and direct produce selling all live in one place.' },
  // ── IoT & Farm Security ──
  { q: 'What is IoT soil moisture monitoring?', a: 'IoT soil moisture sensors placed in your field send real-time readings of soil moisture and temperature to the app. You irrigate only when your crop actually needs water — saving water, diesel, and labor while improving yield.' },
  { q: 'What is digital laser fencing for farms?', a: 'Digital laser fencing uses laser beams along your farm boundary to detect intrusions by animals or people and sends instant alerts to your phone — a smart, guard-free way to protect your crop day and night.' },
  { q: 'Can I manage my daily farming tasks in the app?', a: 'Yes. The farm tasks and crop calendar let you plan and track sowing, spraying, irrigation, fertilizer application, and harvesting with reminders — so no critical farm operation is ever missed.' },
];

const FAQ: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  const jsonLd = [faqSchema(EXTENDED_FAQS)];

  const toggle = (idx: number) => setOpen(open === idx ? null : idx);

  return (
    <>
      <SeoHead
        title="FAQ — Common Farmer Questions Answered | AgriConnect"
        description="Answers to common questions about mandi bhav prices, AI Crop Doctor, tractor rental, government schemes, weather forecasts, soil testing, languages, and data safety on AgriConnect."
        canonical="/faq"
        keywords={['farmers faq', 'kisan questions', 'mandi bhav faq', 'crop doctor faq', 'AgriConnect help', 'tractor rental faq']}
        ogType="website"
        ogImage={ogImage()}
        jsonLd={jsonLd}
      />

      <main className="min-h-screen bg-background pb-20">
        <header className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 text-white">
          <div className="responsive-container py-14 md:py-20 text-center">
            <MarketingBreadcrumb
              tone="light"
              items={[{ label: 'Home', path: '/' }, { label: 'FAQ' }]}
              className="justify-center"
            />
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-emerald-100/80 mt-3 max-w-2xl mx-auto text-lg">
              Quick answers to the most common questions from Indian farmers.
            </p>
          </div>
        </header>

        <div className="responsive-container py-10">
          <div className="space-y-3">
            {EXTENDED_FAQS.map((faq, idx) => (
              <div key={faq.q} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                <button
                  onClick={() => toggle(idx)}
                  aria-expanded={open === idx}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-foreground">{faq.q}</span>
                  <span
                    className={cn(
                      'shrink-0 text-muted-foreground transition-transform duration-200',
                      open === idx ? 'rotate-45' : 'rotate-0'
                    )}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                {open === idx && (
                  <div className="px-5 pb-4">
                    <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl gradient-hero text-primary-foreground p-6 text-center">
            <h2 className="font-bold text-xl">Still have questions?</h2>
            <p className="text-sm text-primary-foreground/80 mt-2">
              Our kisan support team is happy to help.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              <Link
                to="/contact"
                className="rounded-lg bg-white text-emerald-900 px-5 py-2.5 font-semibold text-sm hover:bg-emerald-50 transition"
              >
                Contact Us
              </Link>
              <Link
                to="/"
                className="rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 font-semibold text-sm hover:bg-white/20 transition"
              >
                Explore the App
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default FAQ;

