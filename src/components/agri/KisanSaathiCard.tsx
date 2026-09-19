import React from "react";
import { Leaf, Mic, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface KisanSaathiCardProps {
  onOpen: () => void;
}

/**
 * "किसान साथी" — friendly entry point to the AI assistant. Uses a leafy
 * warm-green panel, plain language, one obvious action, and a voice button
 * because typing is hard in the field.
 */
export const KisanSaathiCard: React.FC<KisanSaathiCardProps> = ({ onOpen }) => {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="kisan-saathi-heading">
      <p className="section-eyebrow">{t("home.kisanSaathi")}</p>

      <div className="mt-2.5 rounded-2xl border border-primary/20 bg-accent/60 p-4 shadow-card md:p-5">
        <div className="flex items-start gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Leaf size={23} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="type-h3 text-foreground">{t("home.kisanSaathiSub")}</p>
            <p className="type-small text-muted-foreground mt-0.5">{t("home.askHint")}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <button
            onClick={onOpen}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-bold text-primary-foreground shadow-sm transition-transform active:scale-[0.97]"
          >
            {t("home.kisanSaathiAsk")}
            <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button
            onClick={onOpen}
            aria-label={t("home.kisanSaathiAsk")}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-primary/25 bg-card text-primary transition-colors hover:bg-primary/10"
          >
            <Mic size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default KisanSaathiCard;
