import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Phone, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AgriCard } from '@/components/ui/agri-card';

interface MandiFinder {
  onToast: (message: string) => void;
}

const NEARBY_MANDIS = [
  {
    id: 1,
    name: 'Jaipur Krishi Mandi',
    nameHi: 'जयपुर कृषि मंडी',
    distance: '2.5 km',
    address: 'Muhana Mandi Road, Jaipur',
    addressHi: 'मुहाना मंडी रोड, जयपुर',
    phone: '+91 141 2712345',
    timings: '6:00 AM - 8:00 PM',
    lat: 26.8929,
    lng: 75.8254,
  },
  {
    id: 2,
    name: 'Chomu Sabzi Mandi',
    nameHi: 'चौमू सब्जी मंडी',
    distance: '15 km',
    address: 'Near Bus Stand, Chomu',
    addressHi: 'बस स्टैंड के पास, चौमू',
    phone: '+91 1423 234567',
    timings: '5:00 AM - 6:00 PM',
    lat: 27.1656,
    lng: 75.7231,
  },
  {
    id: 3,
    name: 'Sanganer Phool Mandi',
    nameHi: 'सांगानेर फूल मंडी',
    distance: '8 km',
    address: 'Airport Road, Sanganer',
    addressHi: 'एयरपोर्ट रोड, सांगानेर',
    phone: '+91 141 2550123',
    timings: '4:00 AM - 2:00 PM',
    lat: 26.8200,
    lng: 75.7885,
  },
];

const MandiFinder: React.FC<MandiFinder> = ({ onToast }) => {
  const { language, t } = useLanguage();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLoading(false);
        },
        () => {
          // Default to Jaipur if geolocation fails
          setUserLocation({ lat: 26.9124, lng: 75.7873 });
          setIsLoading(false);
        }
      );
    } else {
      setUserLocation({ lat: 26.9124, lng: 75.7873 });
      setIsLoading(false);
    }
  }, []);

  const openInMaps = (mandi: typeof NEARBY_MANDIS[0]) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${mandi.lat},${mandi.lng}`;
    window.open(url, '_blank');
    onToast(`Opening directions to ${language === 'hi' ? mandi.nameHi : mandi.name}`);
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MapPin className="text-primary" /> {t('map.title')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('map.subtitle')}</p>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden border border-border shadow-card mb-6">
        {isLoading ? (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              {t('common.loading')}
            </div>
          </div>
        ) : userLocation ? (
          <iframe
            src={`https://maps.google.com/maps?q=mandi+near+${userLocation.lat},${userLocation.lng}&z=12&output=embed`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mandi Finder Map"
          />
        ) : (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <span className="text-muted-foreground">Map unavailable</span>
          </div>
        )}
      </div>

      {/* Nearby Mandis List */}
      <h3 className="font-bold text-lg text-foreground mb-4">
        {t('map.nearbyMandis')}
      </h3>
      
      <div className="space-y-3">
        {NEARBY_MANDIS.map((mandi) => (
          <AgriCard key={mandi.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-foreground">
                    {language === 'hi' ? mandi.nameHi : mandi.name}
                  </h4>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {mandi.distance}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {language === 'hi' ? mandi.addressHi : mandi.address}
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {mandi.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {mandi.timings}
                  </span>
                </div>
              </div>
              <button
                onClick={() => openInMaps(mandi)}
                className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Navigation size={14} />
                {language === 'hi' ? 'दिशा' : 'Directions'}
              </button>
            </div>
          </AgriCard>
        ))}
      </div>
    </div>
  );
};

export default MandiFinder;
