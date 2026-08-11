import React from "react";
import { ClipboardCheck, Info } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";

interface SoilTestProps {
  onToast: (message: string) => void;
}

const SoilTest: React.FC<SoilTestProps> = ({ onToast }) => {
  return (
    <div className="pb-24 pt-4 px-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ClipboardCheck className="text-primary" /> Mitti Jaanch
        </h2>
        <p className="text-muted-foreground text-sm">
          Book Lab Test for Soil Health Card
        </p>
      </div>

      <AgriCard className="mb-6">
        <h3 className="font-bold text-foreground mb-4">New Test Request</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Farm Location
            </label>
            <input
              type="text"
              value="Rampura, Plot 4"
              className="w-full p-2.5 border border-border rounded-lg text-sm bg-muted text-foreground"
              readOnly
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Sample Type
            </label>
            <select className="w-full p-2.5 border border-border rounded-lg text-sm bg-card text-foreground">
              <option>Standard Soil Test</option>
              <option>Micro-nutrient Test</option>
              <option>Water Test</option>
            </select>
          </div>
          <AgriButton
            onClick={() => onToast("Lab Technician Scheduled!")}
            className="w-full mt-2"
          >
            Request Pickup (₹150)
          </AgriButton>
        </div>
      </AgriCard>

      <div className="bg-feature-community/10 p-4 rounded-xl flex items-start gap-3 border border-feature-community/20">
        <Info className="text-feature-community shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-bold text-feature-community text-sm">
            Sampling Guide
          </h4>
          <p className="text-xs text-foreground mt-1">
            Take soil from 5 different spots in a zig-zag pattern at 6-inch
            depth for best results.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SoilTest;
