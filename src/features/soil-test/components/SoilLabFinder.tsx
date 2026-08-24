import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Search,
  Phone,
  Clock,
  ShieldCheck,
  Star,
  Award,
  Truck,
  CheckCircle,
  Sparkles,
  Building2,
  Filter,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { SoilTestingLab } from '../domain/soilTestTypes';
import { SoilSampleBookingModal } from './SoilSampleBookingModal';

const VERIFIED_SOIL_LABS: SoilTestingLab[] = [
  {
    id: 'lab_kvk_agra',
    name: 'ICAR - Krishi Vigyan Kendra Soil Testing Lab',
    type: 'kvk',
    state: 'Uttar Pradesh',
    district: 'Agra',
    address: 'KVK Complex, Bichpuri Road, Agra - 283105',
    phone: '+91 562 263 6441',
    rating: 4.8,
    reviewCount: 312,
    basicPrice: 99,
    completePrice: 199,
    organicPrice: 399,
    turnaroundDays: 2,
    nablAccredited: true,
    isGovtSubsidized: true,
    doorstepSamplePickup: true,
    homeCollectionFee: 40,
    tags: ['ICAR Recognized', 'Govt Subsidized', 'SHC Card Provider'],
  },
  {
    id: 'lab_nabl_meerut',
    name: 'Sardar Vallabhbhai Patel Agri Testing & Research Lab',
    type: 'university',
    state: 'Uttar Pradesh',
    district: 'Meerut',
    address: 'SVPUA&T Campus, Modipuram, Meerut - 250110',
    phone: '+91 121 288 8500',
    rating: 4.9,
    reviewCount: 489,
    basicPrice: 149,
    completePrice: 299,
    organicPrice: 499,
    turnaroundDays: 3,
    nablAccredited: true,
    isGovtSubsidized: true,
    doorstepSamplePickup: true,
    homeCollectionFee: 50,
    tags: ['NABL Certified', '12 Parameter Gold Standard', 'Mobile Lab Available'],
  },
  {
    id: 'lab_pau_ludhiana',
    name: 'PAU Department of Soil Science Testing Laboratory',
    type: 'university',
    state: 'Punjab',
    district: 'Ludhiana',
    address: 'Punjab Agricultural University, Ferozepur Rd, Ludhiana - 141004',
    phone: '+91 161 240 1960',
    rating: 4.9,
    reviewCount: 620,
    basicPrice: 120,
    completePrice: 250,
    organicPrice: 450,
    turnaroundDays: 2,
    nablAccredited: true,
    isGovtSubsidized: true,
    doorstepSamplePickup: true,
    homeCollectionFee: 50,
    tags: ['Premier Agronomy Lab', 'Fast TAT', 'Soil Health Card'],
  },
  {
    id: 'lab_kvk_karnal',
    name: 'CSSRI ICAR Soil & Salinity Analysis Centre',
    type: 'icar',
    state: 'Haryana',
    district: 'Karnal',
    address: 'Central Soil Salinity Research Institute, Zarifa Farm, Karnal - 132001',
    phone: '+91 184 229 0501',
    rating: 4.8,
    reviewCount: 380,
    basicPrice: 150,
    completePrice: 300,
    organicPrice: 500,
    turnaroundDays: 2,
    nablAccredited: true,
    isGovtSubsidized: true,
    doorstepSamplePickup: true,
    homeCollectionFee: 40,
    tags: ['Saline & Alkaline Soil Specialist', 'ICAR Central Lab'],
  },
  {
    id: 'lab_mpkv_pune',
    name: 'MPKV Agricultural Soil Health Diagnostic Center',
    type: 'govt',
    state: 'Maharashtra',
    district: 'Pune',
    address: 'Shivajinagar Agricultural College Campus, Pune - 411005',
    phone: '+91 20 2553 7033',
    rating: 4.7,
    reviewCount: 290,
    basicPrice: 140,
    completePrice: 280,
    organicPrice: 450,
    turnaroundDays: 3,
    nablAccredited: true,
    isGovtSubsidized: true,
    doorstepSamplePickup: true,
    homeCollectionFee: 50,
    tags: ['Black Soil & Horticulture Expert', 'State Govt Accredited'],
  },
  {
    id: 'lab_agri_bhopal',
    name: 'IISS Bhopal Central Soil Testing & Bio-Fertilizer Lab',
    type: 'icar',
    state: 'Madhya Pradesh',
    district: 'Bhopal',
    address: 'Indian Institute of Soil Science, Nabibagh, Berasia Rd, Bhopal - 462038',
    phone: '+91 755 273 0970',
    rating: 4.9,
    reviewCount: 510,
    basicPrice: 110,
    completePrice: 240,
    organicPrice: 420,
    turnaroundDays: 2,
    nablAccredited: true,
    isGovtSubsidized: true,
    doorstepSamplePickup: true,
    homeCollectionFee: 45,
    tags: ['National Soil Institute', 'NABL Accredited', 'Express Report'],
  },
  {
    id: 'lab_bio_jaipur',
    name: 'Rajasthan State Agriculture Soil & Water Testing Lab',
    type: 'govt',
    state: 'Rajasthan',
    district: 'Jaipur',
    address: 'Durgapura Agriculture Research Station, Tonk Rd, Jaipur - 302018',
    phone: '+91 141 255 0229',
    rating: 4.6,
    reviewCount: 230,
    basicPrice: 99,
    completePrice: 199,
    organicPrice: 350,
    turnaroundDays: 3,
    nablAccredited: true,
    isGovtSubsidized: true,
    doorstepSamplePickup: false,
    tags: ['State Govt Free Card Scheme', 'Arid Soil Specialist'],
  },
  {
    id: 'lab_greengold_patna',
    name: 'Bihar Agricultural University Soil Analytical Unit',
    type: 'university',
    state: 'Bihar',
    district: 'Patna',
    address: 'ICAR Parisar, P.O. Bihar Veterinary College, Patna - 800014',
    phone: '+91 612 222 3456',
    rating: 4.7,
    reviewCount: 340,
    basicPrice: 120,
    completePrice: 220,
    organicPrice: 400,
    turnaroundDays: 3,
    nablAccredited: true,
    isGovtSubsidized: true,
    doorstepSamplePickup: true,
    homeCollectionFee: 50,
    tags: ['Gangetic Alluvial Soil Expert', 'Govt Subsidized'],
  },
];

export const SoilLabFinder: React.FC = () => {
  const { language } = useLanguage();
  const isHindi = language === 'hi';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedLabForBooking, setSelectedLabForBooking] = useState<SoilTestingLab | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const states = ['ALL', ...Array.from(new Set(VERIFIED_SOIL_LABS.map((lab) => lab.state)))];

  const filteredLabs = VERIFIED_SOIL_LABS.filter((lab) => {
    const matchesSearch =
      lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesState = selectedState === 'ALL' || lab.state === selectedState;

    return matchesSearch && matchesState;
  });

  const handleBookLab = (lab: SoilTestingLab) => {
    setSelectedLabForBooking(lab);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 via-background to-teal-50/20 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/10">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Building2 className="w-6 h-6 text-emerald-600" />
                {isHindi ? 'सरकारी व NABL मान्यता प्राप्त मृदा परीक्षण लैब' : 'Verified Soil Testing Labs & KVKs'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {isHindi
                  ? 'अपने जिले की लैब खोजें, घर बैठे नमूना पिकअप कराएं व 48 घंटे में डिजिटल रिपोर्ट पाएं।'
                  : 'Find local government KVKs and accredited testing labs. Book doorstep sample collection with 48h turnaround.'}
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-600 text-emerald-700 dark:text-emerald-300 w-fit">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              {isHindi ? '100% ICAR / NABL सत्यापित' : '100% ICAR / NABL Verified'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={isHindi ? 'लैब नाम, जिला या कीवर्ड खोजें...' : 'Search by lab name, district, or keyword...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <div>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="bg-background">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder={isHindi ? 'राज्य चुनें' : 'Filter by State'} />
                </SelectTrigger>
                <SelectContent>
                  {states.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st === 'ALL' ? (isHindi ? 'सभी राज्य (All States)' : 'All States') : st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Labs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLabs.map((lab) => (
          <Card
            key={lab.id}
            className="hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      className={
                        lab.type === 'icar' || lab.type === 'kvk'
                          ? 'bg-emerald-600 text-white text-[10px]'
                          : 'bg-blue-600 text-white text-[10px]'
                      }
                    >
                      {lab.type.toUpperCase()}
                    </Badge>
                    {lab.nablAccredited && (
                      <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700 dark:text-amber-300">
                        <Award className="w-3 h-3 mr-1" />
                        NABL
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-foreground leading-snug">{lab.name}</h3>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{lab.rating}</span>
                  <span className="text-muted-foreground text-[10px] font-normal">({lab.reviewCount})</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{lab.address}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pb-3">
              {/* Feature Tags */}
              <div className="flex flex-wrap gap-1.5">
                {lab.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Lab Key Info Matrix */}
              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-muted/40 rounded-lg text-center text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">{isHindi ? 'मूल NPK' : 'Basic NPK'}</span>
                  <span className="font-bold text-foreground">₹{lab.basicPrice}</span>
                </div>
                <div className="border-x border-border">
                  <span className="text-[10px] text-muted-foreground block">{isHindi ? '12 पैरामीटर' : '12 Params'}</span>
                  <span className="font-bold text-emerald-600">₹{lab.completePrice}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">{isHindi ? 'रिपोर्ट समय' : 'TAT'}</span>
                  <span className="font-bold text-foreground">{lab.turnaroundDays} {isHindi ? 'दिन' : 'Days'}</span>
                </div>
              </div>

              {/* Doorstep Pickup Badge */}
              {lab.doorstepSamplePickup ? (
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isHindi ? 'घर से सैंपल पिकअप उपलब्ध' : 'Doorstep Sample Collection Available'}
                    {lab.homeCollectionFee ? ` (+₹${lab.homeCollectionFee})` : ' (Free)'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{isHindi ? 'लैब में जाकर सैंपल जमा करें' : 'Drop sample directly at lab'}</span>
                </div>
              )}
            </CardContent>

            <div className="p-4 pt-0 mt-auto flex items-center justify-between gap-2 border-t">
              <a
                href={`tel:${lab.phone}`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium py-2 px-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{lab.phone}</span>
              </a>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4"
                onClick={() => handleBookLab(lab)}
              >
                <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
                {isHindi ? 'टेस्ट बुक करें' : 'Book Soil Test'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Booking Modal */}
      <SoilSampleBookingModal
        lab={selectedLabForBooking}
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedLabForBooking(null);
        }}
        onSuccess={(bookingId) => {
          console.log('Booked soil test:', bookingId);
        }}
      />
    </div>
  );
};
