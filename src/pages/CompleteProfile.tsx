import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage, LANGUAGE_NAMES, Language } from '@/contexts/LanguageContext';
import { Logo } from '@/components/ui/Logo';
import { SeoHead } from '@/components/seo/SeoHead';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Sprout,
  Ruler,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Droplets,
  Layers,
  Award,
  Globe,
} from 'lucide-react';
import { MAJOR_INDIAN_CROPS, SoilType, IrrigationType } from '@/features/profile/domain/models/FarmerProfile';
import { INDIAN_STATES_AND_DISTRICTS } from '@/features/location/indianStatesData';

const SOIL_TYPES: SoilType[] = [
  'Alluvial',
  'Black Cotton',
  'Red & Yellow',
  'Laterite',
  'Saline & Alkaline',
  'Arid & Desert',
  'Peaty & Marshy',
];

const IRRIGATION_TYPES: IrrigationType[] = [
  'Drip Irrigation',
  'Sprinkler System',
  'Tube Well',
  'Canal Irrigation',
  'Rainfed / Monsoon',
  'Open Borewell',
];

const EXPERIENCE_OPTIONS = [
  { value: '1-3', label: '1–3 Years (Beginner)' },
  { value: '3-5', label: '3–5 Years (Experienced)' },
  { value: '5-10', label: '5–10 Years (Skilled)' },
  { value: '10+', label: '10+ Years (Master Farmer)' },
];

export const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [preferredLang, setPreferredLang] = useState<Language>(language);

  // Farm Details
  const [selectedState, setSelectedState] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [primaryCrop, setPrimaryCrop] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [irrigationType, setIrrigationType] = useState<string>('');
  const [soilType, setSoilType] = useState<string>('');
  const [experience, setExperience] = useState<string>('');
  const [additionalCrops, setAdditionalCrops] = useState<string[]>([]);
  const [cropInput, setCropInput] = useState('');

  // Legal Consent
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Load existing profile / Google metadata
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!user) return;
      const meta = user.user_metadata || {};
      const gName = String(meta.full_name || meta.name || '');
      const gEmail = String(user.email || meta.email || '');
      const gAvatar = String(meta.avatar_url || meta.picture || '');

      setFullName(gName);
      setEmail(gEmail);
      setAvatarUrl(gAvatar);

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && mounted) {
          if (profile.onboarding_completed) {
            navigate('/dashboard', { replace: true });
            return;
          }
          if (profile.full_name) setFullName(profile.full_name);
          if (profile.email) setEmail(profile.email);
          if (profile.phone) setPhone(profile.phone);
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
          if (profile.state) setSelectedState(profile.state);
          if (profile.district) setDistrict(profile.district);
          if (profile.village) setVillage(profile.village);
          if (profile.farm_location) setFarmLocation(profile.farm_location);
          if (profile.primary_crop) setPrimaryCrop(profile.primary_crop);
          if (profile.farm_size) setFarmSize(String(profile.farm_size));
          if (profile.irrigation_type) setIrrigationType(profile.irrigation_type);
          if (profile.soil_type) setSoilType(profile.soil_type);
          if (profile.farming_experience) setExperience(profile.farming_experience);
          if (profile.alternate_phone) setAlternatePhone(profile.alternate_phone);
          if (Array.isArray(profile.additional_crops)) setAdditionalCrops(profile.additional_crops);
        }
      } catch (err) {
        console.warn('[CompleteProfile] Read profile error:', err);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [user, navigate]);

  const stateList = Object.keys(INDIAN_STATES_AND_DISTRICTS || {}).sort();
  const districtList = selectedState && INDIAN_STATES_AND_DISTRICTS[selectedState]
    ? INDIAN_STATES_AND_DISTRICTS[selectedState]
    : [];

  const handleAddCrop = (c: string) => {
    const trimmed = c.trim();
    if (trimmed && !additionalCrops.includes(trimmed) && trimmed !== primaryCrop) {
      setAdditionalCrops([...additionalCrops, trimmed]);
      setCropInput('');
    }
  };

  const handleRemoveCrop = (c: string) => {
    setAdditionalCrops(additionalCrops.filter((item) => item !== c));
  };

  // Validation
  const validateStep1 = () => {
    if (!fullName.trim()) {
      setErrorMsg(t('auth.error.enterFullName') || 'Please enter your full name.');
      return false;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep2 = () => {
    if (!selectedState) {
      setErrorMsg('Please select your state.');
      return false;
    }
    if (!district.trim()) {
      setErrorMsg('Please select or enter your district.');
      return false;
    }
    if (!village.trim()) {
      setErrorMsg('Please enter your village or town.');
      return false;
    }
    if (!primaryCrop.trim()) {
      setErrorMsg('Please choose your primary crop.');
      return false;
    }
    const acres = parseFloat(farmSize);
    if (isNaN(acres) || acres <= 0) {
      setErrorMsg('Please enter a valid farm size in acres (e.g. 2.5).');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setErrorMsg('You must agree to the Terms & Conditions and Privacy Policy to continue.');
      return;
    }
    if (!user) {
      setErrorMsg('User session expired. Please sign in again.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        alternate_phone: alternatePhone.trim() || null,
        avatar_url: avatarUrl || null,
        state: selectedState,
        district: district.trim(),
        village: village.trim(),
        farm_location: (farmLocation.trim() || `${village}, ${district}, ${selectedState}`),
        primary_crop: primaryCrop.trim(),
        farm_size: parseFloat(farmSize) || 0,
        irrigation_type: irrigationType || null,
        soil_type: soilType || null,
        farming_experience: experience || null,
        additional_crops: additionalCrops,
        app_language: preferredLang,
        onboarding_completed: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: 'v1.0',
        privacy_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Also update auth user metadata for instantaneous local hydration
      await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          village: village.trim(),
          district: district.trim(),
          state: selectedState,
        },
      });

      // Update active app language if changed
      if (preferredLang !== language) {
        setLanguage(preferredLang);
      }

      localStorage.setItem('agri_profile_complete', 'true');
      localStorage.setItem('agri_onboarding_seen', 'true');

      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('[CompleteProfile] Submission failure:', err);
      setErrorMsg(err?.message || 'Failed to save your profile. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <SeoHead
        title="Complete Your Profile — AgriConnect"
        description="Set up your farm profile to unlock live Mandi prices, AI crop advisory and weather insights."
        noindex
      />

      {/* Decorative ambient background glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-teal-600/15 blur-[120px]" />

      <div className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-3">
            <Logo size={44} className="shadow-lg shadow-emerald-500/20" />
            <span className="text-xl font-black tracking-tight text-white">AgriConnect</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Complete Your Farmer Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            Personalize your farm details for AI crop diagnosis, hyperlocal weather alerts, and live Mandi rates.
          </p>
        </div>

        {/* Multi-Step Progress Indicator */}
        <div className="flex items-center justify-between px-2 sm:px-6 pt-2">
          {[
            { num: 1, label: 'Personal & Contact' },
            { num: 2, label: 'Farm Details' },
            { num: 3, label: 'Consent & Finish' },
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-1.5 flex-1 relative">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  step === s.num
                    ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/30 scale-105'
                    : step > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {step > s.num ? <CheckCircle2 size={18} /> : s.num}
              </div>
              <span className={`text-[11px] font-semibold text-center hidden sm:block ${
                step === s.num ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-shake">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── STEP 1: Personal & Contact Details ── */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Google Profile Preview Badge */}
            {email && (
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3.5">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || 'Farmer'}
                    className="w-12 h-12 rounded-full border-2 border-emerald-500/60 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-lg">
                    {fullName ? fullName.charAt(0).toUpperCase() : '👨‍🌾'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      Google Account Verified
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-200 truncate mt-0.5">{fullName || 'Google Farmer'}</p>
                  <p className="text-xs text-slate-400 truncate">{email}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User size={14} className="text-emerald-400" /> Full Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Satyam Dubey"
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Email (Read-Only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail size={14} className="text-emerald-400" /> Email Address <span className="text-xs text-slate-500 font-normal">(Read-only)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="w-full bg-slate-800/40 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-400 cursor-not-allowed select-none"
                />
              </div>

              {/* Primary Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Phone size={14} className="text-emerald-400" /> Mobile Number <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-12 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Alternate Phone (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-400" /> Alternate Phone <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Optional backup number"
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-12 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Preferred Language */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Globe size={14} className="text-emerald-400" /> Preferred App Language
              </label>
              <select
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value as Language)}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                  <option key={code} value={code} className="bg-slate-900 text-white">
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Next Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-3.5 px-4 shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
              >
                <span>Continue to Farm Details</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Farm & Agricultural Details ── */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* State */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-400" /> State <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setDistrict('');
                  }}
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="">Select State</option>
                  {stateList.map((s) => (
                    <option key={s} value={s} className="bg-slate-900 text-white">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-400" /> District <span className="text-emerald-400">*</span>
                </label>
                {districtList.length > 0 ? (
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select District</option>
                    {districtList.map((d) => (
                      <option key={d} value={d} className="bg-slate-900 text-white">
                        {d}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Enter district"
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                )}
              </div>

              {/* Village / Town */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-400" /> Village / Town <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Rampur, Tehsil Sadar"
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Farm Size (Acres) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Ruler size={14} className="text-emerald-400" /> Farm Size (in Acres) <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="1000"
                  value={farmSize}
                  onChange={(e) => setFarmSize(e.target.value)}
                  placeholder="e.g. 4.5"
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Primary Crop */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sprout size={14} className="text-emerald-400" /> Primary Crop <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={primaryCrop}
                  onChange={(e) => setPrimaryCrop(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Primary Crop</option>
                  {MAJOR_INDIAN_CROPS.map((crop) => (
                    <option key={crop} value={crop} className="bg-slate-900 text-white">
                      {crop}
                    </option>
                  ))}
                </select>
              </div>

              {/* Farming Experience */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Award size={14} className="text-slate-400" /> Farming Experience <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                </label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Experience</option>
                  {EXPERIENCE_OPTIONS.map((exp) => (
                    <option key={exp.value} value={exp.value} className="bg-slate-900 text-white">
                      {exp.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Irrigation Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Droplets size={14} className="text-slate-400" /> Irrigation Type <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                </label>
                <select
                  value={irrigationType}
                  onChange={(e) => setIrrigationType(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Irrigation System</option>
                  {IRRIGATION_TYPES.map((i) => (
                    <option key={i} value={i} className="bg-slate-900 text-white">
                      {i}
                    </option>
                  ))}
                </select>
              </div>

              {/* Soil Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers size={14} className="text-slate-400" /> Soil Type <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                </label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Soil Type</option>
                  {SOIL_TYPES.map((s) => (
                    <option key={s} value={s} className="bg-slate-900 text-white">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Additional Crops Tagging */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sprout size={14} className="text-slate-400" /> Additional Crops Grown <span className="text-xs text-slate-500 font-normal">(Optional)</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={cropInput}
                  onChange={(e) => {
                    if (e.target.value) handleAddCrop(e.target.value);
                  }}
                  className="flex-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">+ Add other crops</option>
                  {MAJOR_INDIAN_CROPS.filter((c) => c !== primaryCrop && !additionalCrops.includes(c)).map((c) => (
                    <option key={c} value={c} className="bg-slate-900 text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {additionalCrops.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {additionalCrops.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-1 rounded-lg font-medium"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => handleRemoveCrop(c)}
                        className="text-emerald-400 hover:text-rose-400 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2 Buttons */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 px-4 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateStep2()) setStep(3);
                }}
                className="w-2/3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-3.5 px-4 shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
              >
                <span>Continue to Consent</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Legal Consent & Summary ── */}
        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
            {/* Farm Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2.5 text-xs sm:text-sm">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" /> Farm Profile Summary
              </h3>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div><span className="text-slate-400">Name:</span> {fullName}</div>
                <div><span className="text-slate-400">Phone:</span> +91 {phone}</div>
                <div><span className="text-slate-400">Location:</span> {village}, {district}, {selectedState}</div>
                <div><span className="text-slate-400">Primary Crop:</span> {primaryCrop}</div>
                <div><span className="text-slate-400">Farm Size:</span> {farmSize} Acres</div>
                <div><span className="text-slate-400">Irrigation:</span> {irrigationType || 'Not specified'}</div>
              </div>
            </div>

            {/* Mandatory Terms & Privacy Policy Consent */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded-md border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-bold hover:text-emerald-300">
                    Terms & Conditions
                  </Link>{' '}
                  and acknowledge the{' '}
                  <Link to="/privacy-policy" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-bold hover:text-emerald-300">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link to="/data-declaration" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-bold hover:text-emerald-300">
                    Data Declaration
                  </Link>
                  .
                </span>
              </label>

              <p className="text-[11px] text-slate-400 pl-8">
                Your data is stored securely and used solely to personalize your farming advisory, mandi rates, and equipment bookings.
              </p>
            </div>

            {/* Step 3 Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep(2)}
                className="w-1/3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 px-4 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                disabled={loading || !termsAccepted}
                onClick={handleSubmit}
                className="w-2/3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-3.5 px-4 shadow-xl shadow-emerald-900/50 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Complete & Go to Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompleteProfile;
