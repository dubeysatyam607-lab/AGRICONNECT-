import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FlaskConical,
  MapPin,
  Calendar,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Phone,
  User,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { SoilTestingLab, SoilTestBookingRequest } from '../domain/soilTestTypes';

interface SoilSampleBookingModalProps {
  lab: SoilTestingLab | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}

export const SoilSampleBookingModal: React.FC<SoilSampleBookingModalProps> = ({
  lab,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { language } = useLanguage();
  const isHindi = language === 'hi';
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPackage, setSelectedPackage] = useState<string>('complete_12');
  const [collectionMethod, setCollectionMethod] = useState<'doorstep' | 'dropoff'>('doorstep');
  const [farmerName, setFarmerName] = useState(user?.user_metadata?.full_name || '');
  const [farmerPhone, setFarmerPhone] = useState(user?.phone || '');
  const [farmAddress, setFarmAddress] = useState('');
  const [landSizeAcres, setFarmLandSizeAcres] = useState('2.5');
  const [currentCrop, setCurrentCrop] = useState('Wheat / गेहूं');
  const [preferredDate, setPreferredDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lab) return null;

  const packages = [
    {
      id: 'basic_npk',
      name: isHindi ? 'बुनियादी NPK परीक्षण' : 'Basic NPK Test',
      params: 'pH, EC, Organic Carbon, Nitrogen, Phosphorus, Potassium (6 Parameters)',
      price: lab.basicPrice || 149,
      tat: '24-48 Hours',
    },
    {
      id: 'complete_12',
      name: isHindi ? 'मान्यता प्राप्त संपूर्ण मृदा स्वास्थ्य कार्ड (12 पैरामीटर)' : 'Full Soil Health Card (12 Parameters)',
      params: 'pH, EC, OC, N, P, K, Sulphur, Zinc, Boron, Iron, Manganese, Copper + Fertilizer Prescription',
      price: lab.completePrice || 299,
      popular: true,
      tat: '48-72 Hours',
    },
    {
      id: 'organic_special',
      name: isHindi ? 'जैविक व सूक्ष्मजीव स्वास्थ्य परीक्षण' : 'Organic & Microbial Soil Test',
      params: 'Microbial Biomass Carbon, Soil Respiration, Water Holding Capacity, NPK + Micronutrients',
      price: lab.organicPrice || 499,
      tat: '3-4 Days',
    },
  ];

  const selectedPkgData = packages.find((p) => p.id === selectedPackage) || packages[1];
  const totalPrice = selectedPkgData.price + (collectionMethod === 'doorstep' ? (lab.homeCollectionFee || 50) : 0);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!farmerName.trim() || !farmerPhone.trim() || (collectionMethod === 'doorstep' && !farmAddress.trim())) {
        toast.error(isHindi ? 'कृपया सभी आवश्यक फ़ील्ड भरें' : 'Please fill all required details');
        return;
      }
      setStep(3);
    }
  };

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call to create real booking
      await new Promise((resolve) => setTimeout(resolve, 900));
      const bookingId = `STB-${Date.now().toString().slice(-6)}`;
      toast.success(
        isHindi
          ? `मृदा परीक्षण बुकिंग सफल! बुकिंग ID: ${bookingId}`
          : `Soil Test Scheduled Successfully! Booking ID: ${bookingId}`
      );
      onSuccess(bookingId);
      onClose();
      setStep(1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule soil test');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-300" />
            <DialogTitle className="text-lg sm:text-xl font-bold text-white">
              {isHindi ? 'मृदा नमूना परीक्षण बुक करें' : 'Schedule Soil Test Sample'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-emerald-100 text-xs">
            {lab.name} • {lab.district}, {lab.state}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-muted/40 border-b flex justify-between items-center text-xs font-semibold text-muted-foreground">
          <span className={step === 1 ? 'text-emerald-600 font-bold' : ''}>
            1. {isHindi ? 'पैकेज चुनें' : 'Select Package'}
          </span>
          <span>→</span>
          <span className={step === 2 ? 'text-emerald-600 font-bold' : ''}>
            2. {isHindi ? 'खेत विवरण' : 'Farm Details'}
          </span>
          <span>→</span>
          <span className={step === 3 ? 'text-emerald-600 font-bold' : ''}>
            3. {isHindi ? 'पुष्टि करें' : 'Confirm'}
          </span>
        </div>

        <div className="p-6 space-y-5">
          {/* STEP 1: Package Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-foreground">
                {isHindi ? 'परीक्षण पैकेज का चयन करें:' : 'Choose Test Package:'}
              </h4>
              <div className="space-y-3">
                {packages.map((pkg) => {
                  const isSelected = selectedPackage === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                          : 'hover:border-slate-300 bg-card'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{pkg.name}</span>
                            {pkg.popular && (
                              <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-2">
                                {isHindi ? 'सर्वाधिक लोकप्रिय' : 'Most Popular'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{pkg.params}</p>
                          <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{isHindi ? 'रिपोर्ट समय:' : 'TAT:'} {pkg.tat}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-foreground">₹{pkg.price}</span>
                          {lab.isGovtSubsidized && (
                            <span className="block text-[10px] text-emerald-600 font-semibold">
                              {isHindi ? 'सरकारी छूट उपलब्ध' : 'Govt Subsidized'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Collection Method Option */}
              <div className="pt-3 border-t space-y-2">
                <Label className="text-xs font-semibold">
                  {isHindi ? 'नमूना एकत्रीकरण विधि' : 'Sample Collection Method'}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setCollectionMethod('doorstep')}
                    className={`p-3 rounded-lg border cursor-pointer text-center space-y-1 ${
                      collectionMethod === 'doorstep'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-slate-200'
                    }`}
                  >
                    <Truck className="w-4 h-4 mx-auto text-emerald-600" />
                    <div className="font-bold text-xs">{isHindi ? 'घर से पिकअप' : 'Doorstep Pickup'}</div>
                    <div className="text-[10px] text-muted-foreground">₹{lab.homeCollectionFee || 50}</div>
                  </div>

                  <div
                    onClick={() => setCollectionMethod('dropoff')}
                    className={`p-3 rounded-lg border cursor-pointer text-center space-y-1 ${
                      collectionMethod === 'dropoff'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-slate-200'
                    }`}
                  >
                    <MapPin className="w-4 h-4 mx-auto text-emerald-600" />
                    <div className="font-bold text-xs">{isHindi ? 'लैब में जमा करें' : 'Direct Lab Drop'}</div>
                    <div className="text-[10px] text-muted-foreground">{isHindi ? 'निःशुल्क (Free)' : 'Free'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Farmer & Farm Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isHindi ? 'किसान का नाम' : 'Farmer Full Name'} *</Label>
                  <Input
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isHindi ? 'मोबाइल नंबर' : 'Phone Number'} *</Label>
                  <Input
                    value={farmerPhone}
                    onChange={(e) => setFarmerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isHindi ? 'खेत का आकार (एकड़)' : 'Land Size (Acres)'}</Label>
                  <Input
                    value={landSizeAcres}
                    onChange={(e) => setFarmLandSizeAcres(e.target.value)}
                    placeholder="e.g. 3.5"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isHindi ? 'बोई जाने वाली फसल' : 'Target / Current Crop'}</Label>
                  <Input
                    value={currentCrop}
                    onChange={(e) => setCurrentCrop(e.target.value)}
                    placeholder="e.g. Wheat, Mustard, Paddy"
                  />
                </div>
              </div>

              {collectionMethod === 'doorstep' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{isHindi ? 'खेत / घर का पूरा पता (पिकअप हेतु)' : 'Pickup Address'} *</Label>
                  <Input
                    value={farmAddress}
                    onChange={(e) => setFarmAddress(e.target.value)}
                    placeholder="Village, Post, Tehsil, Landmark"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">{isHindi ? 'पसंदीदा पिकअप / जमा तिथि' : 'Preferred Date'}</Label>
                <Input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Summary & Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-xs text-muted-foreground">{isHindi ? 'लैब:' : 'Testing Lab:'}</span>
                  <span className="text-xs font-bold">{lab.name}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-xs text-muted-foreground">{isHindi ? 'पैकेज:' : 'Package:'}</span>
                  <span className="text-xs font-semibold">{selectedPkgData.name}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-xs text-muted-foreground">{isHindi ? 'एकत्रीकरण विधि:' : 'Collection:'}</span>
                  <span className="text-xs font-semibold">
                    {collectionMethod === 'doorstep' ? (isHindi ? 'घर से पिकअप' : 'Doorstep Pickup') : (isHindi ? 'लैब ड्रॉप' : 'Direct Lab Drop')}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-xs text-muted-foreground">{isHindi ? 'किसान व संपर्क:' : 'Farmer:'}</span>
                  <span className="text-xs font-semibold">{farmerName} ({farmerPhone})</span>
                </div>
                <div className="flex justify-between pt-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  <span>{isHindi ? 'कुल देय राशि:' : 'Total Amount:'}</span>
                  <span>₹{totalPrice}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  {isHindi
                    ? 'भुगतान नमूना संग्रह के समय या ऑनलाइन रिपोर्ट जारी होने पर करें।'
                    : 'Pay at the time of sample collection or upon receiving digital report.'}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-muted/30 border-t flex items-center justify-between sm:justify-between">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => (s - 1) as any)}
            >
              {isHindi ? 'पीछे' : 'Back'}
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleNext}
            >
              {isHindi ? 'आगे बढ़ें' : 'Next'}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSubmitting}
              onClick={handleConfirmBooking}
            >
              {isSubmitting
                ? (isHindi ? 'बुक हो रहा है...' : 'Booking...')
                : (isHindi ? 'बुकिंग कन्फर्म करें' : 'Confirm Soil Test')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
