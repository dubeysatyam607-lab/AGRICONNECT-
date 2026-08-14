import React, { useState, useMemo } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { Milk, MapPin, Filter, Search, Plus, LogIn, Trash2 } from "lucide-react";
import { AgriButton } from "@/components/ui/agri-button";
import { AgriCard } from "@/components/ui/agri-card";
import { LazyImage } from "@/components/ui/lazy-image";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useCattleListings, CattleListing } from "@/hooks/useCattleListings";
import VoiceInputButton from "./VoiceInputButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from "./ImageUpload";
import { z } from "zod";

// Validation schema for cattle listing
const listingSchema = z.object({
  type: z.enum(['Cow', 'Buffalo', 'Goat', 'Poultry']),
  breed: z.string().min(1, 'Breed is required').max(50, 'Breed name too long'),
  milk_yield: z.string().max(10, 'Invalid milk yield').optional().nullable(),
  price: z.number().int().positive('Price must be positive').max(10000000, 'Price too high'),
  age: z.string().min(1, 'Age is required').max(20, 'Age description too long'),
  location: z.string().min(2, 'Location is required').max(100, 'Location too long'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal(''))
});

// Sanitize text input - remove potentially dangerous characters
const sanitizeText = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove special characters
    .trim();
};

// Validate and sanitize phone number for tel: links
const sanitizePhoneNumber = (phone: string): string => {
  // Only allow digits, +, -, spaces, and parentheses
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
};

const BREEDS_BY_TYPE: Record<string, string[]> = {
  'Cow': ['Gir', 'Sahiwal', 'Jersey Cross', 'Tharparkar', 'Kankrej'],
  'Buffalo': ['Murrah', 'Jaffarabadi', 'Mehsana', 'Nili-Ravi'],
  'Goat': ['Beetal', 'Sirohi', 'Jamnapari', 'Barbari'],
  'Poultry': ['Kadaknath', 'Aseel', 'Rhode Island', 'Leghorn'],
};

interface PashuMelaLiveProps {
  onToast: (message: string) => void;
  onNavigateToAuth: () => void;
}

const PashuMelaLive: React.FC<PashuMelaLiveProps> = ({ onToast, onNavigateToAuth }) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterBreed, setFilterBreed] = useState<string>('All Breeds');
  const [minMilk, setMinMilk] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMyListings, setShowMyListings] = useState(false);

  const { user } = useAuth();
  const { listings, myListings, loading, createListing, deleteListing, getSellerContact } = useCattleListings();
  const { toast } = useToast();

  const [newListing, setNewListing] = useState({
    type: 'Cow' as 'Cow' | 'Buffalo' | 'Goat' | 'Poultry',
    breed: '',
    milk_yield: '',
    price: '',
    age: '',
    location: '',
    description: '',
    image_url: ''
  });

  const displayListings = showMyListings ? myListings : listings;

  const filteredListings = useMemo(() => {
    return displayListings.filter(animal => {
      const matchesSearch = animal.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
        animal.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'All' || animal.type === filterType;
      const matchesBreed = filterBreed === 'All Breeds' || animal.breed === filterBreed;
      
      let matchesMilk = true;
      if (minMilk && animal.milk_yield) {
        const milkValue = parseInt(animal.milk_yield);
        matchesMilk = milkValue >= parseInt(minMilk);
      }
      
      return matchesSearch && matchesType && matchesBreed && matchesMilk;
    });
  }, [displayListings, searchQuery, filterType, filterBreed, minMilk]);

  const handleContact = async (animal: CattleListing) => {
    if (!user) {
      onToast('Please login to contact sellers');
      onNavigateToAuth();
      return;
    }

    try {
      onToast(`Getting contact for: ${animal.seller_name || 'Seller'}...`);
      const contactInfo = await getSellerContact(animal.id);
      
      if (contactInfo.phone) {
        const sanitizedPhone = sanitizePhoneNumber(contactInfo.phone);
        if (sanitizedPhone) {
          window.open(`tel:${encodeURIComponent(sanitizedPhone)}`);
          toast({ 
            title: 'Calling Seller', 
            description: `Calling ${contactInfo.sellerName} about ${animal.breed} ${animal.type}` 
          });
        }
      }
    } catch (error: any) {
      toast({ 
        title: 'Contact Failed', 
        description: error.message || 'Could not get seller contact', 
        variant: 'destructive' 
      });
    }
  };

  const handleVoiceSearch = (text: string) => {
    setSearchQuery(text);
    onToast(`Searching: "${text}"`);
  };

  const [creating, setCreating] = useState(false);
  const handleCreateListing = async () => {
    if (!user) {
      onNavigateToAuth();
      return;
    }
    if (creating) return;
    setCreating(true);

    try {
      // Sanitize inputs
      const sanitizedData = {
        type: newListing.type,
        breed: sanitizeText(newListing.breed),
        milk_yield: newListing.milk_yield ? sanitizeText(newListing.milk_yield) : null,
        price: parseInt(newListing.price) || 0,
        age: sanitizeText(newListing.age),
        location: sanitizeText(newListing.location),
        description: newListing.description ? sanitizeText(newListing.description) : null,
        image_url: newListing.image_url || null
      };

      // Validate with Zod schema
      const validatedData = listingSchema.parse(sanitizedData);
      
      await createListing({
        type: validatedData.type,
        breed: validatedData.breed,
        milk_yield: validatedData.milk_yield,
        price: validatedData.price,
        age: validatedData.age,
        location: validatedData.location,
        description: validatedData.description,
        image_url: validatedData.image_url || null
      });
      
      toast({ title: 'Success!', description: 'Your listing has been created.' });
      setShowCreateDialog(false);
      setNewListing({
        type: 'Cow',
        breed: '',
        milk_yield: '',
        price: '',
        age: '',
        location: '',
        description: '',
        image_url: ''
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({ title: 'Validation Error', description: firstError.message, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      await deleteListing(id);
      toast({ title: 'Deleted', description: 'Listing removed successfully.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const availableBreeds = filterType !== 'All' ? ['All Breeds', ...(BREEDS_BY_TYPE[filterType] || [])] : ['All Breeds'];

  return (
    <div className="pb-24 pt-4 px-4">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Milk className="text-primary" /> पशु मेला
          </h2>
          <p className="text-muted-foreground text-sm">{t('agr133')}</p>
        </div>
        {user ? (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <AgriButton size="sm">
                <Plus size={14} /> Sell
              </AgriButton>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('agr134')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t('agr135')}</label>
                  <Select value={newListing.type} onValueChange={(v) => setNewListing(p => ({ ...p, type: v as any, breed: '' }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cow">{t('agr136')}</SelectItem>
                      <SelectItem value="Buffalo">{t('agr137')}</SelectItem>
                      <SelectItem value="Goat">{t('agr138')}</SelectItem>
                      <SelectItem value="Poultry">{t('agr139')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t('agr140')}</label>
                  <Select value={newListing.breed} onValueChange={(v) => setNewListing(p => ({ ...p, breed: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select breed" />
                    </SelectTrigger>
                    <SelectContent>
                      {BREEDS_BY_TYPE[newListing.type]?.map(breed => (
                        <SelectItem key={breed} value={breed}>{breed}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">{t('agr141')}</label>
                    <Input
                      type="number"
                      placeholder="50000"
                      value={newListing.price}
                      onChange={(e) => setNewListing(p => ({ ...p, price: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">{t('agr142')}</label>
                    <Input
                      placeholder="2 years"
                      value={newListing.age}
                      onChange={(e) => setNewListing(p => ({ ...p, age: e.target.value }))}
                    />
                  </div>
                </div>

                {newListing.type !== 'Poultry' && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">{t('agr143')}</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="12"
                      value={newListing.milk_yield}
                      onChange={(e) => setNewListing(p => ({ ...p, milk_yield: e.target.value }))}
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t('agr144')}</label>
                  <Input
                    placeholder="Village, District"
                    value={newListing.location}
                    onChange={(e) => setNewListing(p => ({ ...p, location: e.target.value }))}
                  />
                </div>

                <ImageUpload
                  value={newListing.image_url}
                  onChange={(url) => setNewListing(p => ({ ...p, image_url: url }))}
                  onError={(error) => toast({ title: 'Upload Error', description: error, variant: 'destructive' })}
                />

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t('agr145')}</label>
                  <Textarea
                    placeholder="Additional details about the animal..."
                    value={newListing.description}
                    onChange={(e) => setNewListing(p => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <AgriButton className="w-full" onClick={handleCreateListing} disabled={creating}>
                  {creating ? 'Creating…' : 'Create Listing'}
                </AgriButton>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <AgriButton size="sm" onClick={onNavigateToAuth}>
            <LogIn size={14} /> Login to Sell
          </AgriButton>
        )}
      </div>

      {/* Toggle My Listings */}
      {user && (
        <div className="flex gap-2 mb-4">
          <AgriButton
            size="sm"
            variant={!showMyListings ? 'primary' : 'outline'}
            onClick={() => setShowMyListings(false)}
          >
            All Listings
          </AgriButton>
          <AgriButton
            size="sm"
            variant={showMyListings ? 'primary' : 'outline'}
            onClick={() => setShowMyListings(true)}
          >
            My Listings ({myListings.length})
          </AgriButton>
        </div>
      )}

      {/* Search with Voice Input */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search breed, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <VoiceInputButton
          onTranscript={handleVoiceSearch}
          onError={(error) => onToast(error)}
          language="hi-IN"
        />
      </div>

      {/* Type Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {['All', 'Cow', 'Buffalo', 'Goat', 'Poultry'].map((type) => (
          <AgriButton
            key={type}
            size="sm"
            variant={filterType === type ? 'primary' : 'outline'}
            onClick={() => {
              setFilterType(type);
              setFilterBreed('All Breeds');
            }}
            className="whitespace-nowrap"
          >
            {type}
          </AgriButton>
        ))}
      </div>

      {/* Advanced Filters */}
      <AgriButton
        variant="ghost"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className="mb-3 w-full justify-center"
      >
        <Filter size={14} /> {showFilters ? 'Hide Filters' : 'More Filters'}
      </AgriButton>

      {showFilters && (
        <AgriCard className="p-3 mb-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('agr140')}</label>
            <div className="flex gap-2 flex-wrap">
              {availableBreeds.map((breed) => (
                <AgriButton
                  key={breed}
                  size="sm"
                  variant={filterBreed === breed ? 'secondary' : 'outline'}
                  onClick={() => setFilterBreed(breed)}
                  className="text-xs"
                >
                  {breed}
                </AgriButton>
              ))}
            </div>
          </div>
          
          {filterType !== 'Poultry' && filterType !== 'All' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('agr147')}</label>
              <div className="flex gap-2">
                {['', '5', '10', '12', '15'].map((val) => (
                  <AgriButton
                    key={val}
                    size="sm"
                    variant={minMilk === val ? 'secondary' : 'outline'}
                    onClick={() => setMinMilk(val)}
                    className="text-xs"
                  >
                    {val === '' ? 'Any' : `${val}+`}
                  </AgriButton>
                ))}
              </div>
            </div>
          )}
        </AgriCard>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-3">
        {loading ? 'Loading...' : `Showing ${filteredListings.length} animals`}
        {!showMyListings && <span className="text-primary ml-1">• Live</span>}
      </p>

      {/* Listings — vertical full-width cards */}
      <div className="space-y-4">
        {filteredListings.map((animal) => {
          const FALLBACK_IMAGES: Record<string, string> = {
            'Buffalo': 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=800',
            'Cow':     'https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?auto=format&fit=crop&q=80&w=800',
            'Goat':    'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=800',
            'Poultry': 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=800',
          };
          const imgSrc = animal.image_url || FALLBACK_IMAGES[animal.type] || FALLBACK_IMAGES['Cow'];
          return (
            <div key={animal.id} className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
              {/* Full-width image */}
              <div className="relative h-52 overflow-hidden">
                <LazyImage
                  src={imgSrc}
                  alt={`${animal.breed} ${animal.type}`}
                  className="w-full h-full object-cover"
                  fallback={
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <Milk size={48} className="text-primary/40" />
                    </div>
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {animal.is_verified && (
                  <span className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    ✓ Verified
                  </span>
                )}
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

              {/* Info row */}
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {animal.milk_yield && (
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                      🥛 {animal.milk_yield}L/day
                    </span>
                  )}
                  <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm">
                    🎂 {animal.age}
                  </span>
                  {animal.seller_name && (
                    <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm">
                      👤 {animal.seller_name}
                    </span>
                  )}
                </div>

                {animal.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{animal.description}</p>
                )}

                {showMyListings && animal.seller_id === user?.id ? (
                  <AgriButton
                    variant="danger"
                    className="w-full"
                    onClick={() => handleDeleteListing(animal.id)}
                  >
                    <Trash2 size={14} /> Remove Listing
                  </AgriButton>
                ) : (
                  <AgriButton
                    className="w-full"
                    onClick={() => handleContact(animal)}
                  >
                    📞 Contact Seller
                  </AgriButton>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filteredListings.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Milk size={48} className="mx-auto mb-2 opacity-50" />
          <p>{t('agr148')}</p>
          <p className="text-sm">
            {showMyListings ? "You haven't listed any animals yet." : 'Try adjusting your filters'}
          </p>
        </div>
      )}
    </div>
  );
};

export default PashuMelaLive;
