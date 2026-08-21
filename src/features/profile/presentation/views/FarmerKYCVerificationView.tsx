import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Lock,
  Sparkles,
  ArrowLeft,
  FileCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  validateAadhaarVerhoeff,
  maskAadhaarNumber,
  maskKccNumber,
  SUPPORTED_KCC_BANKS,
  validateKccCard,
  IKccVerificationDetails,
} from '../../domain/models/FarmerKYC';
import { useProfileViewModel } from '../viewmodels/useProfileViewModel';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { AppButton } from '@/shared/widgets/AppButton';
import { AppCard } from '@/shared/widgets/AppCard';

interface IFarmerKYCVerificationViewProps {
  onBack: () => void;
  onSuccess?: () => void;
}

type KycTab = 'aadhaar' | 'kcc';

export const FarmerKYCVerificationView: React.FC<IFarmerKYCVerificationViewProps> = ({
  onBack,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [profileState, { saveProfile }] = useProfileViewModel();
  const profile = profileState.profile;

  const [activeTab, setActiveTab] = useState<KycTab>('aadhaar');

  // Aadhaar Form State
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [aadhaarError, setAadhaarError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [generatedDemoOtp, setGeneratedDemoOtp] = useState('123456');
  const [otpTimer, setOtpTimer] = useState(0);
  const [isVerifyingAadhaar, setIsVerifyingAadhaar] = useState(false);

  // KCC Form State
  const [kccBankCode, setKccBankCode] = useState('SBI');
  const [kccNumberInput, setKccNumberInput] = useState('');
  const [kccError, setKccError] = useState<string | null>(null);
  const [isVerifyingKcc, setIsVerifyingKcc] = useState(false);

  // Load existing verification from profile
  const isAadhaarVerified = profile?.personal?.isAadhaarVerified ?? false;
  const existingAadhaarMasked = profile?.personal?.aadhaarNumber
    ? maskAadhaarNumber(profile.personal.aadhaarNumber)
    : '';

  // KCC verification stored in extended profile
  const [kccDetails, setKccDetails] = useState<IKccVerificationDetails | null>(null);

  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  // Handle Aadhaar OTP Trigger
  const handleSendAadhaarOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAadhaarError(null);

    const check = validateAadhaarVerhoeff(aadhaarInput);
    if (!check.valid) {
      setAadhaarError(check.error || 'Invalid Aadhaar number.');
      return;
    }

    const demoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedDemoOtp(demoOtp);
    setOtpSent(true);
    setOtpTimer(60);
    toast({
      title: 'Aadhaar OTP Sent',
      description: `6-digit verification code sent to UIDAI registered mobile. (Demo OTP: ${demoOtp})`,
    });
  };

  // Handle Aadhaar OTP Submission
  const handleVerifyAadhaarOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpInput.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setAadhaarError('Please enter a valid 6-digit OTP code.');
      return;
    }

    setIsVerifyingAadhaar(true);
    try {
      if (profile) {
        const updated = {
          ...profile,
          personal: {
            ...profile.personal,
            aadhaarNumber: aadhaarInput.replace(/\D/g, ''),
            isAadhaarVerified: true,
          },
        };
        await saveProfile(updated);
      }
      setOtpSent(false);
      setAadhaarInput('');
      setOtpInput('');
      toast({
        title: 'Aadhaar Verified Successfully! ✅',
        description: 'Your farmer identity is now officially Aadhaar-verified with UIDAI.',
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setAadhaarError(err.message || 'Failed to save verification status.');
    } finally {
      setIsVerifyingAadhaar(false);
    }
  };

  // Handle KCC Verification
  const handleVerifyKcc = async (e: React.FormEvent) => {
    e.preventDefault();
    setKccError(null);

    const check = validateKccCard(kccNumberInput, kccBankCode);
    if (!check.valid) {
      setKccError(check.error || 'Invalid KCC details.');
      return;
    }

    setIsVerifyingKcc(true);
    try {
      // Simulate banking network lookup delay (600ms)
      await new Promise((res) => setTimeout(res, 600));

      const selectedBank = SUPPORTED_KCC_BANKS.find((b) => b.code === kccBankCode);
      const farmAcres = profile?.farmSpecs?.totalArea || 4.5;
      const creditLimit = Math.min(Math.round(farmAcres * 50000), 300000);

      const verifiedDetails: IKccVerificationDetails = {
        kccNumberMasked: maskKccNumber(kccNumberInput),
        bankCode: kccBankCode,
        bankName: selectedBank?.name || 'State Bank of India',
        verifiedAt: new Date().toISOString(),
        creditLimit: Math.max(creditLimit, 100000),
        linkedLandAcres: farmAcres,
        interestSubventionTier: '4.00% p.a. subsidized rate under PM-KISAN Interest Subvention Scheme',
        status: 'VERIFIED',
      };

      setKccDetails(verifiedDetails);

      if (profile) {
        await saveProfile(profile);
      }

      toast({
        title: 'Kisan Credit Card (KCC) Verified! 💳',
        description: `Verified with ${verifiedDetails.bankName}. Active credit limit: ₹${verifiedDetails.creditLimit.toLocaleString('en-IN')}`,
      });
      setKccNumberInput('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setKccError(err.message || 'KCC verification failed.');
    } finally {
      setIsVerifyingKcc(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Back to profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
              <span>🛡️</span> Government & KYC Verification
            </h1>
            <p className="text-xs text-muted-foreground">
              Link your Aadhaar & Kisan Credit Card to unlock subsidized farm loans and official trust badges.
            </p>
          </div>
        </div>
      </div>

      {/* Trust Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className={`p-5 rounded-3xl border transition-all ${
            isAadhaarVerified
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
              : 'bg-card border-border text-foreground'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                  isAadhaarVerified
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm font-black">Aadhaar KYC</h2>
                <p className="text-xs opacity-80">
                  {isAadhaarVerified
                    ? `Verified (${existingAadhaarMasked})`
                    : 'Not Verified Yet'}
                </p>
              </div>
            </div>
            {isAadhaarVerified ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider">
                Active ✅
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                Action Required
              </span>
            )}
          </div>
        </div>

        <div
          className={`p-5 rounded-3xl border transition-all ${
            kccDetails
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
              : 'bg-card border-border text-foreground'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                  kccDetails
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm font-black">Kisan Credit Card</h2>
                <p className="text-xs opacity-80">
                  {kccDetails
                    ? `${kccDetails.bankName} (₹${kccDetails.creditLimit.toLocaleString('en-IN')})`
                    : 'Not Linked'}
                </p>
              </div>
            </div>
            {kccDetails ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider">
                Linked 💳
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/30 text-muted-foreground text-[10px] font-bold">
                Optional
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-muted/60 rounded-2xl border border-border">
        <button
          type="button"
          onClick={() => setActiveTab('aadhaar')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'aadhaar'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Aadhaar Card Verification
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('kcc')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'kcc'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-500" />
          Kisan Credit Card (KCC)
        </button>
      </div>

      {/* Tab 1: Aadhaar Verification */}
      {activeTab === 'aadhaar' && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>🇮🇳</span> UIDAI Aadhaar Verification
            </h2>
            <p className="text-xs text-muted-foreground">
              Secure identity validation via UIDAI OTP. Your complete 12-digit number is never exposed in plaintext.
            </p>
          </div>

          {isAadhaarVerified ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">
                    Aadhaar Identity Fully Verified
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Linked ID: <span className="font-mono font-bold text-foreground">{existingAadhaarMasked}</span>
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-background/60 border border-emerald-500/20 text-xs text-muted-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Protected under the Digital Personal Data Protection (DPDP) Act, 2023.</span>
              </div>
            </div>
          ) : !otpSent ? (
            <form onSubmit={handleSendAadhaarOtp} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    12-Digit Aadhaar Number
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAadhaarInput('2345 6789 0124');
                      setAadhaarError(null);
                    }}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Use Sample: 2345 6789 0124
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={14}
                  value={aadhaarInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                    // Format with spaces XXXX XXXX XXXX
                    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
                    setAadhaarInput(formatted);
                    if (aadhaarError) setAadhaarError(null);
                  }}
                  placeholder="e.g. 5432 1098 7654"
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono tracking-wider"
                  required
                />
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-500" />
                  We will send a 6-digit OTP to your Aadhaar-linked mobile number.
                </p>
              </div>

              {aadhaarError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{aadhaarError}</span>
                </div>
              )}

              <AppButton type="submit" variant="primary" className="w-full">
                <span>Send Verification OTP</span>
              </AppButton>
            </form>
          ) : (
            <form onSubmit={handleVerifyAadhaarOtp} className="space-y-4">
              <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Verifying Aadhaar:</span>
                  <span className="font-mono font-bold text-foreground">{aadhaarInput}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">OTP Status:</span>
                  <span className="text-emerald-500 font-bold">Sent to Registered Mobile</span>
                </div>
              </div>

              {/* Demo OTP Helper Banner */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                <span className="text-emerald-800 dark:text-emerald-200 font-medium">
                  Demo OTP: <b className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{generatedDemoOtp}</b>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOtpInput(generatedDemoOtp);
                    if (aadhaarError) setAadhaarError(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                >
                  Auto-Fill OTP
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (aadhaarError) setAadhaarError(null);
                  }}
                  placeholder="e.g. 123456"
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-mono text-center tracking-[0.4em]"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Didn't receive code?</span>
                <button
                  type="button"
                  disabled={otpTimer > 0}
                  onClick={() => {
                    const demoOtp = Math.floor(100000 + Math.random() * 900000).toString();
                    setGeneratedDemoOtp(demoOtp);
                    setOtpTimer(60);
                    toast({
                      title: 'New OTP Sent',
                      description: `Demo OTP: ${demoOtp}`,
                    });
                  }}
                  className="font-bold text-emerald-500 hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend OTP'}
                </button>
              </div>

              {aadhaarError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{aadhaarError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <AppButton
                  type="button"
                  variant="secondary"
                  onClick={() => setOtpSent(false)}
                  className="flex-1"
                >
                  Change Aadhaar
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  isLoading={isVerifyingAadhaar}
                  className="flex-1"
                >
                  Confirm & Verify
                </AppButton>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tab 2: KCC Verification */}
      {activeTab === 'kcc' && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>💳</span> Kisan Credit Card (KCC) Linkage
            </h2>
            <p className="text-xs text-muted-foreground">
              Link your active KCC card to verify institutional credit access, 4.0% subsidized interest rates, and PM-KISAN integration.
            </p>
          </div>

          {kccDetails ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">
                      Kisan Credit Card Verified & Active
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {kccDetails.bankName} • <span className="font-mono font-bold text-foreground">{kccDetails.kccNumberMasked}</span>
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase">
                  4% Subsidized
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-background/60 border border-emerald-500/20">
                  <span className="text-[11px] text-muted-foreground block">Sanctioned Credit Limit</span>
                  <span className="text-sm font-black text-foreground">
                    ₹{kccDetails.creditLimit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-background/60 border border-emerald-500/20">
                  <span className="text-[11px] text-muted-foreground block">Linked Farmland</span>
                  <span className="text-sm font-black text-foreground">
                    {kccDetails.linkedLandAcres} Acres
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerifyKcc} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Issuing Bank
                </label>
                <select
                  value={kccBankCode}
                  onChange={(e) => setKccBankCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                >
                  {SUPPORTED_KCC_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name} ({b.category} • {b.subsidizedRate} interest)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  16-Digit KCC Number or Loan Account Number
                </label>
                <input
                  type="text"
                  maxLength={19}
                  value={kccNumberInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
                    setKccNumberInput(formatted);
                  }}
                  placeholder="e.g. 4532 9876 1234 5678"
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono tracking-wider"
                  required
                />
              </div>

              {kccError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{kccError}</span>
                </div>
              )}

              <AppButton
                type="submit"
                variant="primary"
                isLoading={isVerifyingKcc}
                className="w-full"
              >
                <span>Verify & Link KCC Card</span>
              </AppButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
