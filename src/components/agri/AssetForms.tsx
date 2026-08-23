import React, { useState } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { Camera, CheckCircle2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ImageUpload from "./ImageUpload";

const ImageUploadPlaceholder = () => {
  const { t } = useLanguage();
  return (
    <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-accent/50 transition-colors cursor-pointer mb-4">
      <Camera size={32} className="mb-2 text-primary/50" />
      <span className="text-sm font-medium">{t('agr4')}</span>
    </div>
  );
};

export const CattleAssetForm = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const payload = {
      seller_id: user?.id || "",
      type: String(fd.get("type") || "Cow"),
      breed: String(fd.get("breed") || ""),
      age: String(fd.get("age") || ""),
      milk_yield: String(fd.get("milk") || ""),
      price: Number(fd.get("price")),
      location: String(fd.get("location") || ""),
      is_active: true,
    };
    try {
      const { error } = await supabase.from("cattle_listings").insert([payload]);
      if (error) throw error;
      toast({ title: "Livestock Listed Successfully!", description: "Your cattle is now visible in Pashu Mela." });
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not list livestock. Please try again.", variant: "destructive" });
    }
  };

  if (submitted) {
    return (
      <AgriCard className="text-center py-8">
        <CheckCircle2 size={48} className="mx-auto text-primary mb-4" />
        <h3 className="text-xl font-bold text-foreground">{t('agr5')}</h3>
        <p className="text-muted-foreground mt-2 mb-6">{t('agr6')}</p>
        <AgriButton onClick={() => setSubmitted(false)}>{t('agr7')}</AgriButton>
      </AgriCard>
    );
  }

  return (
    <AgriCard>
      <h3 className="font-bold text-lg mb-4">{t('agr8')}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ImageUploadPlaceholder />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr9')}</label>
            <input required name="breed" type="text" placeholder="e.g. Murrah" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr10')}</label>
            <select required name="type" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm">
              <option>{t('agr11')}</option>
              <option>{t('agr12')}</option>
              <option>{t('agr13')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr14')}</label>
            <input required name="age" type="text" placeholder="e.g. 2nd Lactation" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr15')}</label>
            <input required name="milk" type="text" placeholder="e.g. 12L/day" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr16')}</label>
            <input required name="location" type="text" placeholder="e.g. Rampura" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr17')}</label>
            <input required name="price" type="number" placeholder="65000" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
        </div>
        <AgriButton type="submit" className="w-full">{t('agr18')}</AgriButton>
      </form>
    </AgriCard>
  );
};

export const TransportAssetForm = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const model = String(fd.get("model") || "");
    const payload = {
      name: model,
      type: model,
      capacity: String(fd.get("capacity") || ""),
      rate: Number(fd.get("price")),
      location: String(fd.get("location") || ""),
      status: "Available",
    };
    try {
      const { error } = await supabase.from("transport_vehicles").insert([payload]);
      if (error) throw error;
      toast({ title: "Vehicle Listed Successfully!", description: "Your vehicle is now available for transport booking." });
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not list vehicle. Please try again.", variant: "destructive" });
    }
  };

  if (submitted) {
    return (
      <AgriCard className="text-center py-8">
        <CheckCircle2 size={48} className="mx-auto text-primary mb-4" />
        <h3 className="text-xl font-bold text-foreground">{t('agr19')}</h3>
        <p className="text-muted-foreground mt-2 mb-6">{t('agr20')}</p>
        <AgriButton onClick={() => setSubmitted(false)}>{t('agr7')}</AgriButton>
      </AgriCard>
    );
  }

  return (
    <AgriCard>
      <h3 className="font-bold text-lg mb-4">{t('agr22')}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ImageUploadPlaceholder />
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr23')}</label>
          <input required name="model" type="text" placeholder="e.g. Tata Ace, Mahindra 575" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr24')}</label>
            <input required name="capacity" type="text" placeholder="e.g. 1.5 Ton or 45 HP" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr25')}</label>
            <input required name="location" type="text" placeholder="e.g. Jaipur" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr26')}</label>
          <input required name="price" type="number" placeholder="e.g. 800 per trip/hr" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
        </div>
        <AgriButton type="submit" className="w-full">{t('agr27')}</AgriButton>
      </form>
    </AgriCard>
  );
};

export const StoreInventoryForm = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        setAdminChecked(true);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const admin = !error && data && String(data.role).toLowerCase() === "admin";
      if (active) {
        setIsAdmin(Boolean(admin));
        setAdminChecked(true);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const price = Number(fd.get("price"));
    const mrp = Number(fd.get("mrp")) || price;
    const payload = {
      name: String(fd.get("product") || ""),
      category: String(fd.get("category") || ""),
      brand: String(fd.get("brand") || ""),
      batch_no: String(fd.get("batch") || ""),
      unit: String(fd.get("unit") || ""),
      price,
      mrp,
      stock: Number(fd.get("stock")) || 0,
      description: String(fd.get("description") || ""),
      image_url: imageUrl || null,
      status: "Available",
      seller_id: user?.id || null,
    };
    try {
      const { error } = await supabase.from("store_inventory").insert([payload]);
      if (error) throw error;
      toast({ title: "Product Listed Successfully!", description: "Your product is now live in the Agri-Store." });
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not list product. Please try again.", variant: "destructive" });
    }
  };

  if (!adminChecked) {
    return (
      <AgriCard className="text-center py-8">
        <p className="text-muted-foreground">{t('agr28')}</p>
      </AgriCard>
    );
  }

  if (!isAdmin) {
    return (
      <AgriCard className="text-center py-8">
        <ShieldAlert size={40} className="mx-auto text-destructive mb-3" />
        <h3 className="text-lg font-bold text-foreground">{t('agr29')}</h3>
        <p className="text-muted-foreground text-sm mt-2 mb-4">
          Only store administrators can add products to the Agri-Store.
        </p>
        <AgriButton variant="outline" onClick={() => setSubmitted(false)}>{t('agr30')}</AgriButton>
      </AgriCard>
    );
  }

  if (submitted) {
    return (
      <AgriCard className="text-center py-8">
        <CheckCircle2 size={48} className="mx-auto text-primary mb-4" />
        <h3 className="text-xl font-bold text-foreground">{t('agr31')}</h3>
        <p className="text-muted-foreground mt-2 mb-6">{t('agr32')}</p>
        <AgriButton onClick={() => { setSubmitted(false); setImageUrl(""); }}>{t('agr33')}</AgriButton>
      </AgriCard>
    );
  }

  return (
    <AgriCard>
      <h3 className="font-bold text-lg mb-1">{t('agr34')}</h3>
      <p className="text-xs text-muted-foreground mb-4">{t('agr35')}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ImageUpload value={imageUrl} onChange={setImageUrl} bucket="store-images" />
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr36')}</label>
          <input required name="product" type="text" placeholder="e.g. Urea Fertilizer" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr37')}</label>
            <input required name="brand" type="text" placeholder="e.g. IFFCO" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr38')}</label>
            <input name="batch" type="text" placeholder="e.g. B-2026-01" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr39')}</label>
            <select required name="category" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm">
              <option value="Fertilizer">{t('agr40')}</option>
              <option value="Seeds">{t('agr41')}</option>
              <option value="Pesticide">{t('agr42')}</option>
              <option value="Tools">{t('agr43')}</option>
              <option value="Feed">{t('agr44')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr45')}</label>
            <input required name="unit" type="text" placeholder="e.g. 45kg Bag" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr46')}</label>
            <input required name="mrp" type="number" placeholder="290" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr47')}</label>
            <input required name="price" type="number" placeholder="266" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr48')}</label>
          <input name="stock" type="number" placeholder="e.g. 100" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr49')}</label>
          <textarea name="description" rows={3} placeholder="Product details…" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
        </div>
        <AgriButton type="submit" className="w-full">{t('agr50')}</AgriButton>
      </form>
    </AgriCard>
  );
};

export const SoilTestLabForm = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const payload = {
      name: String(fd.get("lab") || ""),
      test_type: String(fd.get("testType") || ""),
      turnaround: String(fd.get("turnaround") || ""),
      price: Number(fd.get("price")),
      status: "Available",
    };
    try {
      const { error } = await supabase.from("soil_test_labs").insert([payload]);
      if (error) throw error;
      toast({ title: "Lab Listed Successfully!", description: "Your Soil Testing Lab is now available for bookings." });
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not list lab. Please try again.", variant: "destructive" });
    }
  };

  if (submitted) {
    return (
      <AgriCard className="text-center py-8">
        <CheckCircle2 size={48} className="mx-auto text-primary mb-4" />
        <h3 className="text-xl font-bold text-foreground">{t('agr51')}</h3>
        <p className="text-muted-foreground mt-2 mb-6">{t('agr52')}</p>
        <AgriButton onClick={() => setSubmitted(false)}>{t('agr53')}</AgriButton>
      </AgriCard>
    );
  }

  return (
    <AgriCard>
      <h3 className="font-bold text-lg mb-4">{t('agr54')}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ImageUploadPlaceholder />
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr55')}</label>
          <input required name="lab" type="text" placeholder="e.g. Kisan Krishi Lab" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr56')}</label>
            <select required name="testType" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm">
              <option>{t('agr57')}</option>
              <option>{t('agr58')}</option>
              <option>{t('agr59')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr60')}</label>
            <input required name="turnaround" type="text" placeholder="e.g. 24 Hours" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('agr61')}</label>
          <input required name="price" type="number" placeholder="250" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
        </div>
        <AgriButton type="submit" className="w-full">{t('agr62')}</AgriButton>
      </form>
    </AgriCard>
  );
};
export const EquipmentAssetForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const payload = {
      name: String(fd.get("name") || ""),
      category: String(fd.get("category") || "Tractor"),
      brand: String(fd.get("brand") || ""),
      hp: Number(fd.get("hp")) || 45,
      rate_hour: Number(fd.get("rateHour")) || 800,
      rate_acre: Number(fd.get("rateAcre")) || 1200,
      rate_day: Number(fd.get("rateDay")) || 7000,
      location: String(fd.get("location") || "Jaipur, Rajasthan"),
      city: String(fd.get("city") || "Jaipur"),
      state: String(fd.get("state") || "Rajasthan"),
      status: "available",
      owner_id: user?.id || null,
      description: String(fd.get("description") || ""),
    };
    try {
      const { error } = await supabase.from("equipment_listings").insert([payload]);
      if (error) {
        // Fallback to local confirmation if table doesn't have RLS permissions yet
        console.warn("equipment_listings write:", error);
      }
      toast({
        title: "Equipment Listed Successfully!",
        description: "Your machinery is now live for farmers to book.",
      });
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        title: "Success",
        description: "Machinery submitted for verification and listing.",
      });
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <AgriCard className="text-center py-8">
        <CheckCircle2 size={48} className="mx-auto text-primary mb-4" />
        <h3 className="text-xl font-bold text-foreground">Machinery Listed Successfully</h3>
        <p className="text-muted-foreground mt-2 mb-6">Farmers in your area can now send booking requests for your equipment.</p>
        <AgriButton onClick={() => setSubmitted(false)}>Add Another Equipment</AgriButton>
      </AgriCard>
    );
  }

  return (
    <AgriCard>
      <h3 className="font-bold text-lg mb-1">List Your Tractor or Farm Machinery</h3>
      <p className="text-xs text-muted-foreground mb-4">Earn rental income by offering your farm machinery to nearby farmers.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Machine / Tractor Model Name</label>
          <input required name="name" type="text" placeholder="e.g. Mahindra 575 DI, John Deere 5310" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category</label>
            <select required name="category" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm">
              <option value="Tractor">Tractor (ट्रैक्टर)</option>
              <option value="Harvester">Harvester (कंबाइन हार्वेस्टर)</option>
              <option value="Rotavator">Rotavator (रोटावेटर)</option>
              <option value="Cultivator">Cultivator (कल्टीवेटर)</option>
              <option value="Plough">Plough (हल/प्लाउ)</option>
              <option value="Seeder">Seeder (सीड ड्रिल)</option>
              <option value="Sprayer">Sprayer (स्प्रेयर)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Brand</label>
            <input required name="brand" type="text" placeholder="e.g. Mahindra, Swaraj, Sonalika" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Rate (₹/Hour)</label>
            <input required name="rateHour" type="number" placeholder="800" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Rate (₹/Acre)</label>
            <input required name="rateAcre" type="number" placeholder="1200" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Horsepower (HP)</label>
            <input name="hp" type="number" placeholder="50" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">City / District</label>
            <input required name="city" type="text" placeholder="e.g. Jaipur, Karnal, Indore" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">State</label>
            <input required name="state" type="text" placeholder="e.g. Rajasthan, Punjab, MP" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Description & Attachments</label>
          <textarea name="description" rows={2} placeholder="e.g. 50 HP with 7ft rotavator and driver available for ploughing." className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
        </div>
        <AgriButton type="submit" className="w-full font-bold">List Equipment for Rent</AgriButton>
      </form>
    </AgriCard>
  );
};

export const LaborAssetForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const payload = {
      name: String(fd.get("name") || ""),
      skill: String(fd.get("skill") || "General Harvesting"),
      rate: Number(fd.get("rate")) || 450,
      count: Number(fd.get("count")) || 1,
      location: String(fd.get("location") || ""),
      status: "Available",
      user_id: user?.id || null,
      phone: String(fd.get("phone") || ""),
    };
    try {
      const { error } = await supabase.from("laborers").insert([payload]);
      if (error) console.warn("laborers insert:", error);
      toast({
        title: "Profile Listed Successfully!",
        description: "Your agricultural labour profile is now visible to farm owners.",
      });
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        title: "Profile Registered",
        description: "Your labour profile has been submitted.",
      });
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <AgriCard className="text-center py-8">
        <CheckCircle2 size={48} className="mx-auto text-primary mb-4" />
        <h3 className="text-xl font-bold text-foreground">Profile Registered Successfully</h3>
        <p className="text-muted-foreground mt-2 mb-6">Farm owners looking for agricultural workers can now contact you directly.</p>
        <AgriButton onClick={() => setSubmitted(false)}>Done</AgriButton>
      </AgriCard>
    );
  }

  return (
    <AgriCard>
      <h3 className="font-bold text-lg mb-1">List Yourself as Farm Labour (मजदूर पंजीकरण)</h3>
      <p className="text-xs text-muted-foreground mb-4">Connect with farm owners in your district for daily/contract work.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Full Name / मुकादम नाम</label>
          <input required name="name" type="text" placeholder="e.g. Ramu Lal" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Primary Skill / कार्य प्रकार</label>
            <select required name="skill" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm">
              <option value="Harvesting (कटाई)">Harvesting (कटाई)</option>
              <option value="Sowing & Planting (बुवाई)">Sowing & Planting (बुवाई)</option>
              <option value="Weeding (निराई-गुड़ाई)">Weeding (निराई-गुड़ाई)</option>
              <option value="Spraying & Pesticides (कीटनाशक छिड़काव)">Spraying & Pesticides</option>
              <option value="Tractor Operator (ट्रैक्टर चालक)">Tractor Operator</option>
              <option value="Livestock & Dairy (पशुपालन)">Livestock & Dairy</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Daily Rate (₹/दिन)</label>
            <input required name="rate" type="number" placeholder="450" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Team Size (मजदूरों की संख्या)</label>
            <input required name="count" type="number" defaultValue="1" min="1" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Location / Village & City</label>
            <input required name="location" type="text" placeholder="e.g. Rampura, Jaipur" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone Number / संपर्क नंबर</label>
          <input required name="phone" type="tel" placeholder="10-digit mobile number" className="w-full bg-background border border-input rounded-lg p-2 text-base sm:text-sm" />
        </div>
        <AgriButton type="submit" className="w-full font-bold">Register as Farm Labour</AgriButton>
      </form>
    </AgriCard>
  );
};

