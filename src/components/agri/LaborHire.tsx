import React, { useState, useEffect } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { Briefcase, MapPin, Phone, ExternalLink, UserPlus } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { StatusBadge } from "@/components/ui/status-badge";

import { LaborHireForm } from "./FormValidation";
import { LaborAssetForm } from "./AssetForms";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface LaborHireProps {
  onToast: (message: string) => void;
}

interface Laborer {
  id: string;
  name: string;
  location: string;
  skill: string;
  rate: string | number;
  count: number;
  status: string;
  phone?: string;
}

const LaborHire: React.FC<LaborHireProps> = ({ onToast }) => {
  const { t } = useLanguage();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [laborersList, setLaborersList] = useState<Laborer[]>([]);

  const fetchLaborers = async () => {
    try {
      const { data, error } = await supabase.from('laborers').select('*').order('created_at', { ascending: false });
      if (data && !error && data.length > 0) {
        setLaborersList(data.map((d: any) => ({
          id: String(d.id),
          name: d.name || "",
          location: d.location || "",
          skill: d.skill || "",
          rate: d.rate || 0,
          count: d.count || 0,
          status: d.status || "Available",
          phone: "9829012345" // Dummy placeholder as DB lacks phone
        })));
      }
    } catch {
      setLaborersList([]);
    }
  };

  useEffect(() => {
    fetchLaborers();
  }, []);

  const handleContactLabor = (labor: Laborer) => {
    if (labor.phone) {
      window.open(`tel:${labor.phone}`, '_self');
      onToast(`Calling ${labor.name} (${labor.phone})...`);
    } else {
      onToast(`Connecting with ${labor.name}...`);
      window.open('https://nrega.nic.in/', '_blank', 'noopener,noreferrer');
    }
  };

  const handleViewPortal = () => {
    window.open('https://nrega.nic.in/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="pb-24 pt-4 px-4">
      <div className="mb-4 flex justify-between items-center gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="text-primary" /> Khet Mazdoor (खेत मजदूर)
          </h2>
          <p className="text-muted-foreground text-sm">
            Hire skilled agricultural labor or list yourself for work
          </p>
        </div>
        <AgriButton
          onClick={() => setShowRegisterDialog(true)}
          size="sm"
          className="bg-primary text-primary-foreground font-bold shadow-md hover:scale-105 transition-transform"
        >
          <UserPlus size={16} /> + मजदूर पंजीकरण (List Myself)
        </AgriButton>
      </div>

      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>List Yourself as Farm Labour (मजदूर पंजीकरण)</DialogTitle>
          </DialogHeader>
          <LaborAssetForm
            onSuccess={() => {
              setShowRegisterDialog(false);
              fetchLaborers();
              onToast("मजदूर प्रोफाइल सफलतापूर्वक रजिस्टर हो गई!");
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Request Labor Button */}
      <AgriButton
        onClick={() => setShowBookingForm(!showBookingForm)}
        className="w-full mb-4"
        variant={showBookingForm ? "outline" : "primary"}
      >
        <UserPlus size={18} />
        {showBookingForm ? "Hide Request Form" : "Request Laborers"}
      </AgriButton>

      {/* Labor Hire Form with Validation */}
      {showBookingForm && (
        <AgriCard className="mb-4 border-2 border-primary/30">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="text-primary" size={18} />
            Request Farm Laborers
          </h3>
          <LaborHireForm onSuccess={() => setShowBookingForm(false)} />
        </AgriCard>
      )}

      {/* Official Portal Link */}
      <div className="bg-primary/10 p-4 rounded-xl mb-4 border border-primary/20">
        <p className="text-sm text-foreground mb-2">
          For verified laborers, visit the official MGNREGA portal
        </p>
        <AgriButton size="sm" onClick={handleViewPortal}>
          <ExternalLink size={14} /> MGNREGA Portal
        </AgriButton>
      </div>

      <div className="space-y-4">
        {laborersList.map((labor) => (
          <AgriCard key={labor.id} className="flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className="w-12 h-12 bg-feature-labor/15 rounded-xl flex items-center justify-center text-feature-labor font-bold">
                  {labor.count}x
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{labor.name}</h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={10} /> {labor.location}
                  </p>
                </div>
              </div>
              <StatusBadge status={labor.status} />
            </div>

            <div className="bg-muted p-3 rounded-xl flex justify-between items-center text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{t('agr106')}</p>
                <p className="font-semibold text-foreground">{labor.skill}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs">{t('agr107')}</p>
                <p className="font-bold text-primary">
                  ₹{labor.rate}
                  <span className="text-xs font-normal text-muted-foreground">
                    /person
                  </span>
                </p>
              </div>
            </div>

            <AgriButton
              onClick={() => handleContactLabor(labor)}
              disabled={labor.status !== "Available"}
              className="w-full"
            >
              <Phone size={16} /> Contact Now
            </AgriButton>
          </AgriCard>
        ))}
      </div>
    </div>
  );
};

export default LaborHire;
