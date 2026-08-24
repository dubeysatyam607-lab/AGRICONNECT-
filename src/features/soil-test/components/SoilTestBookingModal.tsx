import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  FlaskConical,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Truck,
  FileSpreadsheet,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { SOIL_PACKAGES } from '../domain/soilTestTypes';
import type { SoilPackage, CreateSoilOrderInput } from '../domain/soilTestTypes';
import { createSoilTestOrder } from '../data/soilTestRepository';
import { toast } from 'sonner';

interface SoilTestBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackageId?: string;
  onSuccess?: (orderNumber: string) => void;
}

export const SoilTestBookingModal: React.FC<SoilTestBookingModalProps> = ({
  isOpen,
  onClose,
  selectedPackageId = 'standard',
  onSuccess,
}) => {
  const { language } = useLanguage();
  const isHindi = language === 'hi';
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPkg, setSelectedPkg] = useState<SoilPackage>(
    SOIL_PACKAGES.find((p) => p.id === selectedPackageId) || SOIL_PACKAGES[0]
  );

  // Form State
  const [farmerName, setFarmerName] = useState(user?.user_metadata?.full_name || user?.name || '');
  const [mobile, setMobile] = useState(user?.phone || user?.user_metadata?.phone || '');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [village, setVillage] = useState('');
  const [tehsil, setTehsil] = useState('');
  const [district, setDistrict] = useState('Indore');
  const [state, setState] = useState('Madhya Pradesh');
  const [pincode, setPincode] = useState('');
  const [landSizeAcres, setLandSizeAcres] = useState<string>('3.5');
  const [crop, setCrop] = useState('Wheat (गेहूं)');
  const [previousCrop, setPreviousCrop] = useState('Soybean (सोयाबीन)');
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [pickupTimeSlot, setPickupTimeSlot] = useState('morning');
  const [collectionAssistance, setCollectionAssistance] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!farmerName.trim() || !mobile.trim() || !district.trim()) {
        toast.error(isHindi ? 'कृपया नाम, मोबाइल नंबर और जिला भरें' : 'Please fill in Name, Mobile, and District');
        return;
      }
      if (mobile.trim().length < 10) {
        toast.error(isHindi ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!pickupDate) {
        toast.error(isHindi ? 'कृपया पिकअप तारीख चुनें' : 'Please select pickup date');
        return;
      }
      setStep(4);
    }
  };

  const handleCreateBooking = async () => {
    try {
      setLoading(true);
      const input: CreateSoilOrderInput = {
        userId: user?.id,
        farmerName,
        mobile,
        alternatePhone: alternatePhone || undefined,
        village: village || undefined,
        tehsil: tehsil || undefined,
        district,
        state,
        pincode: pincode || undefined,
        testType: selectedPkg.id as any,
        packageId: selectedPkg.id,
        packageName: selectedPkg.name,
        price: selectedPkg.price,
        landSizeAcres: landSizeAcres ? parseFloat(landSizeAcres) : undefined,
        crop: crop || undefined,
        previousCrop: previousCrop || undefined,
        pickupDate,
        pickupTimeSlot,
        collectionAssistance,
        notes: notes || undefined,
      };

      const result = await createSoilTestOrder(input);

      if (result.success && result.order) {
        setCreatedOrderNumber(result.order.order_number);
        toast.success(
          isHindi
            ? `मृदा परीक्षण सफलतापूर्वक बुक हुआ! ऑर्डर नं: ${result.order.order_number}`
            : `Soil test booked successfully! Order #${result.order.order_number}`
        );
        if (onSuccess) {
          onSuccess(result.order.order_number);
        }
      } else {
        throw new Error(result.error || 'Failed to create booking');
      }
    } catch (err: any) {
      console.error('Booking error:', err);
      toast.error(err.message || 'Could not complete booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setCreatedOrderNumber(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetForm}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold">
                {isHindi ? 'मृदा परीक्षण बुक करें (Book Soil Test)' : 'Book Soil Health Test'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isHindi
                  ? 'सरकारी मान्यता प्राप्त लैब • डोरस्टेप सैंपल कलेक्शन • 48 घंटे में डिजिटल रिपोर्ट'
                  : 'NABL Accredited Lab • Doorstep Sample Pickup • Digital Soil Health Card in 48-72h'}
              </DialogDescription>
            </div>
          </div>

          {/* Stepper Header (Only if not completed) */}
          {!createdOrderNumber && (
            <div className="flex items-center justify-between mt-4 px-2">
              {[
                { s: 1, label: isHindi ? 'पैकेज' : 'Package' },
                { s: 2, label: isHindi ? 'खेत विवरण' : 'Farm Details' },
                { s: 3, label: isHindi ? 'पिकअप समय' : 'Pickup Slot' },
                { s: 4, label: isHindi ? 'समीक्षा व पुष्टि' : 'Confirm' },
              ].map((item) => (
                <div key={item.s} className="flex items-center gap-1.5 text-xs">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      step === item.s
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 dark:ring-emerald-800'
                        : step > item.s
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    }`}
                  >
                    {step > item.s ? <CheckCircle2 className="w-4 h-4" /> : item.s}
                  </div>
                  <span className={`hidden sm:inline font-medium ${step === item.s ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Success Confirmation Screen */}
        {createdOrderNumber ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 mx-auto flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">
                {isHindi ? 'मृदा परीक्षण बुकिंग सफल!' : 'Soil Test Booked Successfully!'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isHindi
                  ? 'हमारा फील्ड एग्रोनॉमिस्ट निर्धारित समय पर सैंपल लेने आपके खेत पर पहुंचेगा।'
                  : 'Our field collection executive will visit your farm to collect soil samples on your scheduled date.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border text-left space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{isHindi ? 'ऑर्डर नंबर:' : 'Order ID:'}</span>
                <span className="font-mono font-bold text-emerald-600">{createdOrderNumber}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{isHindi ? 'पैकेज:' : 'Package:'}</span>
                <span className="font-semibold">{selectedPkg.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{isHindi ? 'पिकअप तारीख:' : 'Scheduled Pickup:'}</span>
                <span className="font-semibold">{pickupDate} ({pickupTimeSlot})</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{isHindi ? 'कुल राशि:' : 'Amount Payable:'}</span>
                <span className="font-bold text-emerald-600">₹{selectedPkg.price}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <Button onClick={resetForm} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isHindi ? 'ऑर्डर स्थिति देखें' : 'View My Orders'}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {/* STEP 1: Package Selection */}
            {step === 1 && (
              <div className="space-y-3 py-2">
                <p className="text-xs text-muted-foreground">
                  {isHindi
                    ? 'अपनी फसल की आवश्यकता अनुसार उपयुक्त परीक्षण पैकेज चुनें:'
                    : 'Select a soil analysis package suited for your crop and farm requirements:'}
                </p>

                <div className="space-y-3">
                  {SOIL_PACKAGES.map((pkg) => {
                    const isSelected = selectedPkg.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPkg(pkg)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                            : 'border-border hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-foreground">
                                {isHindi ? pkg.hindiName : pkg.name}
                              </h4>
                              {pkg.popular && (
                                <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-2">
                                  {isHindi ? 'सर्वाधिक लोकप्रिय' : 'Most Popular'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {isHindi ? pkg.hindiDescription : pkg.description}
                            </p>

                            <div className="flex flex-wrap gap-1 mt-2">
                              {pkg.parameters.map((param, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                                >
                                  {param}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-lg font-extrabold text-emerald-600">₹{pkg.price}</div>
                            {pkg.originalPrice && (
                              <div className="text-xs text-muted-foreground line-through">
                                ₹{pkg.originalPrice}
                              </div>
                            )}
                            <span className="text-[10px] text-muted-foreground block mt-1">
                              {pkg.turnaroundDays} {isHindi ? 'दिन में' : 'days'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Farm & Farmer Details */}
            {step === 2 && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isHindi ? 'किसान का नाम *' : 'Farmer Full Name *'}
                    </Label>
                    <Input
                      placeholder={isHindi ? 'जैसे: रमेश सिंह' : 'e.g. Ramesh Singh'}
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isHindi ? 'मोबाइल नंबर (10 अंक) *' : 'Mobile Number (10 digits) *'}
                    </Label>
                    <Input
                      type="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isHindi ? 'गाँव / कस्बा' : 'Village / Town'}
                    </Label>
                    <Input
                      placeholder={isHindi ? 'जैसे: सांवेर' : 'e.g. Sanwer'}
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isHindi ? 'तहसील / ब्लॉक' : 'Tehsil / Block'}
                    </Label>
                    <Input
                      placeholder={isHindi ? 'जैसे: देवास' : 'e.g. Dewas'}
                      value={tehsil}
                      onChange={(e) => setTehsil(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isHindi ? 'जिला *' : 'District *'}
                    </Label>
                    <Input
                      placeholder="e.g. Indore"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isHindi ? 'राज्य *' : 'State *'}
                    </Label>
                    <Input
                      placeholder="e.g. Madhya Pradesh"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isHindi ? 'खेत का क्षेत्रफल (एकड़)' : 'Field Area (Acres)'}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="3.5"
                      value={landSizeAcres}
                      onChange={(e) => setLandSizeAcres(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isHindi ? 'बोई जाने वाली फसल' : 'Planned / Sown Crop'}
                    </Label>
                    <Input
                      placeholder={isHindi ? 'जैसे: गेहूं, चना, सरसों' : 'e.g. Wheat, Mustard'}
                      value={crop}
                      onChange={(e) => setCrop(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Pickup Schedule */}
            {step === 3 && (
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {isHindi ? 'सैंपल पिकअप की तारीख *' : 'Preferred Sample Pickup Date *'}
                  </Label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {isHindi ? 'समय स्लॉट' : 'Pickup Time Slot'}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'morning', label: isHindi ? 'सुबह 8:00 - 12:00' : 'Morning (8 AM - 12 PM)' },
                      { id: 'afternoon', label: isHindi ? 'दोपहर 1:00 - 5:00' : 'Afternoon (1 PM - 5 PM)' },
                    ].map((slot) => (
                      <div
                        key={slot.id}
                        onClick={() => setPickupTimeSlot(slot.id)}
                        className={`p-3 rounded-lg border text-center text-xs font-medium cursor-pointer transition-all ${
                          pickupTimeSlot === slot.id
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'border-border hover:border-slate-300'
                        }`}
                      >
                        {slot.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                  <Truck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      {isHindi ? 'डोरस्टेप सैंपल कलेक्शन सेवा' : 'Doorstep Sample Collection Service'}
                    </p>
                    <p className="text-amber-800 dark:text-amber-300">
                      {isHindi
                        ? 'हमारा प्रशिक्षित फील्ड एजेंट वैज्ञानिक ' +
                          'V-शेप' +
                          ' विधि (15 सेमी गहराई) से खेत के विभिन्न कोनों से सैंपल एकत्र करेगा।'
                        : 'Our trained field executive will visit your field with certified sampling tools, collect multi-point V-cut soil cores, and seal in barcoded tamper-evident bags.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {isHindi ? 'कोई अतिरिक्त निर्देश या लैंडमार्क' : 'Additional Notes / Landmark'}
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder={isHindi ? 'जैसे: पुराने कुएं के पास वाला खेत...' : 'e.g. Farm located near tube well...'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Review & Confirmation */}
            {step === 4 && (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs text-muted-foreground">{isHindi ? 'चुना गया पैकेज:' : 'Selected Package:'}</span>
                    <span className="font-bold text-sm">{selectedPkg.name}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs text-muted-foreground">{isHindi ? 'किसान का नाम व मोबाइल:' : 'Farmer & Mobile:'}</span>
                    <span className="font-semibold text-xs">{farmerName} ({mobile})</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs text-muted-foreground">{isHindi ? 'स्थान:' : 'Location:'}</span>
                    <span className="font-semibold text-xs">{village ? `${village}, ` : ''}{district}, {state}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs text-muted-foreground">{isHindi ? 'फसल व रकबा:' : 'Crop & Land Size:'}</span>
                    <span className="font-semibold text-xs">{crop || 'All'} • {landSizeAcres} Acres</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs text-muted-foreground">{isHindi ? 'पिकअप शेड्यूल:' : 'Pickup Schedule:'}</span>
                    <span className="font-semibold text-xs text-emerald-600">{pickupDate} ({pickupTimeSlot})</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold">{isHindi ? 'कुल देय राशि:' : 'Total Amount:'}</span>
                    <span className="text-xl font-extrabold text-emerald-600">₹{selectedPkg.price}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {isHindi
                      ? '100% संतुष्टि गारंटी • रिपोर्ट मिलने के बाद निशुल्क एग्रोनॉमिस्ट कंसल्टेशन।'
                      : '100% NABL Quality Guarantee • Free Agronomist Consultation after report delivery.'}
                  </span>
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((s) => (s - 1) as any)}
                  className="gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{isHindi ? 'पिछला' : 'Back'}</span>
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </Button>
              )}

              {step < 4 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNextStep}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                >
                  <span>{isHindi ? 'आगे बढ़ें' : 'Next Step'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={loading}
                  onClick={handleCreateBooking}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isHindi ? 'ऑर्डर दर्ज हो रहा है...' : 'Booking Test...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isHindi ? 'बुकिंग की पुष्टि करें' : 'Confirm Soil Test'}</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
