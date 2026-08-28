import React, { useState } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { CreditCard, Calculator, ExternalLink, ImageOff } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";

import { SafeImage } from "@/components/ui/SafeImage";

interface LoanScheme {
  id: number;
  title: string;
  eligibility: string;
  applyUrl: string;
  imageUrl: string;
}

const LOAN_SCHEMES: LoanScheme[] = [
  { 
    id: 1, 
    title: 'PM Kisan Samman Nidhi', 
    eligibility: 'Small/Marginal Farmers',
    applyUrl: 'https://pmkisan.gov.in/',
    imageUrl: 'https://images.unsplash.com/photo-1594488500669-e3bb970ef1f7?auto=format&fit=crop&w=900&q=80'
  },
  { 
    id: 2, 
    title: 'Kisan Credit Card (KCC)', 
    eligibility: 'All Farmers',
    applyUrl: 'https://pmkisan.gov.in/RegistrationFormKCC.aspx',
    imageUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=900&q=80'
  },
  { 
    id: 3, 
    title: 'Agriculture Infrastructure Fund', 
    eligibility: 'All Farmers',
    applyUrl: 'https://agriinfra.dac.gov.in/',
    imageUrl: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=900&q=80'
  },
  { 
    id: 4, 
    title: 'PM-KISAN Credit Linked Subsidy', 
    eligibility: 'Registered Farmers',
    applyUrl: 'https://www.nabard.org/',
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80'
  },
];

const LoanSchemeCard = ({ scheme }: { scheme: LoanScheme }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card hover:shadow-soft transition-shadow overflow-hidden flex">
      <div className="w-24 h-full min-h-[100px] relative bg-muted shrink-0">
        <SafeImage 
          src={scheme.imageUrl} 
          alt={scheme.title}
          entityName={scheme.title}
          resolveType="scheme"
          category="schemes"
          className="w-full h-full object-cover absolute inset-0"
        />
      </div>
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div>
          <p className="font-bold text-sm text-foreground leading-tight mb-1">{scheme.title}</p>
          <p className="text-xs text-muted-foreground mb-2">{scheme.eligibility}</p>
        </div>
        <div className="flex justify-end">
          <AgriButton 
            size="sm" 
            variant="outline"
            className="h-8 text-xs py-0 px-3"
            onClick={() => window.open(scheme.applyUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={12} className="mr-1" /> Apply
          </AgriButton>
        </div>
      </div>
    </div>
  );
};

const LoanCalculator: React.FC = () => {
  const { t } = useLanguage();
  const [loanAmount, setLoanAmount] = useState(100000);
  const [loanTenure, setLoanTenure] = useState(12);

  const interestRate = 7;
  const monthlyInterest = interestRate / 12 / 100;
  const emi =
    (loanAmount * monthlyInterest * Math.pow(1 + monthlyInterest, loanTenure)) /
    (Math.pow(1 + monthlyInterest, loanTenure) - 1);

  return (
    <div className="pb-24 pt-4 px-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="text-primary" /> Kisan Loans
        </h2>
        <p className="text-muted-foreground text-sm">
          KCC & Agri-Loan Calculator
        </p>
      </div>

      <AgriCard className="mb-6">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Calculator size={18} className="text-primary" /> EMI Calculator
        </h3>

        <div className="space-y-5 mb-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">{t('agr108')}</span>
              <span className="font-bold text-foreground">
                ₹{loanAmount.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              aria-label="Loan Amount"
              min="10000"
              max="500000"
              step="5000"
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">{t('agr109')}</span>
              <span className="font-bold text-foreground">
                {loanTenure} Months
              </span>
            </div>
            <input
              type="range"
              aria-label="Loan Tenure (Months)"
              min="6"
              max="60"
              step="6"
              value={loanTenure}
              onChange={(e) => setLoanTenure(Number(e.target.value))}
              className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        <div className="bg-accent p-4 rounded-xl text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Estimated Monthly EMI
          </p>
          <p className="text-3xl font-bold text-primary mt-1">
            ₹{Math.round(emi).toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            @ 7% Interest p.a.
          </p>
        </div>
      </AgriCard>

      <h3 className="font-bold text-foreground mb-3">{t('agr110')}</h3>
      <div className="space-y-3">
        {LOAN_SCHEMES.map((s) => (
          <LoanSchemeCard key={s.id} scheme={s} />
        ))}
      </div>
    </div>
  );
};

export default LoanCalculator;