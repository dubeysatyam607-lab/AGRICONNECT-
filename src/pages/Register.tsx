import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
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
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.fullName, form.phone);
    setLoading(false);
    if (error) {
      toast({ title: 'Registration failed', description: error.message || 'Please try again', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'OTP sent to your email. Please verify.', variant: 'default' });
      navigate('/verify-email', { state: { email: form.email } });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Create Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="fullName" placeholder="Full Name" value={form.fullName} onChange={handleChange} required />
        <Input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <Input name="phone" placeholder="Mobile Number" value={form.phone} onChange={handleChange} required />
        <Input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <Input name="confirmPassword" type="password" placeholder="Confirm Password" value={form.confirmPassword} onChange={handleChange} required />
        <Input name="location" placeholder="Location" value={form.location} onChange={handleChange} />
        <Input name="language" placeholder="Preferred Language" value={form.language} onChange={handleChange} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating...' : 'Register'}
        </Button>
      </form>
    </div>
  );
};
