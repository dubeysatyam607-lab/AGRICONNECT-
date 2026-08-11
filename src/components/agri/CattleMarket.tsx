import React, { useState, useEffect } from "react";
import { Milk, MapPin, Clock, Phone, ExternalLink, BadgeCheck } from "lucide-react";
import { AgriButton } from "@/components/ui/agri-button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AgriImage } from "@/components/ui/agri-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

const CATTLE: CattleItem[] = [
  {
    id: 1,
    type: 'Buffalo',
    breed: 'Murrah',
    milk: '12L/day',
    price: 65000,
    age: '2 Lactation',
    location: 'Rampura, Rajasthan',
    image: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=800',
    sellerName: 'Ramesh Kumar',
    sellerPhone: '+91 XXXXX XXXXX'
  },
  {
    id: 2,
    type: 'Cow',
    breed: 'Gir',
    milk: '14L/day',
    price: 55000,
    age: '1 Lactation',
    location: 'Sanganer, Jaipur',
    image: 'https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?auto=format&fit=crop&q=80&w=800',
    sellerName: 'Suresh Patel',
    sellerPhone: '+91 XXXXX XXXXX'
  },
  {
    id: 3,
    type: 'Cow',
    breed: 'Jersey',
    milk: '18L/day',
    price: 45000,
    age: '3 Lactation',
    location: 'Chomu, Jaipur',
    image: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=800',
    sellerName: 'Mahesh Singh',
    sellerPhone: '+91 XXXXX XXXXX'
  },
  {
    id: 4,
    type: 'Buffalo',
    breed: 'Jaffarabadi',
    milk: '15L/day',
    price: 75000,
    age: '1 Lactation',
    location: 'Dudu, Jaipur',
    image: 'https://images.unsplash.com/photo-1564466809058-bf4114d55352?auto=format&fit=crop&q=80&w=800',
    sellerName: 'Dinesh Yadav',
    sellerPhone: '+91 XXXXX XXXXX'
  },
  {
    id: 5,
    type: 'Goat',
    breed: 'Beetal',
    milk: '3L/day',
    price: 15000,
    age: 'Young',
    location: 'Jaipur, Rajasthan',
    image: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=800',
    sellerName: 'Vikram Sharma',
    sellerPhone: '+91 XXXXX XXXXX'
  },
];

const CattleMarket: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAnimal, setSelectedAnimal] = useState<CattleItem | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [cattleList, setCattleList] = useState<CattleItem[]>(CATTLE);
  const [usingSample, setUsingSample] = useState(true);

// Address the "missing thing": Fetch live data using the imported Supabase client
  useEffect(() => {
    const fetchCattle = async () => {
      const { data, error } = await supabase
        .from('cattle_listings')
        .select('*');

      if (error) {
        console.error('Error fetching cattle:', error);
      } else if (data && data.length > 0) {
        // Map Supabase data to CattleItem interface
        const mapped: CattleItem[] = data.map((item: any) => ({
          id: parseInt(item.id, 10) || Math.random(),
          type: item.type || 'Cow',
          breed: item.breed,
          milk: item.milk_yield || '—',
          price: item.price,
          age: item.age,
          location: item.location,
          image: item.image_url || 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=800',
          sellerName: 'Verified Seller',
          sellerPhone: 'Contact for details',
        }));
        setCattleList(mapped);
        setUsingSample(false);
      }
    };

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

  return (
    <div className="pb-24 pt-4 px-4 overflow-y-auto min-h-screen">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden h-44 mb-5 shadow-lg">
        <AgriImage
          src="https://images.unsplash.com/photo-1557166983-5c50b4cb2b4a?auto=format&fit=crop&q=80&w=800"
          alt="Livestock market"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40" />
        <div className="absolute inset-0 flex items-center justify-between px-5">
          <div>
            <h2 className="text-2xl font-bold text-primary-foreground flex items-center gap-2">
              <Milk size={22} /> Pashu Mela
            </h2>
            <p className="text-primary-foreground/80 text-sm mt-1">Buy & Sell Quality Livestock</p>
            <p className="text-primary-foreground/60 text-xs mt-0.5">{cattleList.length} animals listed nearby</p>
          </div>
          <AgriButton
            size="sm"
            onClick={() => window.open('https://epashuhaat.gov.in/', '_blank', 'noopener,noreferrer')}
            className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/30"
          >
            <ExternalLink size={14} /> e-Pashuhaat
          </AgriButton>
        </div>
      </div>

      {usingSample && (
        <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 px-3.5 py-2.5 text-[12px] font-semibold text-amber-800 dark:text-amber-300">
          Sample listings — real animals appear here once sellers add them.
        </div>
      )}

      {/* Cards */}
      <div className="space-y-4">
        {cattleList.map((animal) => (
          <div
            key={animal.id}
            className="bg-card rounded-2xl shadow-card border border-border overflow-hidden"
          >
            {/* Full-width image */}
            <div className="relative h-52 overflow-hidden">
              <AgriImage
                src={animal.image}
                alt={`${animal.breed} ${animal.type}`}
                assetName={`${animal.breed} ${animal.type}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                <div>
                  <h4 className="font-bold text-white text-lg leading-tight">
                    {animal.breed} {animal.type}
                  </h4>
                  <p className="text-white/80 text-sm flex items-center gap-1 mt-0.5">
                    <MapPin size={12} /> {animal.location}
                  </p>
                </div>
                <span className="text-xl font-bold text-white bg-primary/80 px-3 py-1 rounded-xl backdrop-blur-sm">
                  ₹{animal.price.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  🥛 {animal.milk}
                </span>
                <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Clock size={12} /> {animal.age}
                </span>
                <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  👤 {animal.sellerName} <BadgeCheck size={14} className="text-primary" />
                </span>
                {isDemoListing(animal.sellerPhone) && (
                  <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                    Demo
                  </span>
                )}
              </div>

              <AgriButton
                className="w-full"
                onClick={() => handleContactSeller(animal)}
              >
                <Phone size={16} /> Contact Seller
              </AgriButton>
            </div>
          </div>
        ))}
      </div>

      {/* Contact Dialog */}
      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Seller</DialogTitle>
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
                <p className="text-xs text-muted-foreground mb-1">Seller</p>
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
