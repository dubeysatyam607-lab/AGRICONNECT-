import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { SeoHead } from '@/components/seo/SeoHead';
import { Logo } from '@/components/ui/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { User, Mail, Phone, Lock, MapPin, Globe, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { language } = useLanguage();
  const hi = language === 'hi';
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    location: '',
    language: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: 'Error', description: hi ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.fullName, form.phone);
    setLoading(false);
    if (error) {
      toast({ title: hi ? 'पंजीकरण विफल' : 'Registration failed', description: error.message || (hi ? 'कृपया पुनः प्रयास करें' : 'Please try again'), variant: 'destructive' });
    } else {
      toast({ title: hi ? 'सफल' : 'Success', description: hi ? 'आपके ईमेल पर OTP भेजा गया है। कृपया सत्यापित करें।' : 'OTP sent to your email. Please verify.', variant: 'default' });
      navigate('/verify-email', { state: { email: form.email } });
    }
  };

  const fields = [
    { name: 'fullName', type: 'text', placeholder: hi ? 'पूरा नाम' : 'Full Name', icon: User, required: true },
    { name: 'email', type: 'email', placeholder: hi ? 'ईमेल' : 'Email', icon: Mail, required: true },
    { name: 'phone', type: 'tel', placeholder: hi ? 'मोबाइल नंबर' : 'Mobile Number', icon: Phone, required: true },
    { name: 'password', type: 'password', placeholder: hi ? 'पासवर्ड' : 'Password', icon: Lock, required: true },
    { name: 'confirmPassword', type: 'password', placeholder: hi ? 'पासवर्ड की पुष्टि' : 'Confirm Password', icon: Lock, required: true },
    { name: 'location', type: 'text', placeholder: hi ? 'स्थान (वैकल्पिक)' : 'Location (optional)', icon: MapPin, required: false },
    { name: 'language', type: 'text', placeholder: hi ? 'पसंदीदा भाषा (वैकल्पिक)' : 'Preferred Language (optional)', icon: Globe, required: false },
  ] as const;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-12">
      <SeoHead title="Sign Up — AgriConnect" description="Create your AgriConnect account to access AI farming tools, live mandi prices, and crop disease detection." noindex />

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo variant="full" className="h-10" />
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-xl shadow-card p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="font-display font-bold text-2xl tracking-tight text-foreground">
              {hi ? 'खाता बनाएँ' : 'Create Account'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {hi ? 'कृषि तकनीक से जुड़ें' : 'Join the farming revolution'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {fields.map((f) => (
              <div key={f.name} className="relative">
                <f.icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name={f.name}
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(form as Record<string, string>)[f.name]}
                  onChange={handleChange}
                  required={f.required}
                  autoComplete={f.name === 'confirmPassword' ? 'new-password' : f.name}
                  className={cn(
                    "pl-10 h-12 rounded-xl bg-background/60 border-border/60 text-sm font-medium",
                    "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40",
                    "transition-all duration-200"
                  )}
                />
              </div>
            ))}

            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full h-12 rounded-xl font-bold text-sm gap-2",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "active:scale-[0.98] transition-all duration-200",
                "shadow-md shadow-primary/20"
              )}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {hi ? 'पंजीकरण करें' : 'Register'}
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-muted-foreground">
            {hi ? 'पहले से खाता है?' : 'Already have an account?'}{' '}
            <button
              onClick={() => navigate('/auth')}
              className="font-bold text-primary hover:text-primary/80 transition-colors"
            >
              {hi ? 'लॉग इन करें' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
