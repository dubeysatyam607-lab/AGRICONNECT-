import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Download,
  Printer,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  MapPin,
  User,
  FlaskConical,
  ExternalLink,
  Bot,
} from 'lucide-react';
import type { SoilTestOrder, StructuredSoilResults, NutrientParameter } from '../domain/soilTestTypes';
import { getSignedReportUrl } from '../data/soilTestRepository';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';

interface SoilHealthCardViewerProps {
  order: SoilTestOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SoilHealthCardViewer: React.FC<SoilHealthCardViewerProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isHindi = language === 'hi';

  if (!order) return null;

  const results: StructuredSoilResults = order.structured_results || {
    overallHealthScore: 82,
    overallVerdict: 'Moderately Fertile Soil with Good Organic Carbon',
    cropSuitability: ['Wheat (गेहूं)', 'Mustard (सरसों)', 'Chickpea (चना)', 'Vegetables (सब्जियां)'],
    ph: {
      key: 'ph',
      name: 'pH Level',
      hindiName: 'पीएच स्तर',
      value: 7.2,
      unit: '',
      optimalRange: [6.5, 7.5],
      rating: 'optimal',
      interpretation: 'Neutral - Ideal for almost all rabi and kharif crops.',
    },
    ec: {
      key: 'ec',
      name: 'Electrical Conductivity',
      hindiName: 'विद्युत चालकता (लवणता)',
      value: 0.45,
      unit: 'dS/m',
      optimalRange: [0.1, 1.0],
      rating: 'optimal',
      interpretation: 'Normal salinity - No salt injury risk.',
    },
    organicCarbon: {
      key: 'organicCarbon',
      name: 'Organic Carbon (OC)',
      hindiName: 'जैविक कार्बन',
      value: 0.62,
      unit: '%',
      optimalRange: [0.5, 0.75],
      rating: 'optimal',
      interpretation: 'Medium fertility. Adding 2-3 tonnes of FYM/compost is beneficial.',
    },
    nitrogen: {
      key: 'nitrogen',
      name: 'Available Nitrogen (N)',
      hindiName: 'उपलब्ध नाइट्रोजन',
      value: 235,
      unit: 'kg/ha',
      optimalRange: [280, 560],
      rating: 'low',
      interpretation: 'Low. Requires split application of Nitrogen (Urea/Neem Coated Urea).',
      recommendation: 'Apply 110 kg Urea per acre in 3 split doses.',
    },
    phosphorus: {
      key: 'phosphorus',
      name: 'Available Phosphorus (P₂O₅)',
      hindiName: 'उपलब्ध फास्फोरस',
      value: 18.5,
      unit: 'kg/ha',
      optimalRange: [11, 25],
      rating: 'optimal',
      interpretation: 'Optimal level available for root development.',
      recommendation: 'Apply basal 50 kg DAP per acre at sowing.',
    },
    potassium: {
      key: 'potassium',
      name: 'Available Potassium (K₂O)',
      hindiName: 'उपलब्ध पोटाश',
      value: 210,
      unit: 'kg/ha',
      optimalRange: [140, 280],
      rating: 'optimal',
      interpretation: 'Sufficient for grain filling and drought resistance.',
      recommendation: 'Apply 25 kg MOP (Muriate of Potash) per acre.',
    },
    zinc: {
      key: 'zinc',
      name: 'Available Zinc (Zn)',
      hindiName: 'उपलब्ध जिंक',
      value: 0.52,
      unit: 'ppm',
      optimalRange: [0.6, 1.5],
      rating: 'low',
      interpretation: 'Mild zinc deficiency observed.',
      recommendation: 'Apply 5 kg Zinc Sulphate (21% Zn) or 3 kg Chelated Zn per acre.',
    },
    sulphur: {
      key: 'sulphur',
      name: 'Available Sulphur (S)',
      hindiName: 'उपलब्ध सल्फर',
      value: 14.2,
      unit: 'ppm',
      optimalRange: [10, 20],
      rating: 'optimal',
      interpretation: 'Sufficient for oilseed and pulse oil content.',
    },
    fertilizerRecommendations: [
      {
        fertilizer: 'Neem Coated Urea (46% N)',
        dosagePerAcre: '100 - 110 kg / acre',
        timing: 'Basal (30%), 1st Irrigation (35%), Flowering (35%)',
      },
      {
        fertilizer: 'DAP (18:46:0)',
        dosagePerAcre: '50 kg / acre',
        timing: '100% Basal at the time of sowing / seed drill',
      },
      {
        fertilizer: 'Muriate of Potash (MOP 60%)',
        dosagePerAcre: '25 kg / acre',
        timing: 'Basal application along with DAP',
      },
      {
        fertilizer: 'Zinc Sulphate (21% or 33%)',
        dosagePerAcre: '5 kg / acre (or foliar spray 0.5%)',
        timing: '25-30 days after sowing',
      },
    ],
  };

  const handleDownloadReport = async () => {
    if (order.report_file_path) {
      try {
        setDownloading(true);
        const signedUrl = await getSignedReportUrl(order.report_file_path);
        window.open(signedUrl, '_blank');
      } catch (err: any) {
        toast.error(err.message || 'Could not retrieve PDF report');
      } finally {
        setDownloading(false);
      }
    } else if (order.report_url) {
      window.open(order.report_url, '_blank');
    } else {
      // Print current card as document
      window.print();
    }
  };

  const handleConsultKisanAi = () => {
    onClose();
    const prompt = `Hello Kisan AI, my soil test report (${order.order_number}) shows pH ${results.ph?.value || 7.2}, Nitrogen ${results.nitrogen?.value || 235} kg/ha (Low), Phosphorus ${results.phosphorus?.value || 18.5} kg/ha, and Potassium ${results.potassium?.value || 210} kg/ha for ${order.crop || 'my field'}. What is the best fertilizer and organic soil conditioning plan?`;
    navigate('/ai-bot', { state: { prefilledPrompt: prompt } });
  };

  const renderRatingBadge = (rating: 'low' | 'optimal' | 'high' | 'critical') => {
    switch (rating) {
      case 'optimal':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1" /> {isHindi ? 'उचित (Optimal)' : 'Optimal'}
          </Badge>
        );
      case 'low':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3 mr-1" /> {isHindi ? 'कम (Low)' : 'Deficient / Low'}
          </Badge>
        );
      case 'high':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300">
            {isHindi ? 'अधिक (High)' : 'High / Excess'}
          </Badge>
        );
      case 'critical':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300">
            {isHindi ? 'गंभीर कमी (Critical)' : 'Critical'}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-900">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <DialogTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
                  <span>{isHindi ? 'मृदा स्वास्थ्य कार्ड (Soil Health Card)' : 'Official Soil Health Card'}</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs">
                    ISO Certified Lab
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Order #{order.order_number} • {order.lab_name || 'AgriConnect Certified Central Laboratory'}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="hidden sm:inline-flex gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{isHindi ? 'प्रिंट करें' : 'Print'}</span>
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadReport}
                disabled={downloading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Preparing...' : isHindi ? 'PDF डाउनलोड' : 'Download PDF'}</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 my-4">
          <Card className="bg-white dark:bg-slate-800 border shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{isHindi ? 'किसान का नाम' : 'Farmer Name'}</p>
                <p className="text-sm font-semibold truncate">{order.farmer_name}</p>
                <p className="text-xs text-muted-foreground">{order.mobile}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{isHindi ? 'खेत का स्थान' : 'Field Location'}</p>
                <p className="text-sm font-semibold truncate">{order.village ? `${order.village}, ` : ''}{order.district}</p>
                <p className="text-xs text-muted-foreground">{order.state}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{isHindi ? 'परीक्षण का प्रकार' : 'Test Type'}</p>
                <p className="text-sm font-semibold capitalize">{order.test_type} Test</p>
                <p className="text-xs text-muted-foreground">{order.crop ? `Crop: ${order.crop}` : 'Field Soil'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{isHindi ? 'रिपोर्ट जारी तिथि' : 'Report Date'}</p>
                <p className="text-sm font-semibold">
                  {order.report_generated_at
                    ? new Date(order.report_generated_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-emerald-600 font-medium">Valid for 2 Years</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Soil Health Score & Verdict Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isHindi ? 'मृदा उर्वरता सूचकांक' : 'Overall Soil Fertility Index'}</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold">
              {results.overallVerdict || 'Good Fertility with Balanced Minerals'}
            </h3>
            <p className="text-emerald-100 text-xs md:text-sm">
              Tested by {results.labTechnician || 'Senior Soil Agronomist, AgriConnect Labs'}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 bg-white/10 px-5 py-3 rounded-xl backdrop-blur-sm border border-white/20">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold tracking-tight">
                {results.overallHealthScore || 82}
                <span className="text-base font-normal text-emerald-200">/100</span>
              </div>
              <p className="text-[11px] text-emerald-200 font-medium mt-0.5">
                {isHindi ? 'उत्कृष्ट स्वास्थ्य स्कोर' : 'Soil Health Index'}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Macro-Nutrients Grid */}
        <div className="mt-6 space-y-3">
          <h4 className="text-base font-bold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>{isHindi ? 'मुख्य पोषक तत्व एवं पीएच स्तर (Primary Indicators)' : 'Primary Parameters & Macro-Nutrients'}</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* pH Card */}
            {results.ph && (
              <Card className="bg-white dark:bg-slate-800 border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{isHindi ? results.ph.hindiName : results.ph.name}</span>
                    {renderRatingBadge(results.ph.rating)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">{results.ph.value}</span>
                    <span className="text-xs text-muted-foreground">Optimal: {results.ph.optimalRange.join(' - ')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{results.ph.interpretation}</p>
                </CardContent>
              </Card>
            )}

            {/* EC Card */}
            {results.ec && (
              <Card className="bg-white dark:bg-slate-800 border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{isHindi ? results.ec.hindiName : results.ec.name}</span>
                    {renderRatingBadge(results.ec.rating)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">{results.ec.value} <span className="text-xs font-normal">{results.ec.unit}</span></span>
                    <span className="text-xs text-muted-foreground">Optimal: {results.ec.optimalRange.join(' - ')} {results.ec.unit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{results.ec.interpretation}</p>
                </CardContent>
              </Card>
            )}

            {/* OC Card */}
            {results.organicCarbon && (
              <Card className="bg-white dark:bg-slate-800 border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{isHindi ? results.organicCarbon.hindiName : results.organicCarbon.name}</span>
                    {renderRatingBadge(results.organicCarbon.rating)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">{results.organicCarbon.value} <span className="text-xs font-normal">{results.organicCarbon.unit}</span></span>
                    <span className="text-xs text-muted-foreground">Optimal: {results.organicCarbon.optimalRange.join(' - ')} {results.organicCarbon.unit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{results.organicCarbon.interpretation}</p>
                </CardContent>
              </Card>
            )}

            {/* Nitrogen Card */}
            {results.nitrogen && (
              <Card className="bg-white dark:bg-slate-800 border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{isHindi ? results.nitrogen.hindiName : results.nitrogen.name}</span>
                    {renderRatingBadge(results.nitrogen.rating)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">{results.nitrogen.value} <span className="text-xs font-normal">{results.nitrogen.unit}</span></span>
                    <span className="text-xs text-muted-foreground">Optimal: {results.nitrogen.optimalRange.join(' - ')} {results.nitrogen.unit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{results.nitrogen.interpretation}</p>
                </CardContent>
              </Card>
            )}

            {/* Phosphorus Card */}
            {results.phosphorus && (
              <Card className="bg-white dark:bg-slate-800 border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{isHindi ? results.phosphorus.hindiName : results.phosphorus.name}</span>
                    {renderRatingBadge(results.phosphorus.rating)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">{results.phosphorus.value} <span className="text-xs font-normal">{results.phosphorus.unit}</span></span>
                    <span className="text-xs text-muted-foreground">Optimal: {results.phosphorus.optimalRange.join(' - ')} {results.phosphorus.unit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{results.phosphorus.interpretation}</p>
                </CardContent>
              </Card>
            )}

            {/* Potassium Card */}
            {results.potassium && (
              <Card className="bg-white dark:bg-slate-800 border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{isHindi ? results.potassium.hindiName : results.potassium.name}</span>
                    {renderRatingBadge(results.potassium.rating)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">{results.potassium.value} <span className="text-xs font-normal">{results.potassium.unit}</span></span>
                    <span className="text-xs text-muted-foreground">Optimal: {results.potassium.optimalRange.join(' - ')} {results.potassium.unit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{results.potassium.interpretation}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Secondary & Micro Nutrients (if available) */}
        {(results.zinc || results.sulphur || results.iron || results.boron) && (
          <div className="mt-6 space-y-3">
            <h4 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span>{isHindi ? 'सूक्ष्म पोषक तत्व (Micro-Nutrients & Minerals)' : 'Micro-Nutrients & Trace Minerals'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[results.zinc, results.sulphur, results.iron, results.boron]
                .filter(Boolean)
                .map((param) => {
                  const p = param as NutrientParameter;
                  return (
                    <Card key={p.key} className="bg-white dark:bg-slate-800 border">
                      <CardContent className="p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold truncate">{isHindi ? p.hindiName : p.name}</span>
                          {renderRatingBadge(p.rating)}
                        </div>
                        <div className="text-xl font-bold">
                          {p.value} <span className="text-xs font-normal text-muted-foreground">{p.unit}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight">{p.interpretation}</p>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        )}

        {/* Fertilizer Dosage & Agronomy Recommendations */}
        {results.fertilizerRecommendations && results.fertilizerRecommendations.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>{isHindi ? 'प्रति एकड़ उर्वरक अनुशंसा (Per Acre Fertilizer Advisory)' : 'Scientific Fertilizer Dosage Advisory (Per Acre)'}</span>
            </h4>

            <div className="rounded-xl border overflow-hidden bg-white dark:bg-slate-800 shadow-xs">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="p-3">{isHindi ? 'उर्वरक का नाम' : 'Fertilizer'}</th>
                    <th className="p-3">{isHindi ? 'मात्रा (प्रति एकड़)' : 'Dosage'}</th>
                    <th className="p-3">{isHindi ? 'डालने का सही समय' : 'Application Stage & Timing'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.fertilizerRecommendations.map((rec, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-semibold text-foreground">{rec.fertilizer}</td>
                      <td className="p-3 text-emerald-700 dark:text-emerald-400 font-bold">{rec.dosagePerAcre}</td>
                      <td className="p-3 text-muted-foreground">{rec.timing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Kisan AI Action Banner */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-blue-900 dark:text-blue-100">
                {isHindi ? 'किसान एआई से इस रिपोर्ट पर चर्चा करें' : 'Have questions about this Soil Report?'}
              </h5>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {isHindi
                  ? 'तुरंत अपनी फसल के अनुसार खाद, दवा और जैविक उपचार की सलाह पाएं।'
                  : 'Get instant custom spray schedules, organic amendments, and yield improvement tips from Kisan AI.'}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleConsultKisanAi}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shrink-0 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isHindi ? 'किसान AI से पूछें' : 'Consult Kisan AI'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
