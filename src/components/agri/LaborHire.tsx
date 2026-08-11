import React, { useState, useEffect } from "react";
import { Briefcase, MapPin, Phone, ExternalLink, UserPlus } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { LABORERS } from "@/lib/mock-data";
import { LaborHireForm } from "./FormValidation";
import { supabase } from "@/integrations/supabase/client";

interface LaborHireProps {
  onToast: (message: string) => void;
}

const LaborHire: React.FC<LaborHireProps> = ({ onToast }) => {
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [laborersList, setLaborersList] = useState(LABORERS);
  const [usingSample, setUsingSample] = useState(true);

  useEffect(() => {
    const fetchLaborers = async () => {
      const { data, error } = await supabase.from('laborers').select('*').returns<typeof LABORERS>();
      if (data && !error && data.length > 0) {
        setLaborersList(data);
        setUsingSample(false);
      }
    };
    fetchLaborers();
  }, []);

  const handleContactLabor = (labor: typeof LABORERS[0]) => {
    onToast(`Contacting ${labor.name}...`);
    window.open('https://nrega.nic.in/', '_blank', 'noopener,noreferrer');
  };

  const handleViewPortal = () => {
    window.open('https://nrega.nic.in/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="pb-24 pt-4 px-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Briefcase className="text-primary" /> Khet Mazdoor
        </h2>
        <p className="text-muted-foreground text-sm">
          Hire skilled labor for your farm
        </p>
      </div>

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

      {usingSample && (
        <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 px-3.5 py-2.5 text-[12px] font-semibold text-amber-800 dark:text-amber-300">
          Sample listings — real labor teams appear here once they are added.
        </div>
      )}

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
                <p className="text-muted-foreground text-xs">Skill</p>
                <p className="font-semibold text-foreground">{labor.skill}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs">Daily Rate</p>
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
