import React, { useId } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { AgriButton } from "@/components/ui/agri-button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Form validation schemas
export const contactFormSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-Z\s\u0900-\u097F]+$/, "Name can only contain letters"),
  phone: z.string()
    .regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile number"),
  email: z.string()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(500, "Message must be less than 500 characters"),
});

export const bookingFormSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters"),
  phone: z.string()
    .regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile number"),
  pickupLocation: z.string()
    .min(3, "Enter pickup location"),
  destination: z.string()
    .min(3, "Enter destination"),
  cropType: z.string()
    .min(1, "Select crop type"),
  weight: z.string()
    .regex(/^\d+$/, "Enter weight in quintals"),
  date: z.string()
    .min(1, "Select date"),
});

export const laborHireSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters"),
  phone: z.string()
    .regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile number"),
  workType: z.string()
    .min(1, "Select work type"),
  laborCount: z.string()
    .regex(/^\d+$/, "Enter number of laborers"),
  date: z.string()
    .min(1, "Select date"),
  location: z.string()
    .min(3, "Enter work location"),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
export type BookingFormData = z.infer<typeof bookingFormSchema>;
export type LaborHireFormData = z.infer<typeof laborHireSchema>;

// Reusable form input component
interface FormInputProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}

export const FormField: React.FC<FormInputProps> = ({ label, error, children, required }) => {
  const fieldId = useId();
  const child = React.isValidElement(children) && typeof children.type !== 'string'
    ? children
    : children;
  const labelledChild = React.isValidElement<{ id?: string }>(child)
    ? React.cloneElement(child, { id: fieldId })
    : child;
  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="block text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {labelledChild}
      {error && (
        <p className="text-xs text-destructive animate-in slide-in-from-top-1">{error}</p>
      )}
    </div>
  );
};

// Styled input component
interface StyledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const StyledInput: React.FC<StyledInputProps> = ({ hasError, className, ...props }) => (
  <input
    className={cn(
      "w-full p-3 bg-muted border rounded-xl text-foreground text-sm outline-none transition-all",
      "focus:ring-2 focus:ring-primary focus:border-primary",
      "placeholder:text-muted-foreground",
      hasError ? "border-destructive ring-1 ring-destructive" : "border-border",
      className
    )}
    {...props}
  />
);

// Styled textarea component
interface StyledTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const StyledTextarea: React.FC<StyledTextareaProps> = ({ hasError, className, ...props }) => (
  <textarea
    className={cn(
      "w-full p-3 bg-muted border rounded-xl text-foreground text-sm outline-none transition-all resize-none",
      "focus:ring-2 focus:ring-primary focus:border-primary",
      "placeholder:text-muted-foreground",
      hasError ? "border-destructive ring-1 ring-destructive" : "border-border",
      className
    )}
    {...props}
  />
);

// Styled select component
interface StyledSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const StyledSelect: React.FC<StyledSelectProps> = ({ hasError, className, children, ...props }) => (
  <select
    className={cn(
      "w-full p-3 bg-muted border rounded-xl text-foreground text-sm outline-none transition-all",
      "focus:ring-2 focus:ring-primary focus:border-primary",
      hasError ? "border-destructive ring-1 ring-destructive" : "border-border",
      className
    )}
    {...props}
  >
    {children}
  </select>
);

// Contact Form Component
interface ContactFormProps {
  onSuccess?: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const { language } = useLanguage();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid, dirtyFields },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      const { error } = await supabase.from('contact_messages').insert([{
        name: data.name ?? '',
        phone: data.phone ?? '',
        email: data.email || null,
        message: data.message ?? '',
      }]);
      if (error) throw error;
      toast({
        title: language === 'hi' ? "सफलतापूर्वक भेजा गया!" : "Message Sent Successfully!",
        description: language === 'hi' 
          ? "हम जल्द ही आपसे संपर्क करेंगे" 
          : "We will contact you soon",
      });
      reset();
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Something went wrong", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField 
        label={language === 'hi' ? 'नाम' : 'Name'} 
        error={errors.name?.message}
        required
      >
        <StyledInput
          {...register("name")}
          placeholder={language === 'hi' ? "अपना नाम दर्ज करें" : "Enter your name"}
          hasError={!!errors.name}
        />
      </FormField>

      <FormField 
        label={language === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number'} 
        error={errors.phone?.message}
        required
      >
        <StyledInput
          {...register("phone")}
          type="tel"
          placeholder="9876543210"
          maxLength={10}
          hasError={!!errors.phone}
        />
      </FormField>

      <FormField 
        label={language === 'hi' ? 'ईमेल (वैकल्पिक)' : 'Email (Optional)'} 
        error={errors.email?.message}
      >
        <StyledInput
          {...register("email")}
          type="email"
          placeholder="example@email.com"
          hasError={!!errors.email}
        />
      </FormField>

      <FormField 
        label={language === 'hi' ? 'संदेश' : 'Message'} 
        error={errors.message?.message}
        required
      >
        <StyledTextarea
          {...register("message")}
          rows={4}
          placeholder={language === 'hi' ? "अपना संदेश लिखें..." : "Write your message..."}
          hasError={!!errors.message}
        />
      </FormField>

      <AgriButton 
        type="submit" 
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting 
          ? (language === 'hi' ? 'भेज रहे हैं...' : 'Sending...') 
          : (language === 'hi' ? 'संदेश भेजें' : 'Send Message')
        }
      </AgriButton>
    </form>
  );
};

// Transport Booking Form Component
interface BookingFormProps {
  onSuccess?: () => void;
}

export const TransportBookingForm: React.FC<BookingFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const { language } = useLanguage();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: BookingFormData) => {
    try {
      const { error } = await supabase.from('transport_bookings').insert([{
        name: data.name ?? '',
        phone: data.phone ?? '',
        pickup_location: data.pickupLocation ?? '',
        destination: data.destination ?? '',
        crop_type: data.cropType ?? '',
        weight: data.weight ?? null,
        date: data.date ?? null,
      }]);
      if (error) throw error;
      toast({
        title: language === 'hi' ? "बुकिंग सफल!" : "Booking Successful!",
        description: language === 'hi' 
          ? "आपकी परिवहन बुकिंग की पुष्टि हो गई है" 
          : "Your transport booking has been confirmed",
      });
      reset();
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Something went wrong", variant: "destructive" });
    }
  };

  const cropTypes = [
    { value: '', label: language === 'hi' ? 'फसल चुनें' : 'Select Crop' },
    { value: 'wheat', label: language === 'hi' ? 'गेहूं' : 'Wheat' },
    { value: 'rice', label: language === 'hi' ? 'चावल' : 'Rice' },
    { value: 'cotton', label: language === 'hi' ? 'कपास' : 'Cotton' },
    { value: 'vegetables', label: language === 'hi' ? 'सब्जियां' : 'Vegetables' },
    { value: 'fruits', label: language === 'hi' ? 'फल' : 'Fruits' },
    { value: 'other', label: language === 'hi' ? 'अन्य' : 'Other' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField 
          label={language === 'hi' ? 'नाम' : 'Name'} 
          error={errors.name?.message}
          required
        >
          <StyledInput
            {...register("name")}
            placeholder={language === 'hi' ? "नाम" : "Name"}
            hasError={!!errors.name}
          />
        </FormField>

        <FormField 
          label={language === 'hi' ? 'मोबाइल' : 'Mobile'} 
          error={errors.phone?.message}
          required
        >
          <StyledInput
            {...register("phone")}
            type="tel"
            placeholder="9876543210"
            maxLength={10}
            hasError={!!errors.phone}
          />
        </FormField>
      </div>

      <FormField 
        label={language === 'hi' ? 'पिकअप स्थान' : 'Pickup Location'} 
        error={errors.pickupLocation?.message}
        required
      >
        <StyledInput
          {...register("pickupLocation")}
          placeholder={language === 'hi' ? "गांव/शहर का नाम" : "Village/City name"}
          hasError={!!errors.pickupLocation}
        />
      </FormField>

      <FormField 
        label={language === 'hi' ? 'मंडी गंतव्य' : 'Mandi Destination'} 
        error={errors.destination?.message}
        required
      >
        <StyledInput
          {...register("destination")}
          placeholder={language === 'hi' ? "मंडी का नाम" : "Mandi name"}
          hasError={!!errors.destination}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField 
          label={language === 'hi' ? 'फसल' : 'Crop Type'} 
          error={errors.cropType?.message}
          required
        >
          <StyledSelect {...register("cropType")} hasError={!!errors.cropType}>
            {cropTypes.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </StyledSelect>
        </FormField>

        <FormField 
          label={language === 'hi' ? 'वज़न (क्विंटल)' : 'Weight (Qtl)'} 
          error={errors.weight?.message}
          required
        >
          <StyledInput
            {...register("weight")}
            type="number"
            placeholder="10"
            hasError={!!errors.weight}
          />
        </FormField>
      </div>

      <FormField 
        label={language === 'hi' ? 'तिथि' : 'Date'} 
        error={errors.date?.message}
        required
      >
        <StyledInput
          {...register("date")}
          type="date"
          min={new Date().toISOString().split('T')[0]}
          hasError={!!errors.date}
        />
      </FormField>

      <AgriButton 
        type="submit" 
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting 
          ? (language === 'hi' ? 'बुक हो रहा है...' : 'Booking...') 
          : (language === 'hi' ? 'वाहन बुक करें' : 'Book Vehicle')
        }
      </AgriButton>
    </form>
  );
};

// Labor Hire Form Component  
interface LaborHireFormProps {
  onSuccess?: () => void;
}

export const LaborHireForm: React.FC<LaborHireFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const { language } = useLanguage();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LaborHireFormData>({
    resolver: zodResolver(laborHireSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: LaborHireFormData) => {
    try {
      const { error } = await supabase.from('labor_requests').insert([{
        name: data.name ?? '',
        phone: data.phone ?? '',
        work_type: data.workType ?? '',
        labor_count: data.laborCount ?? null,
        date: data.date ?? null,
      }]);
      if (error) throw error;
      toast({
        title: language === 'hi' ? "अनुरोध भेजा गया!" : "Request Submitted!",
        description: language === 'hi' 
          ? "मज़दूर जल्द ही संपर्क करेंगे" 
          : "Laborers will contact you soon",
      });
      reset();
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Something went wrong", variant: "destructive" });
    }
  };

  const workTypes = [
    { value: '', label: language === 'hi' ? 'काम चुनें' : 'Select Work' },
    { value: 'harvesting', label: language === 'hi' ? 'कटाई' : 'Harvesting' },
    { value: 'sowing', label: language === 'hi' ? 'बुवाई' : 'Sowing' },
    { value: 'weeding', label: language === 'hi' ? 'निराई' : 'Weeding' },
    { value: 'spraying', label: language === 'hi' ? 'छिड़काव' : 'Spraying' },
    { value: 'loading', label: language === 'hi' ? 'लोडिंग' : 'Loading' },
    { value: 'other', label: language === 'hi' ? 'अन्य' : 'Other' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField 
          label={language === 'hi' ? 'नाम' : 'Name'} 
          error={errors.name?.message}
          required
        >
          <StyledInput
            {...register("name")}
            placeholder={language === 'hi' ? "नाम" : "Name"}
            hasError={!!errors.name}
          />
        </FormField>

        <FormField 
          label={language === 'hi' ? 'मोबाइल' : 'Mobile'} 
          error={errors.phone?.message}
          required
        >
          <StyledInput
            {...register("phone")}
            type="tel"
            placeholder="9876543210"
            maxLength={10}
            hasError={!!errors.phone}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField 
          label={language === 'hi' ? 'काम का प्रकार' : 'Work Type'} 
          error={errors.workType?.message}
          required
        >
          <StyledSelect {...register("workType")} hasError={!!errors.workType}>
            {workTypes.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </StyledSelect>
        </FormField>

        <FormField 
          label={language === 'hi' ? 'मज़दूरों की संख्या' : 'Laborers Count'} 
          error={errors.laborCount?.message}
          required
        >
          <StyledInput
            {...register("laborCount")}
            type="number"
            placeholder="5"
            min="1"
            hasError={!!errors.laborCount}
          />
        </FormField>
      </div>

      <FormField 
        label={language === 'hi' ? 'कार्य स्थान' : 'Work Location'} 
        error={errors.location?.message}
        required
      >
        <StyledInput
          {...register("location")}
          placeholder={language === 'hi' ? "खेत/गांव का पता" : "Farm/Village address"}
          hasError={!!errors.location}
        />
      </FormField>

      <FormField 
        label={language === 'hi' ? 'तिथि' : 'Date'} 
        error={errors.date?.message}
        required
      >
        <StyledInput
          {...register("date")}
          type="date"
          min={new Date().toISOString().split('T')[0]}
          hasError={!!errors.date}
        />
      </FormField>

      <AgriButton 
        type="submit" 
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting 
          ? (language === 'hi' ? 'भेज रहे हैं...' : 'Submitting...') 
          : (language === 'hi' ? 'मज़दूर बुलाएं' : 'Hire Laborers')
        }
      </AgriButton>
    </form>
  );
};

export default ContactForm;
