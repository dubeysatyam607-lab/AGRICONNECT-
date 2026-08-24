import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  MapPin,
  Compass,
  Calendar,
  Clock,
  Truck,
  Building,
  CheckCircle,
  CreditCard,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { AgriButton } from '@/components/ui/agri-button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useLocation as useGeoLocation } from '@/features/location/LocationContext';
import {
  SoilTestType,
  FarmSizeUnit,
  CreateSoilTestOrderInput,
  SoilTestOrder,
} from '../domain/soilTestingTypes';
import {
  SOIL_TEST_PACKAGES,
  SOIL_PICKUP_FEE,
  calculateSoilOrderTotal,
  getPackageDetails,
} from '../domain/soilTestingPricing';
import { soilTestingService } from '../domain/soilTestingService';

interface SoilTestBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTestType?: SoilTestType;
  onSuccess: (order: SoilTestOrder) => void;
}

export const SoilTestBookingModal: React.FC<SoilTestBookingModalProps> = ({
  open,
  onOpenChange,
  initialTestType = 'standard',
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { location: currentGeo } = useGeoLocation();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [testType, setTestType] = useState<SoilTestType>(initialTestType);
  const [farmerName, setFarmerName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '');
  const [mobile, setMobile] = useState(user?.phone || user?.user_metadata?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [farmName, setFarmName] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState(currentGeo?.state || 'Madhya Pradesh');
  const [district, setDistrict] = useState(currentGeo?.district || 'Indore');
  const [village, setVillage] = useState(currentGeo?.village || '');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(currentGeo?.lat);
  const [longitude, setLongitude] = useState<number | undefined>(currentGeo?.lon);
  const [locatingGps, setLocatingGps] = useState(false);

  // Farm Details
  const [farmSize, setFarmSize] = useState<string>('2.5');
  const [farmSizeUnit, setFarmSizeUnit] = useState<FarmSizeUnit>('acre');
  const [crop, setCrop] = useState('Wheat / Gehun');
  const [cropStage, setCropStage] = useState('Pre-sowing (Field Preparation)');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Pickup Logistics
  const [pickupRequired, setPickupRequired] = useState<boolean>(true);
  const [pickupDate, setPickupDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [pickupTimeSlot, setPickupTimeSlot] = useState<string>('09:00 AM - 01:00 PM');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'wallet'>('upi');

  useEffect(() => {
    if (initialTestType) setTestType(initialTestType);
  }, [initialTestType]);

  const handleGpsAutofill = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingGps(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocatingGps(false);
      },
      (err) => {
        setLocatingGps(false);
        setErrorMsg('Location permission denied or unavailable. Please enter address manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const pricing = calculateSoilOrderTotal(testType, pickupRequired);
  const pkg = getPackageDetails(testType);

  // Validation
  const validateStep1 = () => {
    if (!farmerName.trim()) {
      setErrorMsg('Please enter farmer full name.');
      return false;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return false;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter your farm address.');
      return false;
    }
    if (!district.trim() || !state.trim()) {
      setErrorMsg('Please enter state and district.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep2 = () => {
    if (!crop.trim()) {
      setErrorMsg('Please specify main crop.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleSubmitBooking = async () => {
    if (!user) {
      setErrorMsg('Please sign in to confirm soil test booking.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const inputPayload: CreateSoilTestOrderInput = {
      farmer_name: farmerName.trim(),
      mobile: mobile.trim(),
      email: email.trim() || undefined,
      farm_name: farmName.trim() || undefined,
      address: address.trim(),
      state: state.trim(),
      district: district.trim(),
      village: village.trim() || undefined,
      pincode: pincode.trim() || undefined,
      latitude,
      longitude,
      farm_size: farmSize ? Number(farmSize) : undefined,
      farm_size_unit: farmSizeUnit,
      crop: crop.trim(),
      crop_stage: cropStage.trim() || undefined,
      test_type: testType,
      sample_quantity: '500g composite sample',
      pickup_required: pickupRequired,
      preferred_pickup_date: pickupRequired ? pickupDate : undefined,
      pickup_time_slot: pickupRequired ? pickupTimeSlot : undefined,
      additional_notes: additionalNotes.trim() || undefined,
    };

    const res = await soilTestingService.createSoilTestOrder(
      user.id,
      inputPayload,
      paymentMethod,
      'paid'
    );

    setSubmitting(false);

    if (res.error || !res.data) {
      setErrorMsg(res.error?.message || 'Failed to create soil test order. Please try again.');
    } else {
      onSuccess(res.data);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
        <DialogHeader className="mb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {t('soil.booking.stepCount') || `Step ${step} of 4`}
            </span>
            <span className="text-xs font-bold text-foreground bg-muted px-2.5 py-0.5 rounded-full">
              {pkg.titleEn} (₹{pricing.totalAmount})
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {step === 1 && (t('soil.booking.step1.title') || 'Farmer & Location Details')}
            {step === 2 && (t('soil.booking.step2.title') || 'Farm & Crop Information')}
            {step === 3 && (t('soil.booking.step3.title') || 'Sample Collection & Logistics')}
            {step === 4 && (t('soil.booking.step4.title') || 'Review & Secure Payment')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === 1 && 'Enter your farm details so our technician can locate and verify your soil sample.'}
            {step === 2 && 'Helps the laboratory tailor fertilizer doses to your specific crop and growth stage.'}
            {step === 3 && 'Choose between doorstep technician pickup or direct self-submission.'}
            {step === 4 && 'Complete your booking with server-verified payment and instant confirmation.'}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Farmer & Location */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            {/* Select Test Type */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                {t('soil.selectTestType') || 'Select Laboratory Test Package'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SOIL_TEST_PACKAGES.map((p) => (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => setTestType(p.type)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      testType === p.type
                        ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 font-bold shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-border bg-card hover:border-emerald-400/40 text-muted-foreground'
                    }`}
                  >
                    <div className="text-foreground font-bold">{p.titleEn}</div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-extrabold mt-1">₹{p.price}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Farmer Full Name *
                </label>
                <input
                  type="text"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  placeholder="e.g. Rameshwar Patel"
                  className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit number"
                  className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Farm / Field Name (Optional)
                </label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g. North Plot #4 / River Field"
                  className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Email (Optional for Report Copy)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 text-foreground"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-foreground">
                  Farm Address & Location *
                </label>
                <button
                  type="button"
                  onClick={handleGpsAutofill}
                  disabled={locatingGps}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                >
                  <Compass className={`w-3.5 h-3.5 ${locatingGps ? 'animate-spin' : ''}`} />
                  <span>{locatingGps ? 'Detecting GPS…' : 'Autofill with GPS'}</span>
                </button>
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Village / Khasra No. / Landmark"
                className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">State *</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">District *</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Village</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="Village"
                  className="w-full px-2.5 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 452001"
                  className="w-full px-2.5 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                />
              </div>
            </div>

            {latitude && longitude && (
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>GPS coordinates tagged ({latitude.toFixed(4)}, {longitude.toFixed(4)}) for pickup technician navigation.</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Farm Information */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Farm Size</label>
                <input
                  type="number"
                  step="0.5"
                  value={farmSize}
                  onChange={(e) => setFarmSize(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Unit</label>
                <select
                  value={farmSizeUnit}
                  onChange={(e) => setFarmSizeUnit(e.target.value as FarmSizeUnit)}
                  className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                >
                  <option value="acre">Acre (एकड़)</option>
                  <option value="hectare">Hectare (हेक्टेयर)</option>
                  <option value="bigha">Bigha (बीघा)</option>
                  <option value="guntha">Guntha (गुंठा)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Main Target Crop *
                </label>
                <input
                  type="text"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  placeholder="e.g. Wheat, Cotton, Soybean, Onion"
                  className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Current Crop Stage
                </label>
                <select
                  value={cropStage}
                  onChange={(e) => setCropStage(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                >
                  <option value="Pre-sowing (Field Preparation)">Pre-sowing (Field Preparation)</option>
                  <option value="Sowing / Germination">Sowing / Germination</option>
                  <option value="Vegetative Growth">Vegetative Growth</option>
                  <option value="Flowering / Fruit Setting">Flowering / Fruit Setting</option>
                  <option value="Post-Harvest">Post-Harvest Soil Health Check</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Additional Notes or Special Problem Areas
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="e.g. Soil has yellowing leaves in center patch, or high waterlogging history..."
                rows={3}
                className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Pickup Logistics */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <label className="text-xs font-bold text-foreground block mb-1">
              Sample Submission Preference
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Request Pickup */}
              <div
                onClick={() => setPickupRequired(true)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  pickupRequired
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-border bg-card opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-foreground">Doorstep Agent Pickup</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    +₹{SOIL_PICKUP_FEE}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Our certified field agent will visit your farm, inspect the sample bag, tag with barcode, and transport safely to the lab.
                </p>
              </div>

              {/* Option B: Self-Submit */}
              <div
                onClick={() => setPickupRequired(false)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  !pickupRequired
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-border bg-card opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-foreground">Self-Submission at Lab</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    FREE (₹0)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  You drop off the labeled sample bag directly at the nearest AgriConnect authorized laboratory or partner Krishi Kendra.
                </p>
              </div>
            </div>

            {pickupRequired && (
              <div className="bg-muted/40 p-4 rounded-xl space-y-3 border border-border/50">
                <h4 className="text-xs font-bold text-foreground">Select Preferred Pickup Slot</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={pickupDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Time Slot
                    </label>
                    <select
                      value={pickupTimeSlot}
                      onChange={(e) => setPickupTimeSlot(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                    >
                      <option value="09:00 AM - 01:00 PM">Morning (09:00 AM - 01:00 PM)</option>
                      <option value="02:00 PM - 06:00 PM">Afternoon (02:00 PM - 06:00 PM)</option>
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Technician contact and exact arrival confirmation will be sent via in-app alert & SMS.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Review & Payment */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            {/* Transparent Order Summary Card */}
            <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 text-xs space-y-3">
              <h4 className="font-bold text-foreground pb-2 border-b border-border/50">
                Order Summary & Price Breakdown
              </h4>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Farmer:</span>
                <span className="font-bold text-foreground">{farmerName} (+91 {mobile})</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium text-foreground">{district}, {state}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Crop:</span>
                <span className="font-medium text-foreground">{crop} ({farmSize} {farmSizeUnit})</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Laboratory Package:</span>
                <span className="font-bold text-foreground">{pkg.titleEn} (₹{pricing.testPrice.toFixed(2)})</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Sample Logistics:</span>
                <span className="font-medium text-foreground">
                  {pickupRequired ? `Technician Doorstep Pickup (₹${pricing.pickupFee.toFixed(2)})` : 'Self-Submission (₹0.00)'}
                </span>
              </div>

              {pickupRequired && (
                <div className="flex justify-between text-[11px] text-emerald-700 dark:text-emerald-400">
                  <span>Pickup Slot:</span>
                  <span>{pickupDate} · {pickupTimeSlot}</span>
                </div>
              )}

              <div className="pt-3 border-t border-border/60 flex justify-between items-baseline text-sm font-extrabold text-foreground">
                <span>Total Amount:</span>
                <span className="text-xl text-emerald-600 dark:text-emerald-400">
                  ₹{pricing.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Select Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'upi', label: 'UPI / QR Code', icon: Sparkles },
                  { id: 'card', label: 'Debit / Card', icon: CreditCard },
                  { id: 'wallet', label: 'Agri Wallet', icon: ShieldCheck },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id as any)}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === pm.id
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <pm.icon className="w-4 h-4 text-emerald-600" />
                    <span>{pm.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-3 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Guaranteed ICAR Protocol Testing · Instant Status Tracking via AgriConnect</span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          {step > 1 ? (
            <AgriButton
              type="button"
              variant="outline"
              onClick={() => setStep((s) => (s - 1) as any)}
              disabled={submitting}
              className="text-xs font-bold flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </AgriButton>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <AgriButton
              type="button"
              variant="primary"
              onClick={() => {
                if (step === 1 && !validateStep1()) return;
                if (step === 2 && !validateStep2()) return;
                setStep((s) => (s + 1) as any);
              }}
              className="text-xs font-bold px-6 flex items-center gap-1.5"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </AgriButton>
          ) : (
            <AgriButton
              type="button"
              variant="primary"
              onClick={handleSubmitBooking}
              disabled={submitting}
              className="text-xs font-bold px-8 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Payment…</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₹{pricing.totalAmount.toFixed(0)} & Confirm Booking</span>
                </>
              )}
            </AgriButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
