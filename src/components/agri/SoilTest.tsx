import React from "react";
import { SoilTestingHub } from "@/features/soil-testing/presentation/SoilTestingHub";

interface SoilTestProps {
  onToast?: (message: string) => void;
}

const SoilTest: React.FC<SoilTestProps> = ({ onToast }) => {
  return <SoilTestingHub onToast={onToast} />;
};

export default SoilTest;

