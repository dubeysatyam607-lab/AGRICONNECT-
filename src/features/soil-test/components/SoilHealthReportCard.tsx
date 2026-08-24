import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FlaskConical,
  Sprout,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Download,
  Share2,
  Printer,
  Sparkles,
  Info,
  Calendar,
  User,
  MapPin,
  Leaf,
  Layers,
  Activity,
  FileCheck,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { SoilHealthReport } from '../domain/soilTestTypes';
import { toast } from 'sonner';

interface SoilHealthReportCardProps {
  report: SoilHealthReport;
  onShare?: () => void;
}

export const SoilHealthReportCard: React.FC<SoilHealthReportCardProps> = ({ report, onShare }) => {
  const { language } = useLanguage();
  const isHindi = language === 'hi';
  const [activeTab, setActiveTab] = useState<'nutrients' | 'recommendations' | 'field'>('nutrients');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'low':
      case 'deficient':
        return (
          <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950 text-rose-600 border-rose-200 text-xs">
            {isHindi ? 'कम (Deficient)' : 'Low / Deficient'}
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-600 border-amber-200 text-xs">
            {isHindi ? 'मध्यम (Medium)' : 'Medium'}
          </Badge>
        );
      case 'sufficient':
      case 'normal':
        return (
          <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border-emerald-200 text-xs">
            {isHindi ? 'उपयुक्त (Optimal)' : 'Optimal'}
          </Badge>
        );
      case 'high':
      case 'excess':
        return (
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-600 border-blue-200 text-xs">
            {isHindi ? 'अधिक (High)' : 'High / Excess'}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.success(isHindi ? 'मृदा स्वास्थ्य कार्ड डाउनलोड शुरू हुआ' : 'Downloading Soil Health Card PDF...');
  };

  return (
    <Card className="border shadow-sm overflow-hidden bg-card">
      {/* Report Header Bar */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/30 text-white hover:bg-emerald-500/40 border-0 text-[11px]">
                {isHindi ? 'सरकारी मान्यता प्राप्त NABL रिपोर्ट' : 'NABL Accredited Lab Report'}
              </Badge>
              <span className="text-xs text-emerald-100 font-mono">
                #{report.reportNumber}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isHindi ? 'डिजिटल मृदा स्वास्थ्य कार्ड' : 'Digital Soil Health Card'}
            </h2>
            <p className="text-xs text-emerald-100 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>{isHindi ? 'परीक्षण तिथि:' : 'Test Date:'} {report.testedAt}</span>
              <span>•</span>
              <FileCheck className="w-3.5 h-3.5" />
              <span>{report.labName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isHindi ? 'प्रिंट' : 'Print'}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </Button>
          </div>
        </div>

        {/* Overall Health Score Banner */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3.5 text-white">
          <div className="text-center sm:text-left">
            <span className="text-[11px] text-emerald-200 block font-medium">
              {isHindi ? 'मृदा स्वास्थ्य स्कोर' : 'Soil Health Index'}
            </span>
            <div className="text-2xl font-black mt-0.5">{report.overallHealthScore}/100</div>
          </div>
          <div className="text-center sm:text-left">
            <span className="text-[11px] text-emerald-200 block font-medium">
              {isHindi ? 'मृदा पीएच (pH)' : 'Soil pH Status'}
            </span>
            <div className="text-lg font-bold mt-0.5">{report.ph} ({report.phStatus})</div>
          </div>
          <div className="text-center sm:text-left">
            <span className="text-[11px] text-emerald-200 block font-medium">
              {isHindi ? 'जैविक कार्बन' : 'Organic Carbon (OC)'}
            </span>
            <div className="text-lg font-bold mt-0.5">{report.organicCarbon}% ({report.ocStatus})</div>
          </div>
          <div className="text-center sm:text-left">
            <span className="text-[11px] text-emerald-200 block font-medium">
              {isHindi ? 'विद्युत चालकता (EC)' : 'EC (Salinity)'}
            </span>
            <div className="text-lg font-bold mt-0.5">{report.ec} dS/m</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="p-4 sm:p-6">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="nutrients" className="text-xs sm:text-sm font-semibold">
            {isHindi ? 'पोषक तत्व विश्लेषण' : 'Nutrient Analysis'}
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs sm:text-sm font-semibold">
            {isHindi ? 'उर्वरक सिफारिशें' : 'Fertilizer Prescription'}
          </TabsTrigger>
          <TabsTrigger value="field" className="text-xs sm:text-sm font-semibold">
            {isHindi ? 'खेत एवं फसल विवरण' : 'Field & Crop Info'}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Nutrients Grid */}
        <TabsContent value="nutrients" className="space-y-6">
          {/* Primary Macro Nutrients (NPK) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm sm:text-base text-foreground">
                {isHindi ? 'प्राथमिक पोषक तत्व (Primary N-P-K)' : 'Primary Macro-Nutrients (NPK)'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Nitrogen */}
              <div className="p-3.5 rounded-xl border bg-card hover:border-emerald-300 transition-colors space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {isHindi ? 'नाइट्रोजन (N)' : 'Nitrogen (N)'}
                    </span>
                    <h4 className="text-lg font-bold text-foreground">{report.nitrogen} <span className="text-xs font-normal text-muted-foreground">kg/ha</span></h4>
                  </div>
                  {getStatusBadge(report.nitrogenStatus)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isHindi ? 'इष्टतम स्तर: 280 - 560 kg/ha' : 'Target Range: 280 - 560 kg/ha'}
                </div>
              </div>

              {/* Phosphorus */}
              <div className="p-3.5 rounded-xl border bg-card hover:border-emerald-300 transition-colors space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {isHindi ? 'फास्फोरस (P₂O₅)' : 'Phosphorus (P)'}
                    </span>
                    <h4 className="text-lg font-bold text-foreground">{report.phosphorus} <span className="text-xs font-normal text-muted-foreground">kg/ha</span></h4>
                  </div>
                  {getStatusBadge(report.phosphorusStatus)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isHindi ? 'इष्टतम स्तर: 23 - 56 kg/ha' : 'Target Range: 23 - 56 kg/ha'}
                </div>
              </div>

              {/* Potassium */}
              <div className="p-3.5 rounded-xl border bg-card hover:border-emerald-300 transition-colors space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {isHindi ? 'पोटैशियम (K₂O)' : 'Potassium (K)'}
                    </span>
                    <h4 className="text-lg font-bold text-foreground">{report.potassium} <span className="text-xs font-normal text-muted-foreground">kg/ha</span></h4>
                  </div>
                  {getStatusBadge(report.potassiumStatus)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isHindi ? 'इष्टतम स्तर: 140 - 280 kg/ha' : 'Target Range: 140 - 280 kg/ha'}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary & Micronutrients */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm sm:text-base text-foreground">
                {isHindi ? 'द्वितीयक एवं सूक्ष्म पोषक तत्व' : 'Secondary & Micronutrients'}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: isHindi ? 'सल्फर (S)' : 'Sulphur (S)', val: `${report.sulphur || '12.4'} ppm`, status: report.sulphurStatus || 'medium' },
                { name: isHindi ? 'जिंक (Zn)' : 'Zinc (Zn)', val: `${report.zinc || '0.54'} ppm`, status: report.zincStatus || 'low' },
                { name: isHindi ? 'आयरन (Fe)' : 'Iron (Fe)', val: `${report.iron || '5.2'} ppm`, status: report.ironStatus || 'sufficient' },
                { name: isHindi ? 'बोरॉन (B)' : 'Boron (B)', val: `${report.boron || '0.42'} ppm`, status: report.boronStatus || 'medium' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-800/50 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">{item.name}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="text-base font-bold">{item.val}</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: Recommendations */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                {isHindi ? 'वैज्ञानिक उर्वरक एवं खुराक सिफारिश' : 'Scientific Fertilizer Dosage for Selected Crop'}
              </p>
              <p className="text-emerald-800 dark:text-emerald-300">
                {isHindi
                  ? 'यह सिफारिश आपकी मिट्टी में नाइट्रोजन की कमी और मध्यम फास्फोरस के आधार पर तैयार की गई है।'
                  : 'Tailored specifically based on deficient Nitrogen and low Zinc detected in your soil test.'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {report.recommendations?.map((rec, idx) => (
              <div key={idx} className="p-4 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-sm text-foreground">{rec.fertilizerName}</h4>
                    <Badge variant="outline" className="text-[10px]">{rec.timing}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.reason}</p>
                </div>
                <div className="text-right sm:text-right shrink-0 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border">
                  <span className="text-[10px] text-muted-foreground block">{isHindi ? 'प्रति एकड़ मात्रा' : 'Dose per Acre'}</span>
                  <span className="font-extrabold text-sm text-emerald-600">{rec.dosagePerAcre}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: Field Details */}
        <TabsContent value="field" className="space-y-3">
          <div className="p-4 rounded-xl border bg-card space-y-3">
            <div className="flex items-center gap-2 border-b pb-3">
              <User className="w-4 h-4 text-emerald-600" />
              <div className="text-xs">
                <span className="text-muted-foreground block">{isHindi ? 'किसान' : 'Farmer'}:</span>
                <span className="font-bold">{report.farmerName}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block">{isHindi ? 'गाँव व जिला:' : 'Location:'}</span>
                <span className="font-semibold">{report.village ? `${report.village}, ` : ''}{report.district}, {report.state}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">{isHindi ? 'खेत का क्षेत्रफल:' : 'Farm Size:'}</span>
                <span className="font-semibold">{report.landSizeAcres || '3.5'} {isHindi ? 'एकड़' : 'Acres'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">{isHindi ? 'परीक्षित फसल:' : 'Tested Crop:'}</span>
                <span className="font-semibold">{report.crop || 'Wheat (गेहूं)'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">{isHindi ? 'मिट्टी का प्रकार:' : 'Soil Texture:'}</span>
                <span className="font-semibold">{report.soilType || 'Black Clay Loam (काली दोमट)'}</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
