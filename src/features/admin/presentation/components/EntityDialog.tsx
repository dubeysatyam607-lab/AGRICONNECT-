import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'switch' | 'date';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  full?: boolean;
}

export type FormValues = Record<string, any>;

interface EntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormField[];
  initial?: FormValues;
  submitLabel?: string;
  onSubmit: (values: FormValues) => void;
}

const toInitial = (fields: FormField[], initial?: FormValues): FormValues => {
  const base: FormValues = {};
  for (const f of fields) {
    base[f.name] = initial?.[f.name] ?? f.type === 'switch' ? false : f.type === 'number' ? 0 : '';
  }
  return { ...base, ...initial };
};

export function EntityDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  submitLabel = 'Save',
  onSubmit,
}: EntityDialogProps) {
  const [values, setValues] = useState<FormValues>(() => toInitial(fields, initial));

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) setValues(toInitial(fields, initial));
  };

  const setField = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {fields.map((field) => {
            const value = values[field.name];
            return (
              <div key={field.name} className={field.full ? 'col-span-2' : 'col-span-2 sm:col-span-1'}>
                <Label htmlFor={`fld-${field.name}`} className="text-xs font-medium text-muted-foreground">
                  {field.label}
                  {field.required && <span className="ml-0.5 text-red-500">*</span>}
                </Label>

                {field.type === 'text' && (
                  <Input
                    id={`fld-${field.name}`}
                    className="mt-1.5"
                    value={value ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => setField(field.name, e.target.value)}
                  />
                )}

                {field.type === 'number' && (
                  <Input
                    id={`fld-${field.name}`}
                    className="mt-1.5"
                    type="number"
                    value={value ?? 0}
                    placeholder={field.placeholder}
                    onChange={(e) => setField(field.name, e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                )}

                {field.type === 'date' && (
                  <Input
                    id={`fld-${field.name}`}
                    className="mt-1.5"
                    type="date"
                    value={value ? String(value).slice(0, 10) : ''}
                    onChange={(e) => setField(field.name, e.target.value)}
                  />
                )}

                {field.type === 'textarea' && (
                  <Textarea
                    id={`fld-${field.name}`}
                    className="mt-1.5 min-h-[80px]"
                    value={value ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => setField(field.name, e.target.value)}
                  />
                )}

                {field.type === 'select' && (
                  <Select value={value ?? ''} onValueChange={(v) => setField(field.name, v)}>
                    <SelectTrigger className="mt-1.5 h-9">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === 'switch' && (
                  <div className="mt-3">
                    <Switch checked={Boolean(value)} onCheckedChange={(v) => setField(field.name, v)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
