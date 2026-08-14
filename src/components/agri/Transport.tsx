import React, { useState, useEffect } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { Truck, MapPin, ExternalLink, Phone, ClipboardList, BadgeCheck } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AgriImage } from "@/components/ui/agri-image";
import { TransportBookingForm } from "./FormValidation";
import { supabase } from "@/integrations/supabase/client";

interface TransportVehicle {
  id: number;
  type: string;
  capacity: string;
  rate: string;
  location: string;
  status: 'Available' | 'Busy';
  image: string;
}



interface TransportProps {
  onToast: (message: string) => void;
}

const Transport: React.FC<TransportProps> = ({ onToast }) => {
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([]);

  useEffect(() => {
    const fetchVehicles = async () => {
      const { data, error } = await supabase.from('transport_vehicles').select('*').returns<TransportVehicle[]>();
      if (data && !error && data.length > 0) {
        setVehicles(data);

      }
    };
    fetchVehicles();
  }, []);

  const handleBookVehicle = (vehicle: TransportVehicle) => {
    if (vehicle.status !== "Available") {
      onToast("Vehicle not available");
      return;
    }
    onToast(`Booking ${vehicle.type}...`);
    window.open('https://kisanrath.gov.in/', '_blank', 'noopener,noreferrer');
  };

  const handleViewPortal = () => {
    window.open('https://kisanrath.gov.in/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="pb-24 pt-4 px-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Truck className="text-primary" /> Mandi Logistics
        </h2>
        <p className="text-muted-foreground text-sm">
          Book vehicles to transport your produce
        </p>
      </div>

      {/* Book Transport Button */}
      <AgriButton
        onClick={() => setShowBookingForm(!showBookingForm)}
        className="w-full mb-4"
        variant={showBookingForm ? "outline" : "primary"}
      >
        <ClipboardList size={18} />
        {showBookingForm ? "Hide Booking Form" : "Book Transport"}
      </AgriButton>

      {/* Transport Booking Form with Validation */}
      {showBookingForm && (
        <AgriCard className="mb-4 border-2 border-primary/30">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <ClipboardList className="text-primary" size={18} />
            Book Transport to Mandi
          </h3>
          <TransportBookingForm onSuccess={() => setShowBookingForm(false)} />
        </AgriCard>
      )}

      {/* Official Portal Link */}
      <div className="bg-primary/10 p-4 rounded-xl mb-4 border border-primary/20">
        <p className="text-sm text-foreground mb-2">
          For verified transport services, use Kisan Rath App
        </p>
        <div className="flex gap-2">
          <AgriButton size="sm" onClick={handleViewPortal}>
            <ExternalLink size={14} /> Kisan Rath Portal
          </AgriButton>
          <AgriButton size="sm" variant="outline" onClick={() => window.open('tel:14488')}>
            <Phone size={14} /> Helpline 14488
          </AgriButton>
        </div>
      </div>



      <div className="space-y-4">
        {vehicles.map((vehicle) => (
          <AgriCard key={vehicle.id} className="overflow-hidden p-0">
            <div className="flex">
              <div className="w-24 h-24 flex-shrink-0 bg-muted">
                <AgriImage
                  src={vehicle.image}
                  alt={vehicle.type}
                  assetName={vehicle.type}
                  className="w-full h-full object-cover"
                  fallbackType="vehicle"
                />
              </div>
              <div className="flex-1 p-3">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-1">
                    {vehicle.type} <BadgeCheck size={14} className="text-primary" />
                  </h4>
                  <StatusBadge status={vehicle.status} />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin size={10} /> {vehicle.location} away
                </p>
                <div className="flex justify-between items-center">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Capacity: </span>
                    <span className="font-medium text-foreground">{vehicle.capacity}</span>
                  </div>
                  <span className="font-bold text-primary text-sm">{vehicle.rate}/trip</span>
                </div>
              </div>
            </div>
            <div className="p-3 pt-0">
              <AgriButton
                onClick={() => handleBookVehicle(vehicle)}
                disabled={vehicle.status !== "Available"}
                className="w-full"
                size="sm"
              >
                {vehicle.status === "Available" ? (
                  <>
                    <Truck size={14} /> Book Vehicle
                  </>
                ) : (
                  "Currently Busy"
                )}
              </AgriButton>
            </div>
          </AgriCard>
        ))}
      </div>
    </div>
  );
};

export default Transport;
