/**
 * Mandi AI Selling Advisor Engine.
 * Generates honest selling recommendations from real AGMARKNET data (price, MSP, published range).
 */

import type { MandiPrice } from "./mandi-api";

export type AdviceAction = "SELL_NOW" | "WAIT_FEW_DAYS" | "HOLD_LONG_TERM";

export interface SellingAdvice {
  action: AdviceAction;
  badgeLabel: string;
  badgeLabelHi: string;
  badgeColor: "emerald" | "amber" | "rose";
  confidence: number; // 70 to 95%
  minExpectedPrice: number;
  maxExpectedPrice: number;
  reasonEn: string;
  reasonHi: string;
}

/**
 * Generate AI selling advice from verified live market data.
 * Uses only real values: the day's modal price, the published min/max range,
 * and the official MSP. Never invents neighbouring markets or hypothetical profits.
 */
export function generateSellingAdvice(item: MandiPrice): SellingAdvice {
  const price = item.price || 0;
  const msp = item.msp;
  const hasRealRange = item.minPrice > 0 && item.maxPrice > 0;
  const minPrice = hasRealRange ? item.minPrice : price;
  const maxPrice = hasRealRange ? item.maxPrice : price;

  const priceRatioToMsp = msp && msp > 0 ? price / msp : 1.0;

  let action: AdviceAction = "WAIT_FEW_DAYS";
  let confidence = 80;
  let reasonEn = `Rates in ${item.market} are steady. Monitor price movement for 2-3 days before taking a selling decision.`;
  let reasonHi = `${item.market} में भाव स्थिर बने हुए हैं। बिक्री का फैसला लेने से पहले 2-3 दिन बाजार के रुख पर नजर रखें।`;
  let badgeColor: "emerald" | "amber" | "rose" = "amber";

  const cropHiName = item.cropHi || item.crop;

  if (price > 0 && msp && priceRatioToMsp >= 1.03) {
    // Price is significantly above government MSP -> Strong Sell Today
    action = "SELL_NOW";
    badgeColor = "emerald";
    confidence = 90;
    const gain = price - msp;
    reasonEn = `${item.crop} price (₹${price.toLocaleString("en-IN")}/qtl) is ₹${gain.toLocaleString("en-IN")} above government MSP (₹${msp.toLocaleString("en-IN")}).`;
    reasonHi = `${cropHiName} का भाव (₹${price.toLocaleString("en-IN")}/क्विंटल) सरकारी MSP (₹${msp.toLocaleString("en-IN")}) से ₹${gain.toLocaleString("en-IN")} अधिक है।`;
  } else if (msp && price > 0 && priceRatioToMsp < 0.96) {
    // Price is below MSP -> Hold for market recovery
    action = "HOLD_LONG_TERM";
    badgeColor = "rose";
    confidence = 85;
    const loss = msp - price;
    reasonEn = `Current rate is ₹${loss.toLocaleString("en-IN")} below MSP (₹${msp.toLocaleString("en-IN")}). Holding for a few weeks may let the market recover.`;
    reasonHi = `${cropHiName} का वर्तमान भाव MSP (₹${msp.toLocaleString("en-IN")}) से ₹${loss.toLocaleString("en-IN")} कम है। कुछ सप्ताह फसल रोकना लाभदायक हो सकता है।`;
  } else if (hasRealRange && price >= maxPrice * 0.95 && maxPrice > minPrice) {
    // Trading near the top of the published range -> Sell Now
    action = "SELL_NOW";
    badgeColor = "emerald";
    confidence = 85;
    reasonEn = `Rates in ${item.market} are near the top of today's published range (₹${minPrice.toLocaleString("en-IN")}–₹${maxPrice.toLocaleString("en-IN")}/qtl). Selling today locks in solid returns.`;
    reasonHi = `${item.market} में भाव आज के प्रकाशित दायरे (₹${minPrice.toLocaleString("en-IN")}–₹${maxPrice.toLocaleString("en-IN")}/क्विंटल) के उच्चतम बिंदु के निकट है। आज बेचना अच्छे लाभ की संभावना देता है।`;
  } else {
    // Default moderate advice
    action = "WAIT_FEW_DAYS";
    badgeColor = "amber";
    confidence = 80;
    reasonEn = `Rates in ${item.market} are steady. Monitor price movement for 2-3 days before taking a selling decision.`;
    reasonHi = `${item.market} में भाव स्थिर बने हुए हैं। बिक्री का फैसला लेने से पहले 2-3 दिन बाजार के रुख पर नजर रखें।`;
  }

  // Transparent projection around the real modal price — clearly a projection, not a promise.
  const minExpectedPrice = Math.round(price * 0.98);
  const maxExpectedPrice = Math.round(price * 1.06);

  const badgeLabels: Record<AdviceAction, { en: string; hi: string }> = {
    SELL_NOW: { en: "Sell Today", hi: "आज बेचें" },
    WAIT_FEW_DAYS: { en: "Wait 2–3 Days", hi: "2-3 दिन रुकें" },
    HOLD_LONG_TERM: { en: "Hold for Better Price", hi: "बेहतर भाव के लिए रोकें" },
  };

  return {
    action,
    badgeLabel: badgeLabels[action].en,
    badgeLabelHi: badgeLabels[action].hi,
    badgeColor,
    confidence,
    minExpectedPrice,
    maxExpectedPrice,
    reasonEn,
    reasonHi,
  };
}