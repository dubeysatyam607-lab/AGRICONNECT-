import React, { useEffect, useState } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { CreditCard, Calculator, ExternalLink, ShieldCheck, Loader2 } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { SafeImage } from "@/components/ui/SafeImage";
import { calculateEmi, validateEmiInput } from "@/lib/loan-calculator";
import { getAgriContent, formatVerifiedLabel, AgriLoan } from "@/lib/agri-info";

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
    imageUrl: 'https://images.pexels.com/photos/36678256/pexels-photo-36678256.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940'
  },
  {
    id: 2,
    title: 'Kisan Credit Card (KCC)',
    eligibility: 'All Farmers',
    applyUrl: 'https://pmkisan.gov.in/RegistrationFormKCC.aspx',
    imageUrl: 'https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940'
  },
  {
    id: 3,
    title: 'Agriculture Infrastructure Fund',
    eligibility: 'All Farmers',
    applyUrl: 'https://agriinfra.dac.gov.in/',
    imageUrl: 'https://images.pexels.com/photos/30248663/pexels-photo-30248663.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940'
  },
  {
    id: 4,
    title: 'PM-KISAN Credit Linked Subsidy',
    eligibility: 'Registered Farmers',
    applyUrl: 'https://www.nabard.org/',
    imageUrl: 'https://images.pexels.com/photos/20212135/pexels-photo-20212135.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940'
  },
];

const LoanSchemeCard = ({ scheme }: { scheme: LoanScheme }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-card rounded-xl border border-border shadow-card hover:shadow-soft transition-shadow overflow-hidden flex">
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
  const { t, language } = useLanguage();
  const [loanAmount, setLoanAmount] = useState(100000);
  const [loanTenure, setLoanTenure] = useState(12);
  const [verifiedRate, setVerifiedRate] = useState<AgriLoan | null>(null);
  const [ratePct, setRatePct] = useState(7);
  const [loadingRate, setLoadingRate] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAgriContent<AgriLoan[]>("loans", { loanType: "kcc" } as never, undefined, { limit: 5 })
      .then((res) => {
        if (cancelled) return;
        const kcc = res.rows?.[0];
        if (kcc) {
          setVerifiedRate(kcc);
          // Effective rate post-subvention; falls back to the 7% scheme cap.
          if (typeof kcc.effective_rate === "number" && kcc.effective_rate > 0) {
            setRatePct(kcc.effective_rate);
          } else if (typeof kcc.interest_rate === "number" && kcc.interest_rate > 0) {
            setRatePct(kcc.interest_rate);
          }
        }
      })
      .catch(() => { /* keep 7% scheme-cap default when live layer is unavailable */ })
      .finally(() => { if (!cancelled) setLoadingRate(false); });
    return () => { cancelled = true; };
  }, []);

  const result = calculateEmi({ principal: loanAmount, annualRatePct: ratePct, tenureMonths: loanTenure });
  const validation = validateEmiInput({ principal: loanAmount, annualRatePct: ratePct, tenureMonths: loanTenure });
  const hi = language === "hi";

  return (
    <div className="pb-24 pt-4 px-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="text-primary" /> {hi ? "किसान ऋण" : "Kisan Loans"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {hi ? "KCC कैलकुलेटर एवं ऋण योजनाएँ" : "KCC & Agri-Loan Calculator"}
        </p>
      </div>

      <AgriCard className="mb-6">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Calculator size={18} className="text-primary" /> {hi ? "ईएमआई कैलकुलेटर" : "EMI Calculator"}
        </h3>

        <div className="space-y-5 mb-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">{t('agr108')}</span>
              <span className="font-bold text-foreground">₹{loanAmount.toLocaleString('en-IN')}</span>
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
              <span className="font-bold text-foreground">{loanTenure} Months</span>
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

        {loadingRate ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
            <Loader2 size={14} className="animate-spin" />
            {hi ? "सत्यापित ब्याज दर लोड हो रही है…" : "Loading verified interest rate…"}
          </div>
        ) : (
          <>
            <div className="bg-accent p-4 rounded-xl text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {hi ? "अनुमानित मासिक ईएमआई" : "Estimated Monthly EMI"}
              </p>
              <p className="text-3xl font-bold text-primary mt-1">
                {result && validation.valid ? `₹${Math.round(result.emi).toLocaleString('en-IN')}` : hi ? "जानकारी उपलब्ध नहीं" : "Not available"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                @ {ratePct}% p.a. {hi ? "(ब्याज अवधि के बाद)" : "(effective, post-subvention)"}
              </p>
            </div>

            {verifiedRate && (
              <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck size={14} className="text-primary mt-0.5 shrink-0" />
                <p>
                  {hi
                    ? `सरकारी नीति दर: ${verifiedRate.effective_rate ?? '—'}% प्रभावी (${verifiedRate.subvention ?? '—'}% ब्याज अनुदान + ${verifiedRate.prompt_payment_incentive ?? '—'}% समय पर भुगतान प्रोत्साहन)। ${formatVerifiedLabel(verifiedRate.last_verified_at, language)}। अंतिम दर बैंक के अनुसार बदलती है, अपने बैंक से पुष्टि करें।`
                    : `Govt policy rate: ${verifiedRate.effective_rate ?? '—'}% effective (${verifiedRate.subvention ?? '—'}% subvention + ${verifiedRate.prompt_payment_incentive ?? '—'}% prompt-repayment incentive). ${formatVerifiedLabel(verifiedRate.last_verified_at, language)}. Final rate varies by bank — verify with your lender.`}
                </p>
              </div>
            )}

            {!validation.valid && (
              <p className="mt-3 text-xs text-destructive">{validation.errors[0]}</p>
            )}
          </>
        )}
      </AgriCard>

      <h3 className="font-bold text-foreground mb-3">
        {hi ? "ऋण योजनाएँ और लिंक" : "Loan Schemes & Links"}
      </h3>
      <div className="space-y-3">
        {LOAN_SCHEMES.map((s) => (
          <LoanSchemeCard key={s.id} scheme={s} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        {hi
          ? "दरें सरकारी नीति/पोर्टल के सत्यापित रिकॉर्ड पर आधारित हैं। वास्तविक ब्याज दर बैंक की एमसीएलआर के अनुसार भिन्न हो सकती है।"
          : "Rates shown reflect verified government policy records. Actual applied rates depend on your bank's lending terms."}
      </p>
    </div>
  );
};

export default LoanCalculator;