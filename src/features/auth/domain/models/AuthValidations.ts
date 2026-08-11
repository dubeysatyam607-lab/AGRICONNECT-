import { z } from 'zod';

/**
 * Enterprise Validation Schemas for AgriConnect Authentication.
 * Includes Indian phone formatting, RFC email formatting, and password strength analysis.
 */

export const IndianPhoneRegex = /^(\+91|0)?[6789]\d{9}$/;
export const EmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const SignInSchema = z.object({
  identifier: z.string().min(3, 'Please enter a valid email or 10-digit mobile number.'),
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean().optional(),
});

export const SignUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  phone: z.string().regex(IndianPhoneRegex, 'Please enter a valid Indian mobile number (e.g., 9876543210).').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

export const OtpVerificationSchema = z.object({
  token: z.string().length(6, 'OTP must be exactly 6 digits.'),
  target: z.string().min(3, 'Verification target required.'),
  type: z.enum(['phone', 'email']),
});

export const ForgotPasswordSchema = z.object({
  identifier: z.string().min(3, 'Please enter your registered email or phone number.'),
});

export const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long.'),
  confirmPassword: z.string().min(8, 'Please confirm your new password.'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export interface IPasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
  color: string;
  feedback: string;
  requirements: {
    length: boolean;
    hasUpper: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Calculates password strength score (0 to 4) and provides detailed user feedback.
 */
export function calculatePasswordStrength(password: string): IPasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Weak',
      color: 'bg-slate-300 dark:bg-slate-700',
      feedback: 'Enter at least 8 characters with a mix of letters and numbers.',
      requirements: { length: false, hasUpper: false, hasNumber: false, hasSpecial: false },
    };
  }

  const length = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  let score = 0;
  if (length) score += 1;
  if (hasUpper) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecial) score += 1;

  const scoreMap: Record<number, { label: IPasswordStrength['label']; color: string; feedback: string }> = {
    0: { label: 'Weak', color: 'bg-rose-500', feedback: 'Password is too short or weak.' },
    1: { label: 'Fair', color: 'bg-orange-500', feedback: 'Add uppercase letters or numbers.' },
    2: { label: 'Good', color: 'bg-amber-500', feedback: 'Add special characters for extra security.' },
    3: { label: 'Strong', color: 'bg-emerald-500', feedback: 'Great! Your password is secure.' },
    4: { label: 'Very Strong', color: 'bg-teal-400', feedback: 'Excellent! Your account is highly protected.' },
  };

  const current = scoreMap[score] || scoreMap[0];

  return {
    score: score as IPasswordStrength['score'],
    label: current.label,
    color: current.color,
    feedback: current.feedback,
    requirements: { length, hasUpper, hasNumber, hasSpecial },
  };
}
