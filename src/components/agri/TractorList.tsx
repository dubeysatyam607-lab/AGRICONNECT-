import React from "react";
import { Tractor } from "lucide-react";
import TractorCard from "./TractorCard";
import { INITIAL_TRACTORS } from "@/lib/mock-data";
import type { Tractor as TractorType } from "@/lib/mock-data";

interface TractorListProps {
  onBook: (tractor: TractorType) => void;
}

const TractorList: React.FC<TractorListProps> = ({ onBook }) => {
  return (
    <div className="pb-24 pt-4 px-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Tractor className="text-primary" /> All Tractors
        </h2>
        <p className="text-muted-foreground text-sm">
          Find the perfect tractor for your farm
        </p>
      </div>

      <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 px-3.5 py-2.5 text-[12px] font-semibold text-amber-800 dark:text-amber-300">
        Sample listings — real tractors appear here once owners add them.
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-4">
        {["All", "Rotavator", "Cultivator", "Plough", "Seeder", "Harvester"].map(
          (item, idx) => (
            <button
              key={item}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                idx === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {item}
            </button>
          )
        )}
      </div>

      <div className="space-y-4">
        {INITIAL_TRACTORS.map((tractor) => (
          <TractorCard key={tractor.id} tractor={tractor} onBook={onBook} />
        ))}
      </div>
    </div>
  );
};

export default TractorList;
