import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { Milk, MapPin, Clock, Phone, ExternalLink, BadgeCheck, PlusCircle, Search, Filter } from "lucide-react";
import { AgriButton } from "@/components/ui/agri-button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AgriImage } from "@/components/ui/agri-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CattleAssetForm } from "./AssetForms";
import { cn } from "@/lib/utils";

interface CattleItem {
  id: number;
  type: string;
  breed: string;
  milk: string;
  price: number;
  age: string;
  location: string;
  image: string;
  sellerName: string;
  sellerPhone: string;
}

const CattleMarket: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAnimal, setSelectedAnimal] = useState<CattleItem | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [cattleList, setCattleList] = useState<CattleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCattle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cattle_listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cattle:', error);
      } else if (data) {
        const mapped: CattleItem[] = data.map((item: any) => ({
          id: parseInt(item.id, 10) || Math.random(),
          type: item.type || 'Cow',
          breed: item.breed || 'Desi',
          milk: item.milk_yield || '—',
          price: item.price || 0,
          age: item.age || 'Adult',
          location: item.location || 'India',
          image: item.image_url || 'https://images.pexels.com/photos/11053137/pexels-photo-11053137.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
          sellerName: item.seller_name || 'Verified Farmer',
          sellerPhone: item.seller_phone || 'Contact via app',
        }));
        setCattleList(mapped);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCattle();
  }, []);

  const handleContactSeller = (animal: CattleItem) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to contact sellers',
        variant: 'destructive'
      });
      return;
    }
    setSelectedAnimal(animal);
    setShowContact(true);
  };

  const isDemoListing = (phone: string) =>
    !phone || phone.includes('X') || phone.toLowerCase().includes('contact');

  const handleCall = (phone: string) => {
    const cleaned = (phone || '').replace(/[^\d+]/g, '');
    if (isDemoListing(phone)) {
      toast({ title: 'Demo profile', description: 'This is a demo listing. Use WhatsApp or message the seller.' });
      return;
    }
    // Validate phone format: should be 10+ digits
    if (!/^\+?\d{10,}$/.test(cleaned)) {
      toast({ title: 'Error', description: 'Invalid phone number' });
      return;
    }
    // Fix: window.open with 'tel:' causes blank tabs on mobile. Location.href handles it cleanly.
    window.location.href = `tel:${cleaned}`;
    toast({ title: 'Calling...', description: 'Connecting to seller...' });
  };

  const handleWhatsApp = (phone: string, animal: CattleItem) => {
    const cleaned = (phone || '').replace(/[^\d]/g, '');
    if (isDemoListing(phone) || !/^\d{10,}$/.test(cleaned)) {
      toast({ title: 'Demo profile', description: 'WhatsApp number not available for this demo listing.' });
      return;
    }
    const msg = encodeURIComponent(
      `Namaste! I'm interested in your ${animal.breed} ${animal.type} listed for ₹${animal.price.toLocaleString()} at ${animal.location}. Is it still available?`
    );
    window.open(`https://wa.me/${cleaned}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const filtered = useMemo(() => {
    let list = [...cattleList];
    if (selectedCategory !== "All") {
      list = list.filter(a => a.type.toLowerCase().includes(selectedCategory.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        a.breed.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.sellerName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [cattleList, selectedCategory, searchQuery]);

  return (
    <div className="pb-24 pt-4 px-4 overflow-y-auto min-h-screen max-w-5xl mx-auto space-y-4">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden h-48 shadow-lg">
        <AgriImage
          src="https://images.unsplash.com/photo-1557166983-5c50b4cb2b4a?auto=format&fit=crop&q=80&w=800"
          alt="Livestock market"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-900/70 to-emerald-950/80" />
        <div className="absolute inset-0 flex items-center justify-between px-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Milk className="text-emerald-400" size={24} /> Pashu Mela
            </h2>
            <p className="text-emerald-100 text-sm">{t('agr78')}</p>
            <p className="text-emerald-300 text-xs font-semibold">{cattleList.length} verified animals available across India</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <AgriButton
              size="sm"
              onClick={() => {
                if (!user) {
                  toast({
                    title: "Login Required",
                    description: "Please login to list your cattle for sale.",
                    variant: "destructive"
                  });
                  return;
                }
                setShowSellDialog(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md"
            >
              <PlusCircle size={15} /> + पशु बेचें (Sell Cattle)
            </AgriButton>
            <AgriButton
              size="sm"
              variant="outline"
              onClick={() => window.open('https://epashuhaat.gov.in/', '_blank', 'noopener,noreferrer')}
              className="bg-black/30 text-white border-white/20 hover:bg-black/50"
            >
              <ExternalLink size={14} /> e-Pashuhaat
            </AgriButton>
          </div>
        </div>
      </div>

      {/* Search & Categories Bar */}
      <div className="bg-card p-3 rounded-2xl border border-border shadow-sm space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search breed, cow, buffalo, goat, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {["All", "Cow", "Buffalo", "Goat", "Bull"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors",
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
              )}
            >
              {cat === "All" ? "सभी (All)" : cat === "Cow" ? "गाय (Cow)" : cat === "Buffalo" ? "भैंस (Buffalo)" : cat === "Goat" ? "बकरी (Goat)" : "बैल (Bull)"}
            </button>
          ))}
        </div>
      </div>

      {/* Cards List / Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card rounded-3xl border border-dashed border-border space-y-3">
          <Milk className="mx-auto w-12 h-12 text-muted-foreground opacity-40" />
          <h4 className="text-base font-bold text-foreground">No livestock listings found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No active cattle listings match your search. Be the first farmer to list livestock for buyers across your state!
          </p>
          <AgriButton
            size="sm"
            onClick={() => {
              if (!user) {
                toast({ title: "Login Required", description: "Please login to list livestock.", variant: "destructive" });
                return;
              }
              setShowSellDialog(true);
            }}
          >
            <PlusCircle size={15} /> List Your Cattle
          </AgriButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((animal) => (
            <div
              key={animal.id}
              className="bg-card rounded-2xl shadow-card border border-border overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Full-width image */}
              <div className="relative h-52 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <AgriImage
                  src={animal.image}
                  type="cattle"
                  contextName={`${animal.breed} ${animal.type}`}
                  alt={`${animal.breed} ${animal.type} dairy cattle`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                  <div>
                    <h4 className="font-extrabold text-white text-lg leading-tight drop-shadow">
                      {animal.breed} {animal.type}
                    </h4>
                    <p className="text-white/90 text-xs flex items-center gap-1 mt-0.5 font-medium">
                      <MapPin size={12} className="text-emerald-400" /> {animal.location}
                    </p>
                  </div>
                  <span className="text-lg font-black text-white bg-emerald-600 px-3 py-1 rounded-xl shadow-md">
                    ₹{animal.price.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
                    🥛 {animal.milk}
                  </span>
                  <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs flex items-center gap-1 font-semibold">
                    <Clock size={12} /> {animal.age}
                  </span>
                  <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs flex items-center gap-1 font-semibold">
                    👤 {animal.sellerName} <BadgeCheck size={14} className="text-emerald-600" />
                  </span>
                </div>

                <AgriButton
                  className="w-full font-bold"
                  onClick={() => handleContactSeller(animal)}
                >
                  <Phone size={15} /> Contact Farmer / पशुपालक से संपर्क करें
                </AgriButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sell Cattle Dialog */}
      <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Milk className="text-emerald-600" size={20} /> पशु बिक्री हेतु सूचीबद्ध करें (List Cattle for Sale)
            </DialogTitle>
          </DialogHeader>
          <CattleAssetForm />
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('agr79')}</DialogTitle>
          </DialogHeader>
          {selectedAnimal && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <AgriImage
                  src={selectedAnimal.image}
                  alt={selectedAnimal.breed}
                  assetName={`${selectedAnimal.breed} ${selectedAnimal.type}`}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <p className="font-bold text-foreground">{selectedAnimal.breed} {selectedAnimal.type}</p>
                  <p className="text-sm text-muted-foreground">{selectedAnimal.location}</p>
                  <p className="text-primary font-bold">₹{selectedAnimal.price.toLocaleString()}</p>
                </div>
              </div>

              <div className="p-3 border border-border rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">{t('agr80')}</p>
                <p className="font-semibold text-foreground">{selectedAnimal.sellerName}</p>
                {isDemoListing(selectedAnimal.sellerPhone) ? (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Demo listing — contact seller via the app after login.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone size={12} /> {selectedAnimal.sellerPhone}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <AgriButton
                  variant="outline"
                  className="w-full"
                  onClick={() => handleCall(selectedAnimal.sellerPhone)}
                >
                  <Phone size={16} /> Call Now
                </AgriButton>
                <AgriButton
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handleWhatsApp(selectedAnimal.sellerPhone, selectedAnimal)}
                >
                  💬 WhatsApp
                </AgriButton>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Always verify livestock health before purchasing. Meet in person for transactions.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CattleMarket;
