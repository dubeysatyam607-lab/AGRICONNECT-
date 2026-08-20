import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Phone, Clock, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AgriCard } from '@/components/ui/agri-card';

interface MandiFinder {
  onToast: (message: string) => void;
}

const MandiFinder: React.FC<MandiFinder> = ({ onToast }) => {
  const { language, t } = useLanguage();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);

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
          setLocationDenied(true);
          setIsLoading(false);
        }
      );
    } else {
      setLocationDenied(true);
      setIsLoading(false);
    }
  }, []);

  const openInMaps = (lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
    onToast(`Opening directions to ${name}`);
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
      
      {locationDenied ? (
        <AgriCard className="p-5 text-center">
          <AlertCircle size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            {language === 'hi'
              ? 'मंडी खोजने के लिए स्थान की अनुमति चाहिए।'
              : 'Location access is needed to find mandis near you.'}
          </p>
          <button
            onClick={() => {
              const q = encodeURIComponent('agricultural mandi near me');
              window.open(`https://www.google.com/maps/search/${q}`, '_blank');
            }}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Navigation size={14} />
            {language === 'hi' ? 'मंडी खोजें' : 'Search Mandis on Maps'}
          </button>
        </AgriCard>
      ) : (
        <AgriCard className="p-5 text-center">
          <MapPin size={32} className="mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            {language === 'hi'
              ? 'आपके निकट कृषि मंडी खोजने के लिए मानचित्र खोलें'
              : 'Open map to find agricultural mandis near your location'}
          </p>
          <button
            onClick={() => {
              const q = userLocation
                ? `mandi+near+${userLocation.lat},${userLocation.lng}`
                : 'agricultural+mandi+near+me';
              window.open(`https://www.google.com/maps/search/${q}`, '_blank');
            }}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Navigation size={14} />
            {language === 'hi' ? 'मंडी देखें' : 'View Mandis on Map'}
          </button>
        </AgriCard>
      )}
    </div>
  );
};

export default MandiFinder;
