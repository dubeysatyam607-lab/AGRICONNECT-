import React, { useState, useMemo, useEffect } from "react";
import { Milk, ExternalLink, MapPin, Filter, Search } from "lucide-react";
import { AgriButton } from "@/components/ui/agri-button";
import { AgriCard } from "@/components/ui/agri-card";
import { LazyImage } from "@/components/ui/lazy-image";
import { Input } from "@/components/ui/input";
import PashuMelaSkeleton from "./skeletons/PashuMelaSkeleton";
import { supabase } from "@/integrations/supabase/client";

interface LivestockItem {
  id: number;
  type: 'Cow' | 'Buffalo' | 'Goat' | 'Poultry';
  breed: string;
  milk: string;
  price: number;
  age: string;
  location: string;
  distance: string;
  image: string;
  seller: string;
  verified: boolean;
}

const LIVESTOCK: LivestockItem[] = [
  { 
    id: 1, 
    type: 'Buffalo', 
    breed: 'Murrah', 
    milk: '12L/day', 
    price: 85000, 
    age: '2 Lactation', 
    location: 'Rampura, Jaipur',
    distance: '5 km',
    seller: 'Ramesh Kumar',
    verified: true,
    image: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=600'
  },
  { 
    id: 2, 
    type: 'Cow', 
    breed: 'Gir', 
    milk: '14L/day', 
    price: 65000, 
    age: '1 Lactation', 
    location: 'Sanganer, Jaipur',
    distance: '8 km',
    seller: 'Suresh Patel',
    verified: true,
    image: 'https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?auto=format&fit=crop&q=80&w=600'
  },
  { 
    id: 3, 
    type: 'Cow', 
    breed: 'Sahiwal', 
    milk: '10L/day', 
    price: 55000, 
    age: '3 Lactation', 
    location: 'Chomu, Jaipur',
    distance: '15 km',
    seller: 'Mohan Singh',
    verified: false,
    image: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=600'
  },
  { 
    id: 4, 
    type: 'Buffalo', 
    breed: 'Jaffarabadi', 
    milk: '15L/day', 
    price: 95000, 
    age: '1 Lactation', 
    location: 'Dudu, Jaipur',
    distance: '12 km',
    seller: 'Kishan Lal',
    verified: true,
    image: 'https://images.unsplash.com/photo-1564466809058-bf4114d55352?auto=format&fit=crop&q=80&w=600'
  },
  { 
    id: 5, 
    type: 'Goat', 
    breed: 'Beetal', 
    milk: '3L/day', 
    price: 18000, 
    age: 'Young', 
    location: 'Jaipur City',
    distance: '3 km',
    seller: 'Abdul Khan',
    verified: true,
    image: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=600'
  },
  { 
    id: 6, 
    type: 'Cow', 
    breed: 'Jersey Cross', 
    milk: '18L/day', 
    price: 48000, 
    age: '2 Lactation', 
    location: 'Amber, Jaipur',
    distance: '10 km',
    seller: 'Vikram Sharma',
    verified: false,
    image: 'https://images.unsplash.com/photo-1593179357196-ea11a2e7c119?auto=format&fit=crop&q=80&w=600'
  },
  { 
    id: 7, 
    type: 'Poultry', 
    breed: 'Kadaknath', 
    milk: 'N/A', 
    price: 1200, 
    age: '6 months', 
    location: 'Chaksu, Jaipur',
    distance: '20 km',
    seller: 'Lakhan Das',
    verified: true,
    image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=600'
  },
  { 
    id: 8, 
    type: 'Goat', 
    breed: 'Sirohi', 
    milk: '2L/day', 
    price: 12000, 
    age: '1 Year', 
    location: 'Phagi, Jaipur',
    distance: '25 km',
    seller: 'Gopal Yadav',
    verified: true,
    image: 'https://images.unsplash.com/photo-1533318087102-b3ad366ed041?auto=format&fit=crop&q=80&w=600'
  },
];

const BREEDS_BY_TYPE: Record<string, string[]> = {
  'Cow': ['All Breeds', 'Gir', 'Sahiwal', 'Jersey Cross', 'Tharparkar', 'Kankrej'],
  'Buffalo': ['All Breeds', 'Murrah', 'Jaffarabadi', 'Mehsana', 'Nili-Ravi'],
  'Goat': ['All Breeds', 'Beetal', 'Sirohi', 'Jamnapari', 'Barbari'],
  'Poultry': ['All Breeds', 'Kadaknath', 'Aseel', 'Rhode Island', 'Leghorn'],
};

interface PashuMelaProps {
  onToast: (message: string) => void;
}

const PashuMela: React.FC<PashuMelaProps> = ({ onToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterBreed, setFilterBreed] = useState<string>('All Breeds');
  const [minMilk, setMinMilk] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [livestockData, setLivestockData] = useState<LivestockItem[]>(LIVESTOCK);

  // Fetch actual data from Supabase
  useEffect(() => {
    const fetchLivestock = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('livestock').select('*').returns<LivestockItem[]>();
      if (error) {
        console.error('Error fetching livestock:', error);
      } else if (data && data.length > 0) {
        setLivestockData(data);
      }
      setIsLoading(false);
    };
    
    fetchLivestock();
  }, []);

  const filteredLivestock = useMemo(() => {
    return livestockData.filter(animal => {
      const matchesSearch = animal.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
        animal.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        animal.seller.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'All' || animal.type === filterType;
      const matchesBreed = filterBreed === 'All Breeds' || animal.breed === filterBreed;
      
      let matchesMilk = true;
      if (minMilk && animal.milk !== 'N/A') {
        const milkValue = parseInt(animal.milk);
        matchesMilk = milkValue >= parseInt(minMilk);
      }
      
      return matchesSearch && matchesType && matchesBreed && matchesMilk;
    });
  }, [searchQuery, filterType, filterBreed, minMilk]);

  const handleContact = (animal: LivestockItem) => {
    onToast(`Contacting ${animal.seller} for ${animal.breed} ${animal.type}...`);
  };

  const handleViewDetails = () => {
    window.open('https://epashuhaat.gov.in/', '_blank', 'noopener,noreferrer');
  };

  const availableBreeds = filterType !== 'All' ? BREEDS_BY_TYPE[filterType] || ['All Breeds'] : ['All Breeds'];

  if (isLoading) {
    return (
      <div className="pb-24 pt-4 px-4">
        <PashuMelaSkeleton />
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 animate-fade-in">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Milk className="text-primary" /> पशु मेला
          </h2>
          <p className="text-muted-foreground text-sm">Livestock Marketplace</p>
        </div>
        <AgriButton size="sm" onClick={handleViewDetails}>
          <ExternalLink size={14} /> e-Pashuhaat
        </AgriButton>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search breed, location, seller..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
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

      {/* Advanced Filters Toggle */}
      <AgriButton
        variant="ghost"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className="mb-3 w-full justify-center"
      >
        <Filter size={14} /> {showFilters ? 'Hide Filters' : 'More Filters'}
      </AgriButton>

      {/* Advanced Filters */}
      {showFilters && (
        <AgriCard className="p-3 mb-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Breed</label>
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
          
          {filterType !== 'Poultry' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Min Milk Yield (L/day)</label>
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
        Showing {filteredLivestock.length} animals
      </p>

      {/* Listings Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredLivestock.map((animal, idx) => (
          <AgriCard key={animal.id} className="p-0 overflow-hidden animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="h-28 bg-muted overflow-hidden relative">
              <LazyImage
                src={animal.image}
                alt={`${animal.breed} ${animal.type}`}
                className="w-full h-full object-cover"
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <Milk size={32} className="text-primary/50" />
                  </div>
                }
              />
              {animal.verified && (
                <span className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  ✓ Verified
                </span>
              )}
            </div>
            <div className="p-2">
              <h4 className="font-bold text-sm text-foreground truncate">
                {animal.breed}
              </h4>
              <p className="text-xs text-muted-foreground">{animal.type}</p>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin size={10} />
                <span className="truncate">{animal.distance}</span>
              </div>
              
              <div className="mt-2 flex justify-between items-center">
                <span className="text-primary font-bold text-sm">
                  ₹{animal.price.toLocaleString()}
                </span>
                {animal.milk !== 'N/A' && (
                  <span className="text-[10px] bg-feature-community/10 text-feature-community px-1.5 py-0.5 rounded">
                    {animal.milk}
                  </span>
                )}
              </div>
              
              <AgriButton 
                size="sm" 
                className="w-full mt-2 text-xs"
                onClick={() => handleContact(animal)}
              >
                Contact
              </AgriButton>
            </div>
          </AgriCard>
        ))}
      </div>

      {filteredLivestock.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Milk size={48} className="mx-auto mb-2 opacity-50" />
          <p>No animals found</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
};

export default PashuMela;
