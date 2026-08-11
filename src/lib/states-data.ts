/**
 * Indian States & Mandi Cities Dataset for Local SEO Landing Pages.
 * Powers /mandi-prices/[state], /schemes/[state], /weather/[city], /tractor-rental/[city]
 */

export interface MandiCity {
  name: string;
  slug: string;
  state: string;
  stateSlug: string;
  famousCrops: string[];
  majorMandis: string[];
}

export interface StateData {
  name: string;
  slug: string;
  capital: string;
  region: string;
  language: string;
  majorCrops: string[];
  keySchemes: string[];
  majorCities: string[];
  mandiCount: number;
}

export const INDIAN_STATES: StateData[] = [
  { name: 'Rajasthan', slug: 'rajasthan', capital: 'Jaipur', region: 'North India', language: 'Hindi', majorCrops: ['Bajra', 'Wheat', 'Mustard', 'Groundnut', 'Cotton', 'Cumin'], keySchemes: ['PM-KISAN', 'Bhamashah Yojana', 'Soil Health Card', 'Mukhyamantri Kisan Kalyan Yojana'], majorCities: ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Udaipur'], mandiCount: 380 },
  { name: 'Maharashtra', slug: 'maharashtra', capital: 'Mumbai', region: 'West India', language: 'Marathi', majorCrops: ['Soybean', 'Cotton', 'Sugarcane', 'Onion', 'Tur', 'Grapes'], keySchemes: ['PM-KISAN', 'Balasaheb Thackeray Shetkari Sanman', 'Namo Shetkari', 'Soil Health Card'], majorCities: ['Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur'], mandiCount: 300 },
  { name: 'Uttar Pradesh', slug: 'uttar-pradesh', capital: 'Lucknow', region: 'North India', language: 'Hindi', majorCrops: ['Wheat', 'Sugarcane', 'Potato', 'Rice', 'Mustard', 'Lentils'], keySchemes: ['PM-KISAN', 'Kisan Samman Nidhi', 'Soil Health Card', 'Free power for farmers'], majorCities: ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut'], mandiCount: 400 },
  { name: 'Madhya Pradesh', slug: 'madhya-pradesh', capital: 'Bhopal', region: 'Central India', language: 'Hindi', majorCrops: ['Soybean', 'Wheat', 'Gram', 'Masoor', 'Cotton', 'Maize'], keySchemes: ['PM-KISAN', 'Mukhyamantri Kisan Kalyan Yojana', 'Soil Health Card', 'Teerth Darshan Yojana'], majorCities: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain'], mandiCount: 350 },
  { name: 'Punjab', slug: 'punjab', capital: 'Chandigarh', region: 'North India', language: 'Punjabi', majorCrops: ['Wheat', 'Rice', 'Maize', 'Cotton', 'Potato', 'Mustard'], keySchemes: ['PM-KISAN', 'Punjab Kisan Yojana', 'Soil Health Card', 'Free electricity for farmers'], majorCities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda'], mandiCount: 200 },
  { name: 'Haryana', slug: 'haryana', capital: 'Chandigarh', region: 'North India', language: 'Hindi', majorCrops: ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Mustard', 'Bajra'], keySchemes: ['PM-KISAN', 'Haryana Kisan Yojana', 'Soil Health Card', 'Meri Fasal Mera Byora'], majorCities: ['Karnal', 'Gurugram', 'Hisar', 'Rohtak', 'Panipat'], mandiCount: 180 },
  { name: 'Gujarat', slug: 'gujarat', capital: 'Gandhinagar', region: 'West India', language: 'Gujarati', majorCrops: ['Cotton', 'Groundnut', 'Cumin', 'Isabgol', 'Wheat', 'Banana'], keySchemes: ['PM-KISAN', 'Mukhyamantri Kisan Yojana', 'Soil Health Card', 'Sardar Patel Yojana'], majorCities: ['Ahmedabad', 'Rajkot', 'Surat', 'Vadodara', 'Bhavnagar'], mandiCount: 250 },
  { name: 'Karnataka', slug: 'karnataka', capital: 'Bengaluru', region: 'South India', language: 'Kannada', majorCrops: ['Ragi', 'Rice', 'Sugarcane', 'Cotton', 'Sunflower', 'Arecanut'], keySchemes: ['PM-KISAN', 'Karnataka Raitha Suraksha', 'Soil Health Card', 'Fasal Bima'], majorCities: ['Bengaluru', 'Mysuru', 'Hubballi', 'Belagavi', 'Kalaburagi'], mandiCount: 280 },
  { name: 'Tamil Nadu', slug: 'tamil-nadu', capital: 'Chennai', region: 'South India', language: 'Tamil', majorCrops: ['Rice', 'Sugarcane', 'Cotton', 'Groundnut', 'Turmeric', 'Banana'], keySchemes: ['PM-KISAN', 'Tamil Nadu Kisan Yojana', 'Soil Health Card', 'Free power for farmers'], majorCities: ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Erode'], mandiCount: 300 },
  { name: 'Andhra Pradesh', slug: 'andhra-pradesh', capital: 'Amaravati', region: 'South India', language: 'Telugu', majorCrops: ['Rice', 'Cotton', 'Chilli', 'Groundnut', 'Sugarcane', 'Tobacco'], keySchemes: ['PM-KISAN', 'AP Rythu Bharosa', 'Soil Health Card', 'Fasal Bima'], majorCities: ['Vijayawada', 'Guntur', 'Visakhapatnam', 'Tirupati', 'Kurnool'], mandiCount: 260 },
  { name: 'Telangana', slug: 'telangana', capital: 'Hyderabad', region: 'South India', language: 'Telugu', majorCrops: ['Cotton', 'Rice', 'Maize', 'Chilli', 'Tur', 'Soybean'], keySchemes: ['PM-KISAN', 'Rythu Bandhu', 'Rythu Bima', 'Soil Health Card'], majorCities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'], mandiCount: 220 },
  { name: 'Bihar', slug: 'bihar', capital: 'Patna', region: 'East India', language: 'Hindi', majorCrops: ['Rice', 'Wheat', 'Maize', 'Lentils', 'Potato', 'Sugarcane'], keySchemes: ['PM-KISAN', 'Bihar Kisan Yojana', 'Soil Health Card', 'Fasal Bima'], majorCities: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga'], mandiCount: 300 },
  { name: 'West Bengal', slug: 'west-bengal', capital: 'Kolkata', region: 'East India', language: 'Bengali', majorCrops: ['Rice', 'Jute', 'Potato', 'Mustard', 'Tea', 'Sugarcane'], keySchemes: ['PM-KISAN', 'West Bengal Kisan Yojana', 'Soil Health Card', 'Fasal Bima'], majorCities: ['Kolkata', 'Howrah', 'Bardhaman', 'Siliguri', 'Malda'], mandiCount: 320 },
  { name: 'Odisha', slug: 'odisha', capital: 'Bhubaneswar', region: 'East India', language: 'Odia', majorCrops: ['Rice', 'Maize', 'Groundnut', 'Millets', 'Tur', 'Sugarcane'], keySchemes: ['PM-KISAN', 'Odisha KALIA Yojana', 'Soil Health Card', 'Fasal Bima'], majorCities: ['Bhubaneswar', 'Cuttack', 'Berhampur', 'Rourkela', 'Sambalpur'], mandiCount: 200 },
  { name: 'Kerala', slug: 'kerala', capital: 'Thiruvananthapuram', region: 'South India', language: 'Malayalam', majorCrops: ['Coconut', 'Rubber', 'Rice', 'Spices', 'Banana', 'Tapioca'], keySchemes: ['PM-KISAN', 'Kerala Kisan Yojana', 'Soil Health Card', 'Fasal Bima'], majorCities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur'], mandiCount: 150 },
  { name: 'Chhattisgarh', slug: 'chhattisgarh', capital: 'Raipur', region: 'Central India', language: 'Hindi', majorCrops: ['Rice', 'Maize', 'Soybean', 'Groundnut', 'Tur', 'Mustard'], keySchemes: ['PM-KISAN', 'Rajiv Gandhi Kisan Nyay Yojana', 'Soil Health Card', 'Fasal Bima'], majorCities: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Rajnandgaon'], mandiCount: 180 },
  { name: 'Jharkhand', slug: 'jharkhand', capital: 'Ranchi', region: 'East India', language: 'Hindi', majorCrops: ['Rice', 'Maize', 'Pulses', 'Oilseeds', 'Vegetables', 'Sugarcane'], keySchemes: ['PM-KISAN', 'Jharkhand Kisan Yojana', 'Soil Health Card', 'Fasal Bima'], majorCities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar'], mandiCount: 150 },
  { name: 'Assam', slug: 'assam', capital: 'Dispur', region: 'North East India', language: 'Assamese', majorCrops: ['Rice', 'Tea', 'Jute', 'Mustard', 'Potato', 'Sugarcane'], keySchemes: ['PM-KISAN', 'Assam Kisan Yojana', 'Soil Health Card', 'Fasal Bima'], majorCities: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tezpur'], mandiCount: 120 },
  { name: 'Uttarakhand', slug: 'uttarakhand', capital: 'Dehradun', region: 'North India', language: 'Hindi', majorCrops: ['Rice', 'Wheat', 'Millets', 'Pulses', 'Oilseeds', 'Fruits'], keySchemes: ['PM-KISAN', 'Uttarakhand Kisan Yojana', 'Soil Health Card', 'Fasal Bima'], majorCities: ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Haldwani'], mandiCount: 90 },
  { name: 'Himachal Pradesh', slug: 'himachal-pradesh', capital: 'Shimla', region: 'North India', language: 'Hindi', majorCrops: ['Apple', 'Wheat', 'Maize', 'Rice', 'Vegetables', 'Ginger'], keySchemes: ['PM-KISAN', 'HP Kisan Yojana', 'Soil Health Card', 'Fasal Bima'], majorCities: ['Shimla', 'Mandi', 'Solan', 'Kangra', 'Hamirpur'], mandiCount: 80 },
  { name: 'Goa', slug: 'goa', capital: 'Panaji', region: 'West India', language: 'Konkani', majorCrops: ['Rice', 'Coconut', 'Cashew', 'Arecanut', 'Pineapple', 'Banana'], keySchemes: ['PM-KISAN', 'Goa Kisan Yojana', 'Soil Health Card', 'Fasal Bima'], majorCities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'], mandiCount: 30 },
  { name: 'Arunachal Pradesh', slug: 'arunachal-pradesh', capital: 'Itanagar', region: 'North East India', language: 'English', majorCrops: ['Rice', 'Maize', 'Millets', 'Kiwi', 'Oranges', 'Ginger'], keySchemes: ['PM-KISAN', 'AP Kisan Yojana', 'Soil Health Card'], majorCities: ['Itanagar', 'Naharlagun', 'Pasighat'], mandiCount: 30 },
  { name: 'Manipur', slug: 'manipur', capital: 'Imphal', region: 'North East India', language: 'Meitei', majorCrops: ['Rice', 'Maize', 'Pulses', 'Oilseeds', 'Vegetables', 'Pineapple'], keySchemes: ['PM-KISAN', 'Manipur Kisan Yojana', 'Soil Health Card'], majorCities: ['Imphal', 'Thoubal', 'Bishnupur'], mandiCount: 30 },
  { name: 'Meghalaya', slug: 'meghalaya', capital: 'Shillong', region: 'North East India', language: 'English', majorCrops: ['Rice', 'Maize', 'Potato', 'Turmeric', 'Ginger', 'Betel Leaf'], keySchemes: ['PM-KISAN', 'Meghalaya Kisan Yojana', 'Soil Health Card'], majorCities: ['Shillong', 'Tura', 'Jowai'], mandiCount: 25 },
  { name: 'Mizoram', slug: 'mizoram', capital: 'Aizawl', region: 'North East India', language: 'Mizo', majorCrops: ['Rice', 'Maize', 'Millets', 'Ginger', 'Turmeric', 'Chilli'], keySchemes: ['PM-KISAN', 'Mizoram Kisan Yojana', 'Soil Health Card'], majorCities: ['Aizawl', 'Lunglei', 'Champhai'], mandiCount: 20 },
  { name: 'Nagaland', slug: 'nagaland', capital: 'Kohima', region: 'North East India', language: 'English', majorCrops: ['Rice', 'Maize', 'Millets', 'Naga King Chilli', 'Ginger', 'Turmeric'], keySchemes: ['PM-KISAN', 'Nagaland Kisan Yojana', 'Soil Health Card'], majorCities: ['Kohima', 'Dimapur', 'Mokokchung'], mandiCount: 20 },
  { name: 'Tripura', slug: 'tripura', capital: 'Agartala', region: 'North East India', language: 'Bengali', majorCrops: ['Rice', 'Rubber', 'Tea', 'Pineapple', 'Orange', 'Jackfruit'], keySchemes: ['PM-KISAN', 'Tripura Kisan Yojana', 'Soil Health Card'], majorCities: ['Agartala', 'Udaipur', 'Dharmanagar'], mandiCount: 25 },
  { name: 'Sikkim', slug: 'sikkim', capital: 'Gangtok', region: 'North East India', language: 'Nepali', majorCrops: ['Organic Rice', 'Maize', 'Cardamom', 'Ginger', 'Oranges', 'Vegetables'], keySchemes: ['PM-KISAN', 'Sikkim Organic Mission', 'Soil Health Card'], majorCities: ['Gangtok', 'Namchi', 'Gyalshing'], mandiCount: 15 },
  { name: 'Jammu & Kashmir', slug: 'jammu-and-kashmir', capital: 'Srinagar', region: 'North India', language: 'Kashmiri', majorCrops: ['Apple', 'Saffron', 'Walnut', 'Rice', 'Maize', 'Cherry'], keySchemes: ['PM-KISAN', 'J&K Holistic Agriculture Plan', 'Soil Health Card'], majorCities: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla'], mandiCount: 50 },
];

export const MANDI_CITIES: MandiCity[] = [
  { name: 'Jaipur', slug: 'jaipur', state: 'Rajasthan', stateSlug: 'rajasthan', famousCrops: ['Wheat', 'Mustard', 'Bajra', 'Groundnut', 'Cumin'], majorMandis: ['Jaipur Mandi', 'Sanganer Mandi', 'Chomu Mandi'] },
  { name: 'Jodhpur', slug: 'jodhpur', state: 'Rajasthan', stateSlug: 'rajasthan', famousCrops: ['Bajra', 'Groundnut', 'Moth Bean', 'Sesame'], majorMandis: ['Jodhpur Mandi', 'Osian Mandi'] },
  { name: 'Kota', slug: 'kota', state: 'Rajasthan', stateSlug: 'rajasthan', famousCrops: ['Coriander', 'Soybean', 'Mustard', 'Wheat'], majorMandis: ['Kota Mandi', 'Rawatbhata Mandi'] },
  { name: 'Bikaner', slug: 'bikaner', state: 'Rajasthan', stateSlug: 'rajasthan', famousCrops: ['Bajra', 'Groundnut', 'Cotton', 'Guar'], majorMandis: ['Bikaner Mandi', 'Nokha Mandi'] },
  { name: 'Udaipur', slug: 'udaipur', state: 'Rajasthan', stateSlug: 'rajasthan', famousCrops: ['Maize', 'Soybean', 'Groundnut', 'Wheat'], majorMandis: ['Udaipur Mandi', 'Salumber Mandi'] },
  { name: 'Pune', slug: 'pune', state: 'Maharashtra', stateSlug: 'maharashtra', famousCrops: ['Onion', 'Grapes', 'Sugarcane', 'Bajra', 'Pomegranate'], majorMandis: ['Pune Market Yard', 'Khed Shivapur Mandi'] },
  { name: 'Nagpur', slug: 'nagpur', state: 'Maharashtra', stateSlug: 'maharashtra', famousCrops: ['Cotton', 'Oranges', 'Soybean', 'Tur'], majorMandis: ['Nagpur APMC', 'Kalamna Mandi'] },
  { name: 'Nashik', slug: 'nashik', state: 'Maharashtra', stateSlug: 'maharashtra', famousCrops: ['Onion', 'Grapes', 'Tomato', 'Pomegranate'], majorMandis: ['Nashik Mandi', 'Pimpalgaon Mandi'] },
  { name: 'Indore', slug: 'indore', state: 'Madhya Pradesh', stateSlug: 'madhya-pradesh', famousCrops: ['Soybean', 'Wheat', 'Gram', 'Masoor'], majorMandis: ['Indore APMC', 'Chopra Mandi'] },
  { name: 'Bhopal', slug: 'bhopal', state: 'Madhya Pradesh', stateSlug: 'madhya-pradesh', famousCrops: ['Soybean', 'Wheat', 'Gram', 'Lentils'], majorMandis: ['Bhopal Mandi', 'Bairagarh Mandi'] },
  { name: 'Ludhiana', slug: 'ludhiana', state: 'Punjab', stateSlug: 'punjab', famousCrops: ['Wheat', 'Rice', 'Maize', 'Potato'], majorMandis: ['Ludhiana Grain Market', 'Khanna Mandi'] },
  { name: 'Amritsar', slug: 'amritsar', state: 'Punjab', stateSlug: 'punjab', famousCrops: ['Wheat', 'Rice', 'Potato', 'Cauliflower'], majorMandis: ['Amritsar Mandi', 'Ajnala Mandi'] },
  { name: 'Karnal', slug: 'karnal', state: 'Haryana', stateSlug: 'haryana', famousCrops: ['Rice', 'Wheat', 'Sugarcane', 'Potato'], majorMandis: ['Karnal Mandi', 'Gharaunda Mandi'] },
  { name: 'Gurugram', slug: 'gurugram', state: 'Haryana', stateSlug: 'haryana', famousCrops: ['Wheat', 'Mustard', 'Bajra', 'Vegetables'], majorMandis: ['Gurugram Mandi', 'Sohna Mandi'] },
  { name: 'Lucknow', slug: 'lucknow', state: 'Uttar Pradesh', stateSlug: 'uttar-pradesh', famousCrops: ['Wheat', 'Potato', 'Mentha', 'Vegetables'], majorMandis: ['Lucknow Mandi', 'Alambagh Mandi'] },
  { name: 'Agra', slug: 'agra', state: 'Uttar Pradesh', stateSlug: 'uttar-pradesh', famousCrops: ['Potato', 'Wheat', 'Mustard', 'Tomato'], majorMandis: ['Agra Mandi', 'Kiraoli Mandi'] },
  { name: 'Varanasi', slug: 'varanasi', state: 'Uttar Pradesh', stateSlug: 'uttar-pradesh', famousCrops: ['Brinjal', 'Wheat', 'Rice', 'Banana'], majorMandis: ['Varanasi Mandi', 'Bhadohi Mandi'] },
  { name: 'Patna', slug: 'patna', state: 'Bihar', stateSlug: 'bihar', famousCrops: ['Rice', 'Wheat', 'Maize', 'Lentils'], majorMandis: ['Patna Mandi', 'Danapur Mandi'] },
  { name: 'Kolkata', slug: 'kolkata', state: 'West Bengal', stateSlug: 'west-bengal', famousCrops: ['Rice', 'Potato', 'Jute', 'Vegetables'], majorMandis: ['Kolkata Mandi', 'Baranagar Mandi'] },
  { name: 'Ahmedabad', slug: 'ahmedabad', state: 'Gujarat', stateSlug: 'gujarat', famousCrops: ['Groundnut', 'Cotton', 'Onion', 'Wheat'], majorMandis: ['Ahmedabad Mandi', 'Viramgam Mandi'] },
  { name: 'Rajkot', slug: 'rajkot', state: 'Gujarat', stateSlug: 'gujarat', famousCrops: ['Groundnut', 'Cotton', 'Cumin', 'Garlic'], majorMandis: ['Rajkot Mandi', 'Gondal Mandi'] },
  { name: 'Surat', slug: 'surat', state: 'Gujarat', stateSlug: 'gujarat', famousCrops: ['Cotton', 'Banana', 'Vegetables', 'Sugarcane'], majorMandis: ['Surat Mandi', 'Bardoli Mandi'] },
  { name: 'Bengaluru', slug: 'bengaluru', state: 'Karnataka', stateSlug: 'karnataka', famousCrops: ['Ragi', 'Vegetables', 'Flowers', 'Maize'], majorMandis: ['Yeshwanthpur Mandi', 'KR Market'] },
  { name: 'Coimbatore', slug: 'coimbatore', state: 'Tamil Nadu', stateSlug: 'tamil-nadu', famousCrops: ['Turmeric', 'Banana', 'Coconut', 'Onion'], majorMandis: ['Coimbatore Mandi', 'Gandhipuram Market'] },
  { name: 'Erode', slug: 'erode', state: 'Tamil Nadu', stateSlug: 'tamil-nadu', famousCrops: ['Turmeric', 'Rice', 'Banana', 'Sugarcane'], majorMandis: ['Erode Mandi', 'Gobi Mandi'] },
  { name: 'Guntur', slug: 'guntur', state: 'Andhra Pradesh', stateSlug: 'andhra-pradesh', famousCrops: ['Chilli', 'Cotton', 'Rice', 'Tobacco'], majorMandis: ['Guntur Mandi', 'Sattenapalli Mandi'] },
  { name: 'Warangal', slug: 'warangal', state: 'Telangana', stateSlug: 'telangana', famousCrops: ['Cotton', 'Chilli', 'Rice', 'Maize'], majorMandis: ['Warangal Mandi', 'Hanamkonda Mandi'] },
  { name: 'Hyderabad', slug: 'hyderabad', state: 'Telangana', stateSlug: 'telangana', famousCrops: ['Maize', 'Cotton', 'Vegetables', 'Rice'], majorMandis: ['Bowenpally Market', 'Gaddiannaram Market'] },
  { name: 'Gwalior', slug: 'gwalior', state: 'Madhya Pradesh', stateSlug: 'madhya-pradesh', famousCrops: ['Wheat', 'Gram', 'Mustard', 'Masoor'], majorMandis: ['Gwalior Mandi', 'Dabra Mandi'] },
  { name: 'Jabalpur', slug: 'jabalpur', state: 'Madhya Pradesh', stateSlug: 'madhya-pradesh', famousCrops: ['Wheat', 'Gram', 'Soybean', 'Lentils'], majorMandis: ['Jabalpur Mandi', 'Sihora Mandi'] },
  { name: 'Meerut', slug: 'meerut', state: 'Uttar Pradesh', stateSlug: 'uttar-pradesh', famousCrops: ['Sugarcane', 'Wheat', 'Potato', 'Mustard'], majorMandis: ['Meerut Mandi', 'Kithore Mandi'] },
  { name: 'Kanpur', slug: 'kanpur', state: 'Uttar Pradesh', stateSlug: 'uttar-pradesh', famousCrops: ['Potato', 'Wheat', 'Mustard', 'Tomato'], majorMandis: ['Kanpur Mandi', 'Chaubepur Mandi'] },
  { name: 'Hisar', slug: 'hisar', state: 'Haryana', stateSlug: 'haryana', famousCrops: ['Wheat', 'Bajra', 'Cotton', 'Mustard'], majorMandis: ['Hisar Mandi', 'Hanssi Mandi'] },
  { name: 'Jalandhar', slug: 'jalandhar', state: 'Punjab', stateSlug: 'punjab', famousCrops: ['Wheat', 'Rice', 'Potato', 'Vegetables'], majorMandis: ['Jalandhar Mandi', 'Nakodar Mandi'] },
  { name: 'Nizamabad', slug: 'nizamabad', state: 'Telangana', stateSlug: 'telangana', famousCrops: ['Rice', 'Maize', 'Turmeric', 'Soybean'], majorMandis: ['Nizamabad Mandi', 'Bodhan Mandi'] },
  { name: 'Shimla', slug: 'shimla', state: 'Himachal Pradesh', stateSlug: 'himachal-pradesh', famousCrops: ['Apple', 'Green Peas', 'Potato', 'Cabbage'], majorMandis: ['Shimla Mandi', 'Theog Mandi'] },
  { name: 'Dehradun', slug: 'dehradun', state: 'Uttarakhand', stateSlug: 'uttarakhand', famousCrops: ['Rice', 'Millets', 'Pulses', 'Fruits'], majorMandis: ['Dehradun Mandi', 'Rishikesh Mandi'] },
  { name: 'Ranchi', slug: 'ranchi', state: 'Jharkhand', stateSlug: 'jharkhand', famousCrops: ['Rice', 'Maize', 'Vegetables', 'Pulses'], majorMandis: ['Ranchi Mandi', 'Kanke Mandi'] },
  { name: 'Raipur', slug: 'raipur', state: 'Chhattisgarh', stateSlug: 'chhattisgarh', famousCrops: ['Rice', 'Maize', 'Soybean', 'Groundnut'], majorMandis: ['Raipur Mandi', 'Mahasamund Mandi'] },
  { name: 'Guwahati', slug: 'guwahati', state: 'Assam', stateSlug: 'assam', famousCrops: ['Rice', 'Tea', 'Mustard', 'Potato'], majorMandis: ['Guwahati Mandi', 'Paltan Bazar'] },
  { name: 'Thiruvananthapuram', slug: 'thiruvananthapuram', state: 'Kerala', stateSlug: 'kerala', famousCrops: ['Coconut', 'Rubber', 'Banana', 'Spices'], majorMandis: ['Trivandrum Market', 'Kaniyapuram Market'] },
  { name: 'Kochi', slug: 'kochi', state: 'Kerala', stateSlug: 'kerala', famousCrops: ['Coconut', 'Rubber', 'Spices', 'Banana'], majorMandis: ['Ernakulam Market', 'Aluva Market'] },
  { name: 'Bhubaneswar', slug: 'bhubaneswar', state: 'Odisha', stateSlug: 'odisha', famousCrops: ['Rice', 'Groundnut', 'Maize', 'Vegetables'], majorMandis: ['Bhubaneswar Mandi', 'Cuttack Chhatra Bazar'] },
  { name: 'Nagpur', slug: 'nagpur', state: 'Maharashtra', stateSlug: 'maharashtra', famousCrops: ['Cotton', 'Oranges', 'Soybean', 'Tur'], majorMandis: ['Nagpur APMC', 'Kalamna Mandi'] },
];

export const getStateBySlug = (slug: string): StateData | undefined =>
  INDIAN_STATES.find((s) => s.slug === slug);

export const getCityBySlug = (slug: string): MandiCity | undefined =>
  MANDI_CITIES.find((c) => c.slug === slug);

