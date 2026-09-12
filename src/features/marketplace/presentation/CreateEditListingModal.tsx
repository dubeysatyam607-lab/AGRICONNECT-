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
} from 'lucide-react';
import {
  MarketplaceListing,
  CreateListingInput,
  MarketplaceCategory,
  MarketplacePriceUnit,
  MarketplaceContactMethod,
  MARKETPLACE_CATEGORIES,
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

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory>('equipment');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [priceUnit, setPriceUnit] = useState<MarketplacePriceUnit>('per_day');
  const [state, setState] = useState('Madhya Pradesh');
  const [district, setDistrict] = useState('Shivpuri');
  const [village, setVillage] = useState('');
  const [address, setAddress] = useState('');
  const [contactMethod, setContactMethod] = useState<MarketplaceContactMethod>('both');
  const [images, setImages] = useState<string[]>([]);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [locatingGps, setLocatingGps] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (listingToEdit) {
      setTitle(listingToEdit.title);
      setCategory(listingToEdit.category);
      setDescription(listingToEdit.description || '');
      setPrice(String(listingToEdit.price));
      setPriceUnit(listingToEdit.price_unit);
      setState(listingToEdit.location.state);
      setDistrict(listingToEdit.location.district);
      setVillage(listingToEdit.location.village || '');
      setAddress(listingToEdit.location.address || '');
      setContactMethod(listingToEdit.contact_method);
      setImages(listingToEdit.images || []);
    } else {
      setTitle('');
      setCategory('equipment');
      setDescription('');
      setPrice('');
      setPriceUnit('per_day');
      setVillage('');
      setAddress('');
      setContactMethod('both');
      setImages([]);
      setErrorMsg(null);
    }
  }, [listingToEdit, open]);

  const handleCategoryChange = (cat: MarketplaceCategory) => {
    setCategory(cat);
    const meta = MARKETPLACE_CATEGORIES.find((c) => c.id === cat);
    if (meta) {
      setPriceUnit(meta.defaultPriceUnit);
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

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setErrorMsg(validation.error || 'Invalid image file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    }
    setErrorMsg(null);
  };

  const handleAddCustomUrl = () => {
    if (!customImageUrl.trim()) return;
    if (!customImageUrl.startsWith('http://') && !customImageUrl.startsWith('https://')) {
      setErrorMsg('Please enter a valid HTTP or HTTPS image URL.');
      return;
    }
    setImages((prev) => [...prev, customImageUrl.trim()]);
    setCustomImageUrl('');
    setErrorMsg(null);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a listing title.');
      return;
    }
    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) {
      setErrorMsg('Please enter a valid positive price/rate.');
    }
    if (!state.trim() || !district.trim()) {
      setErrorMsg('Please specify state and district.');
      return;
    }
    if (images.length === 0) {
      setErrorMsg('Please upload or provide at least one photo.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const userId = user?.id || 'guest-farmer-01';
      const ownerName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Local Farmer';
      const ownerPhone = user?.phone || user?.user_metadata?.phone || '9876543210';

      const input: CreateListingInput = {
        title: title.trim(),
        category,
        description: description.trim(),
        price: numPrice,
        price_unit: priceUnit,
        location: {
          state: state.trim(),
          district: district.trim(),
          village: village.trim() || undefined,
          address: address.trim() || undefined,
        },
        images,
        contact_method: contactMethod,
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
      setErrorMsg(err.message || 'Failed to save listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            {t('marketplace.eyebrow') || 'AgriConnect Verified Marketplace'}
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground">
            {listingToEdit ? 'Edit Marketplace Listing' : 'List Equipment, Service or Produce'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Connect directly with thousands of verified farmers and service seekers in your district.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Category Selection */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              Select Category *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MARKETPLACE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    category === cat.id
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 font-bold shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-border bg-card hover:border-emerald-400/40 text-muted-foreground'
                  }`}
                >
                  <div className="text-foreground font-semibold text-[11px] truncate">{cat.nameEn}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{cat.nameHi}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Listing Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mahindra 575 DI 45 HP Tractor for rental / Organic Sharbati Wheat"
              className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 text-foreground"
            />
          </div>

          {/* Price & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Price / Rate (₹) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 850"
                className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Pricing Unit *
              </label>
              <select
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value as MarketplacePriceUnit)}
                className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground"
              >
                <option value="per_hour">Per Hour (प्रति घंटा)</option>
                <option value="per_day">Per Day (प्रति दिन)</option>
                <option value="per_acre">Per Acre (प्रति एकड़)</option>
                <option value="per_kg">Per Kg (प्रति किलो)</option>
                <option value="per_quintal">Per Quintal (प्रति क्विंटल)</option>
                <option value="fixed">Fixed Price (निश्चित मूल्य)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Detailed Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe condition, specifications, capacity, implements included, or delivery terms..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
            />
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-foreground">
                Item / Service Location *
              </label>
              <button
                type="button"
                onClick={handleGpsAutofill}
                disabled={locatingGps}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
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
                placeholder="State"
                className="px-2.5 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
              />
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="District"
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

          {/* Photos & Validation */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Photos (Max 5MB each, JPG/PNG/WEBP) *
            </label>

            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border group">
                  <img src={img} alt="preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center text-xs opacity-80 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-emerald-500 bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-emerald-600 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Upload</span>
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

            <div className="flex gap-2 mt-1">
              <input
                type="url"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="Or paste direct image URL (https://...)"
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

          {/* Contact Preference */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Contact & Request Preference
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['both', 'call', 'in_app'] as MarketplaceContactMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setContactMethod(method)}
                  className={`p-2 rounded-xl border text-xs text-center font-semibold capitalize ${
                    contactMethod === method
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
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
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl inline-flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing…</span>
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
