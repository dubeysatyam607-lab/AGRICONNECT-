import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export const EmailOtpVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp } = useAuth();
  const email = (location.state as any)?.email || '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast({ title: 'Error', description: 'Please enter OTP', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await verifyOtp(email, otp);
    setLoading(false);
    if (error) {
      toast({ title: 'Verification failed', description: error.message || 'Invalid OTP', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Your account is verified', variant: 'default' });
      navigate('/');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Verify Email OTP</h2>
      <p className="mb-2 text-center">Enter the 6‑digit code sent to <strong>{email}</strong></p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="otp" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </Button>
      </form>
    </div>
  );
};
