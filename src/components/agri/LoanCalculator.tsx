import React, { useState } from "react";
import { CreditCard, Calculator, ExternalLink, ImageOff } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";

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
    imageUrl: 'https://images.unsplash.com/photo-1594771804886-a933bb2d609b?auto=format&fit=crop&q=80&w=400'
  },
  { 
    id: 2, 
    title: 'Kisan Credit Card (KCC)', 
    eligibility: 'All Farmers',
    applyUrl: 'https://pmkisan.gov.in/RegistrationFormKCC.aspx',
    imageUrl: 'https://images.unsplash.com/photo-1580519542036-ed47f3e42197?auto=format&fit=crop&q=80&w=400'
  },
  { 
    id: 3, 
    title: 'Agriculture Infrastructure Fund', 
    eligibility: 'All Farmers',
    applyUrl: 'https://agriinfra.dac.gov.in/',
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400'
  },
  { 
    id: 4, 
    title: 'PM-KISAN Credit Linked Subsidy', 
    eligibility: 'Registered Farmers',
    applyUrl: 'https://www.nabard.org/',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=400'
  },
];

const LoanSchemeCard = ({ scheme }: { scheme: LoanScheme }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card hover:shadow-soft transition-shadow overflow-hidden flex">
      <div className="w-24 h-full min-h-[100px] relative bg-muted shrink-0">
        {!imgError ? (
          <img 
            src={scheme.imageUrl} 
            alt={scheme.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover absolute inset-0"
          />
        ) : (
          <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
            <ImageOff size={20} />
          </div>
        )}
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
              <span className="text-muted-foreground">Loan Amount</span>
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
              <span className="text-muted-foreground">Tenure (Months)</span>
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

      <h3 className="font-bold text-foreground mb-3">Available Loan Schemes</h3>
      <div className="space-y-3">
        {LOAN_SCHEMES.map((s) => (
          <LoanSchemeCard key={s.id} scheme={s} />
        ))}
      </div>
    </div>
  );
};

export default LoanCalculator;