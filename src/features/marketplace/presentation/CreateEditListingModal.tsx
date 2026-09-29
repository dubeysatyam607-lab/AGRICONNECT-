import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Upload,
  X,
  Image as ImageIcon,
  MapPin,
  Sparkles,
  AlertCircle,
  Loader2,
  Check,
  Compass,
  Tractor,
  Users,
  Wrench,
  ChevronRight,
  Plus,
  Star,
} from 'lucide-react';
import {
  MarketplaceListing,
  CreateListingInput,
  ListingType,
  MarketplacePriceUnit,
  MarketplaceContactMethod,
  MachineryCondition,
  MachineryFuelType,
  LISTING_TYPE_METAS,
  PRESET_MACHINERY_EQUIPMENT,
  PRESET_CATTLE_TYPES,
  PRESET_LABOUR_CATEGORIES,
  PRESET_AGRICULTURAL_SERVICES,
  validateImageFile,
} from '../domain/marketplaceTypes';
import { marketplaceService } from '../domain/marketplaceService';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

interface CreateEditListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingToEdit?: MarketplaceListing | null;
  onSuccess: (listing: MarketplaceListing) => void;
  onToast?: (msg: string) => void;
}

export const CreateEditListingModal: React.FC<CreateEditListingModalProps> = ({
  open,
  onOpenChange,
  listingToEdit,
  onSuccess,
  onToast,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category State
  const [listingType, setListingType] = useState<ListingType>('machinery');
  const [category, setCategory] = useState<string>('Tractors');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [priceUnit, setPriceUnit] = useState<MarketplacePriceUnit>('per_day');
  const [securityDeposit, setSecurityDeposit] = useState<string>('');

  // Location State
  const [state, setState] = useState('Madhya Pradesh');
  const [district, setDistrict] = useState('Shivpuri');
  const [village, setVillage] = useState('');
  const [address, setAddress] = useState('');
  const [serviceRadius, setServiceRadius] = useState<string>('25');
  const [contactMethod, setContactMethod] = useState<MarketplaceContactMethod>('both');

  // Dates
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');

  // Image Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState<number>(0);
  const [customImageUrl, setCustomImageUrl] = useState('');

  // Category Specific State - Machinery
  const [machineryEquipment, setMachineryEquipment] = useState<string>('Tractor');
  const [customEquipmentName, setCustomEquipmentName] = useState<string>('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [condition, setCondition] = useState<MachineryCondition>('good');
  const [horsepower, setHorsepower] = useState('');
  const [fuelType, setFuelType] = useState<MachineryFuelType>('diesel');
  const [minRentalDuration, setMinRentalDuration] = useState('1 Day');
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [deliveryCharges, setDeliveryCharges] = useState('');
  const [operatorIncluded, setOperatorIncluded] = useState(false);
  const [operatorCharges, setOperatorCharges] = useState('');

  // Category Specific State - Cattle
  const [cattleType, setCattleType] = useState<string>('Cow');
  const [breed, setBreed] = useState('');
  const [ageYears, setAgeYears] = useState('');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [healthStatus, setHealthStatus] = useState('healthy');
  const [weightKg, setWeightKg] = useState('');
  const [milkYield, setMilkYield] = useState('');
  const [lactationNo, setLactationNo] = useState('');
  const [vaccinationInfo, setVaccinationInfo] = useState('');
  const [purpose, setPurpose] = useState<'sale' | 'breeding' | 'rental' | 'dairy'>('sale');

  // Category Specific State - Labour
  const [workerName, setWorkerName] = useState('');
  const [workCategory, setWorkCategory] = useState<string>('Tractor Operator');
  const [skills, setSkills] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [teamSize, setTeamSize] = useState('1');

  // Category Specific State - Services
  const [serviceType, setServiceType] = useState<string>('Irrigation Service');
  const [customServiceName, setCustomServiceName] = useState('');
  const [serviceScope, setServiceScope] = useState('');

  // General Status
  const [locatingGps, setLocatingGps] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (listingToEdit) {
      setListingType(listingToEdit.listing_type || 'machinery');
      setCategory(listingToEdit.category || 'Tractors');
      setTitle(listingToEdit.title);
      setDescription(listingToEdit.description || '');
      setPrice(String(listingToEdit.price));
      setPriceUnit(listingToEdit.price_unit);
      setSecurityDeposit(listingToEdit.security_deposit ? String(listingToEdit.security_deposit) : '');
      setState(listingToEdit.location.state);
      setDistrict(listingToEdit.location.district);
      setVillage(listingToEdit.location.village || '');
      setAddress(listingToEdit.location.address || '');
      setContactMethod(listingToEdit.contact_method);
      setImagePreviews(listingToEdit.images || []);

      if (listingToEdit.machinery_details) {
        setMachineryEquipment(listingToEdit.machinery_details.equipment_name || 'Tractor');
        setBrand(listingToEdit.machinery_details.brand || '');
        setModel(listingToEdit.machinery_details.model || '');
        setYear(listingToEdit.machinery_details.manufacturing_year ? String(listingToEdit.machinery_details.manufacturing_year) : '');
        setCondition(listingToEdit.machinery_details.condition || 'good');
        setHorsepower(listingToEdit.machinery_details.horsepower ? String(listingToEdit.machinery_details.horsepower) : '');
        setFuelType(listingToEdit.machinery_details.fuel_type || 'diesel');
        setDeliveryAvailable(listingToEdit.machinery_details.delivery_available || false);
        setDeliveryCharges(listingToEdit.machinery_details.delivery_charges ? String(listingToEdit.machinery_details.delivery_charges) : '');
        setOperatorIncluded(listingToEdit.machinery_details.operator_included || false);
        setOperatorCharges(listingToEdit.machinery_details.operator_charges ? String(listingToEdit.machinery_details.operator_charges) : '');
      }

      if (listingToEdit.cattle_details) {
        setCattleType(listingToEdit.cattle_details.animal_type || 'Cow');
        setBreed(listingToEdit.cattle_details.breed || '');
        setAgeYears(listingToEdit.cattle_details.age_years ? String(listingToEdit.cattle_details.age_years) : '');
        setGender(listingToEdit.cattle_details.gender || 'female');
        setHealthStatus(listingToEdit.cattle_details.health_status || 'healthy');
        setMilkYield(listingToEdit.cattle_details.milk_production_daily_litres ? String(listingToEdit.cattle_details.milk_production_daily_litres) : '');
        setPurpose(listingToEdit.cattle_details.purpose || 'sale');
      }

      if (listingToEdit.labour_details) {
        setWorkerName(listingToEdit.labour_details.worker_name || '');
        setWorkCategory(listingToEdit.labour_details.work_category || 'Harvesting Worker');
        setSkills(listingToEdit.labour_details.skills?.join(', ') || '');
        setExperienceYears(listingToEdit.labour_details.experience_years ? String(listingToEdit.labour_details.experience_years) : '');
        setTeamSize(listingToEdit.labour_details.team_size ? String(listingToEdit.labour_details.team_size) : '1');
      }

      if (listingToEdit.service_details) {
        setServiceType(listingToEdit.service_details.service_type || 'Irrigation Service');
        setCustomServiceName(listingToEdit.service_details.custom_service_name || '');
        setServiceScope(listingToEdit.service_details.service_scope || '');
      }
    } else {
      setListingType('machinery');
      setCategory('Tractors');
      setTitle('');
      setDescription('');
      setPrice('');
      setPriceUnit('per_day');
      setSecurityDeposit('');
      setVillage('');
      setAddress('');
      setContactMethod('both');
      setSelectedFiles([]);
      setImagePreviews([]);
      setCoverIndex(0);
      setErrorMsg(null);
    }
  }, [listingToEdit, open]);

  const handleTypeChange = (type: ListingType) => {
    setListingType(type);
    if (type === 'machinery') {
      setCategory('Tractors');
      setPriceUnit('per_day');
    } else if (type === 'cattle') {
      setCategory('Cattle');
      setPriceUnit('fixed');
    } else if (type === 'labour') {
      setCategory('Labour');
      setPriceUnit('per_day');
    } else if (type === 'service') {
      setCategory('Services');
      setPriceUnit('per_acre');
    }
  };

  const handleGpsAutofill = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingGps(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocatingGps(false);
        onToast?.('GPS location tagged to listing');
      },
      () => {
        setLocatingGps(false);
        setErrorMsg('Location permission denied or unavailable.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setErrorMsg(validation.error || 'Invalid image file.');
        return;
      }
      newFiles.push(file);

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setImagePreviews((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setErrorMsg(null);
  };

  const handleAddCustomUrl = () => {
    if (!customImageUrl.trim()) return;
    if (!customImageUrl.startsWith('http://') && !customImageUrl.startsWith('https://')) {
      setErrorMsg('Please enter a valid HTTP or HTTPS image URL.');
      return;
    }
    setImagePreviews((prev) => [...prev, customImageUrl.trim()]);
    setCustomImageUrl('');
    setErrorMsg(null);
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    if (coverIndex === index) {
      setCoverIndex(0);
    } else if (coverIndex > index) {
      setCoverIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a listing title.');
      return;
    }
    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) {
      setErrorMsg('Please enter a valid positive price or rate.');
      return;
    }
    if (!state.trim() || !district.trim()) {
      setErrorMsg('Please specify state and district.');
      return;
    }
    if (imagePreviews.length === 0 && selectedFiles.length === 0) {
      setErrorMsg('Please upload at least one photo of your asset/service.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const userId = user?.id || 'guest-farmer-01';
      const ownerName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Local Farmer';
      const ownerPhone = user?.phone || user?.user_metadata?.phone || '9876543210';

      const finalEquipmentName = machineryEquipment === 'Other Equipment' && customEquipmentName.trim()
        ? customEquipmentName.trim()
        : machineryEquipment;

      const input: CreateListingInput = {
        listing_type: listingType,
        category: category || listingType,
        title: title.trim(),
        description: description.trim(),
        price: numPrice,
        price_unit: priceUnit,
        security_deposit: securityDeposit ? Number(securityDeposit) : 0,
        available_from: availableFrom || undefined,
        available_until: availableUntil || undefined,
        location: {
          state: state.trim(),
          district: district.trim(),
          village: village.trim() || undefined,
          address: address.trim() || undefined,
        },
        images: imagePreviews,
        image_files: selectedFiles,
        contact_method: contactMethod,

        ...(listingType === 'machinery'
          ? {
              machinery_details: {
                equipment_name: finalEquipmentName,
                brand: brand.trim() || undefined,
                model: model.trim() || undefined,
                manufacturing_year: year ? Number(year) : undefined,
                condition,
                horsepower: horsepower ? Number(horsepower) : undefined,
                fuel_type: fuelType,
                minimum_rental_duration: minRentalDuration,
                delivery_available: deliveryAvailable,
                delivery_charges: deliveryCharges ? Number(deliveryCharges) : 0,
                operator_included: operatorIncluded,
                operator_charges: operatorCharges ? Number(operatorCharges) : 0,
              },
            }
          : {}),

        ...(listingType === 'cattle'
          ? {
              cattle_details: {
                animal_type: cattleType,
                breed: breed.trim() || undefined,
                age_years: ageYears ? Number(ageYears) : undefined,
                gender,
                health_status: healthStatus,
                weight_kg: weightKg ? Number(weightKg) : undefined,
                milk_production_daily_litres: milkYield ? Number(milkYield) : undefined,
                lactation_number: lactationNo ? Number(lactationNo) : undefined,
                vaccination_info: vaccinationInfo.trim() || undefined,
                purpose,
              },
            }
          : {}),

        ...(listingType === 'labour'
          ? {
              labour_details: {
                worker_name: workerName.trim() || ownerName,
                work_category: workCategory,
                skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
                experience_years: experienceYears ? Number(experienceYears) : undefined,
                team_size: teamSize ? Number(teamSize) : 1,
              },
            }
          : {}),

        ...(listingType === 'service'
          ? {
              service_details: {
                service_type: serviceType,
                custom_service_name: customServiceName.trim() || undefined,
                service_scope: serviceScope.trim() || undefined,
              },
            }
          : {}),
      };

      let result: MarketplaceListing;
      if (listingToEdit) {
        result = await marketplaceService.updateListing(listingToEdit.id, input, userId);
        onToast?.('Listing updated successfully!');
      } else {
        result = await marketplaceService.createListing(input, userId, {
          name: ownerName,
          phone: ownerPhone,
          is_verified: true,
        });
        onToast?.('Your listing has been published to AgriConnect Marketplace!');
      }

      onSuccess(result);
      onOpenChange(false);
    } catch (err: any) {
      console.error('[CreateListingModal] Error:', err);
      setErrorMsg(err.message || 'Failed to save listing. Please check inputs and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 rounded-2xl">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            {t('marketplace.eyebrow') || 'AgriConnect User-Generated Marketplace'}
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {listingToEdit ? 'Edit Your Listing' : 'List Your Asset or Service'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            List real machinery, cattle, farm workers, or agricultural services for rental, hiring or sale in your district.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 py-1">
          {/* 1. Core Category Selection */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-2">
              Step 1: Select Asset / Service Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {LISTING_TYPE_METAS.map((meta) => (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => handleTypeChange(meta.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    listingType === meta.id
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 font-bold shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-border bg-card hover:border-emerald-400/40 text-muted-foreground'
                  }`}
                >
                  <div>
                    <div className="text-foreground font-bold text-xs">{meta.nameEn}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{meta.nameHi}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Category Specific Form Fields */}

          {/* MACHINERY FIELDS */}
          {listingType === 'machinery' && (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-3.5">
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tractor className="w-4 h-4" />
                Farming Machinery & Equipment Specifications
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Equipment Name *</label>
                  <select
                    value={machineryEquipment}
                    onChange={(e) => setMachineryEquipment(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground font-medium"
                  >
                    {PRESET_MACHINERY_EQUIPMENT.map((eq) => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>

                {machineryEquipment === 'Other Equipment' && (
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Custom Equipment Name *</label>
                    <input
                      type="text"
                      value={customEquipmentName}
                      onChange={(e) => setCustomEquipmentName(e.target.value)}
                      placeholder="e.g. Sugar Cane Loader, Earth Digger"
                      className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Brand / Make</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Mahindra, John Deere, Shaktiman"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Model / Variant</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. 575 DI, 7 Feet 54 Blades"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Horsepower (HP) / Capacity</label>
                  <input
                    type="number"
                    value={horsepower}
                    onChange={(e) => setHorsepower(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as MachineryCondition)}
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  >
                    <option value="brand_new">Brand New (नई मशीन)</option>
                    <option value="like_new">Like New (उत्कृष्ट स्थिति)</option>
                    <option value="good">Good Working Condition (अच्छी कार्यशील)</option>
                    <option value="fair">Fair (सामान्य)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as MachineryFuelType)}
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  >
                    <option value="diesel">Diesel (डीजल)</option>
                    <option value="petrol">Petrol (पेट्रोल)</option>
                    <option value="pto">PTO Driven (ट्रैक्टर चालित)</option>
                    <option value="electric">Electric Motor (विद्युत मोटर)</option>
                    <option value="battery">Battery Operated (बैटरी चालित)</option>
                    <option value="manual">Manual / Hand Operated</option>
                  </select>
                </div>
              </div>

              {/* Delivery & Operator options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-500/20">
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card">
                  <div>
                    <div className="text-xs font-bold text-foreground">Operator Included?</div>
                    <div className="text-[11px] text-muted-foreground">Driver/Operator provided with machine</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={operatorIncluded}
                    onChange={(e) => setOperatorIncluded(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card">
                  <div>
                    <div className="text-xs font-bold text-foreground">Delivery Available?</div>
                    <div className="text-[11px] text-muted-foreground">Doorstep transport to farm</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={deliveryAvailable}
                    onChange={(e) => setDeliveryAvailable(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CATTLE FIELDS */}
          {listingType === 'cattle' && (
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10 space-y-3.5">
              <div className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Cattle / Livestock Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Animal Type *</label>
                  <select
                    value={cattleType}
                    onChange={(e) => setCattleType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground font-medium"
                  >
                    {PRESET_CATTLE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Breed (नस्ल)</label>
                  <input
                    type="text"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    placeholder="e.g. Murrah, Gir, Sahiwal, Sirohi"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Milk Yield (Litres / Day)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={milkYield}
                    onChange={(e) => setMilkYield(e.target.value)}
                    placeholder="e.g. 14"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Age (Years / Months)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={ageYears}
                    onChange={(e) => setAgeYears(e.target.value)}
                    placeholder="e.g. 3.5"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Purpose</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  >
                    <option value="sale">Direct Sale (बिक्री हेतु)</option>
                    <option value="dairy">Dairy Milk Production</option>
                    <option value="breeding">Breeding Stud</option>
                    <option value="rental">Farm Work / Rental</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Vaccination Info</label>
                  <input
                    type="text"
                    value={vaccinationInfo}
                    onChange={(e) => setVaccinationInfo(e.target.value)}
                    placeholder="e.g. FMD & HS vaccinated, Pashu Pass verified"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {/* LABOUR FIELDS */}
          {listingType === 'labour' && (
            <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-50/30 dark:bg-sky-950/10 space-y-3.5">
              <div className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Labour / Farm Worker Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Worker / Team Name *</label>
                  <input
                    type="text"
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    placeholder="e.g. Raju Harvesting Team, Mukesh Driver"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Work Category *</label>
                  <select
                    value={workCategory}
                    onChange={(e) => setWorkCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground font-medium"
                  >
                    {PRESET_LABOUR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Team Size (No. of Workers)</label>
                  <input
                    type="number"
                    min="1"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground block mb-1">Skills (Comma separated)</label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. Paddy Transplanting, Tractor Driving, Spraying, Threshing"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SERVICE FIELDS */}
          {listingType === 'service' && (
            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-50/30 dark:bg-purple-950/10 space-y-3.5">
              <div className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-4 h-4" />
                Agricultural Service Specifications
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Service Type *</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground font-medium"
                  >
                    {PRESET_AGRICULTURAL_SERVICES.map((srv) => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                  </select>
                </div>

                {serviceType === 'Other Agricultural Service' && (
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Custom Service Name *</label>
                    <input
                      type="text"
                      value={customServiceName}
                      onChange={(e) => setCustomServiceName(e.target.value)}
                      placeholder="e.g. Solar Borewell Installation"
                      className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground block mb-1">Service Scope & Inclusions</label>
                  <textarea
                    value={serviceScope}
                    onChange={(e) => setServiceScope(e.target.value)}
                    placeholder="Describe equipment used, chemical coverage, turn-around time, or guarantee..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Title & General Info */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Listing Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mahindra 575 DI 45 HP Tractor for Rental / Murrah Buffalo 14L Milk / 8-Member Harvest Group"
              className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 text-foreground font-medium"
            />
          </div>

          {/* 4. Price & Rate Units */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Price / Rental Rate (₹) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 850"
                className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 text-foreground font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Pricing Unit *
              </label>
              <select
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value as MarketplacePriceUnit)}
                className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground font-semibold"
              >
                <option value="per_hour">Per Hour (प्रति घंटा)</option>
                <option value="per_day">Per Day (प्रति दिन)</option>
                <option value="per_acre">Per Acre (प्रति एकड़)</option>
                <option value="per_trip">Per Trip (प्रति ट्रिप)</option>
                <option value="per_kg">Per Kg (प्रति किलो)</option>
                <option value="per_quintal">Per Quintal (प्रति क्विंटल)</option>
                <option value="fixed">Fixed Price (निश्चित मूल्य)</option>
                <option value="custom">Custom Rate (अन्य)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Security Deposit (if applicable)
              </label>
              <input
                type="number"
                min="0"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                placeholder="₹ 0"
                className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
              />
            </div>
          </div>

          {/* 5. Detailed Description */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Description & Terms
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide complete description, operating terms, condition notes, or contract details..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
            />
          </div>

          {/* 6. Location & Radius */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-foreground">
                Item / Service Location *
              </label>
              <button
                type="button"
                onClick={handleGpsAutofill}
                disabled={locatingGps}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                <Compass className={`w-3.5 h-3.5 ${locatingGps ? 'animate-spin' : ''}`} />
                <span>{locatingGps ? 'Locating…' : 'Autofill with GPS'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State *"
                className="px-2.5 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
              />
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="District *"
                className="px-2.5 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
              />
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Village / Town"
                className="px-2.5 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
              />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Landmark / Area"
                className="px-2.5 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
              />
            </div>
          </div>

          {/* 7. Real Image Upload (Supabase Storage) */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">
                Upload Real Photos * (Uploaded directly to Supabase Storage)
              </label>
              <span className="text-[11px] text-muted-foreground">Max 5 MB each (JPG, PNG, WEBP)</span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {imagePreviews.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setCoverIndex(idx)}
                  className={`relative w-24 h-24 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                    coverIndex === idx ? 'border-emerald-600 shadow-md ring-2 ring-emerald-500/20' : 'border-border opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                  {coverIndex === idx && (
                    <div className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" /> Cover
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(idx);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/75 text-white rounded-full flex items-center justify-center text-xs hover:bg-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10 flex flex-col items-center justify-center gap-1 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 transition-colors"
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs font-bold">Add Photo</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />

            <div className="flex gap-2">
              <input
                type="url"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="Or paste image URL (https://...)"
                className="flex-1 px-3 py-1.5 text-xs bg-muted/40 border border-border rounded-xl text-foreground"
              />
              <button
                type="button"
                onClick={handleAddCustomUrl}
                className="px-3 py-1.5 text-xs font-bold bg-muted hover:bg-muted/80 rounded-xl text-foreground"
              >
                Add URL
              </button>
            </div>
          </div>

          {/* 8. Contact Preference */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              Contact Preference
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['both', 'call', 'in_app'] as MarketplaceContactMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setContactMethod(method)}
                  className={`p-2 rounded-xl border text-xs text-center font-semibold capitalize ${
                    contactMethod === method
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {method === 'both' ? 'Call & In-App' : method === 'call' ? 'Phone Call' : 'In-App Only'}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl inline-flex items-center gap-2 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing to Database…</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{listingToEdit ? 'Save Changes' : 'Publish Listing'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
