import React from "react";
import { Tractor, Search } from "lucide-react";

const TractorList: React.FC = () => {
  return (
    <div className="pb-24 pt-4 px-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Tractor className="text-primary" /> Tractor Listings
        </h2>
        <p className="text-muted-foreground text-sm">
          Find the perfect tractor for your farm
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Search size={28} className="text-muted-foreground" />
        </div>
        <h3 className="font-bold text-foreground mb-1">No listings yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Tractor and equipment listings will appear here once owners add them in your area.
        </p>
      </div>
    </div>
  );
};

export default TractorList;
