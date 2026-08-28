import React, { useState, useEffect, useMemo } from "react";
import {
  Sprout, FlaskConical, Bug, Wrench, Tractor, Star, Heart, ShoppingCart,
  Search, SlidersHorizontal, X, Plus, Minus, Trash2, Check, Tag, Percent,
  Truck, PackageCheck, PackageSearch, Wallet, Smartphone, CreditCard,
  IndianRupee, MapPin, Clock, Timer, ShieldCheck, BadgeCheck, Navigation,
  ArrowLeft, Gift, RefreshCw, ChevronRight, Sparkles, CircleCheck, Zap,
  WifiOff,
} from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { SafeImage } from "@/components/ui/SafeImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { postEdgeJson } from "@/lib/invoke-edge";
import { supabase } from "@/integrations/supabase/client";
import {
  resolveImageUrl,
  normalizeApiProductImage,
  getStoreProductImage,
  DEFAULT_STORE_PRODUCTS,
} from "@/lib/image-resolver";
import { getDefaultGateway, isRazorpayConfigured } from "@/features/payments/domain/gateways";
import { OfficialUpiQrCard } from "./OfficialUpiQrCard";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "https://yrebxnpilkfeaofykvhq.supabase.co").replace(/\/$/, "");
const FUNC_URL = `${SUPABASE_URL}/functions/v1/agri-market`;

function post(body: Record<string, unknown>) {
  return postEdgeJson<Record<string, unknown>>(FUNC_URL, body, 15000);
}

function fmt(n: number): string {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) as T : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / private mode — ignore
  }
}

const CATEGORIES = ["All", "seeds", "fertilizers", "pesticides", "tools", "machinery"];
const CATEGORY_ICONS: Record<string, typeof Sprout> = {
  seeds: Sprout, fertilizers: FlaskConical, pesticides: Bug, tools: Wrench, machinery: Tractor,
};
const CATEGORY_LABEL: Record<string, [string, string]> = {
  seeds: ["Seeds", "बीज"], fertilizers: ["Fertilizers", "खाद"], pesticides: ["Pesticides", "कीटनाशक"],
  tools: ["Tools", "उपकरण"], machinery: ["Machinery", "मशीनरी"],
};
const STORE_CATEGORY_MAP: Record<string, string> = {
  Fertilizer: "fertilizers", Seeds: "seeds", Pesticide: "pesticides", Tool: "tools", Feed: "seeds",
};
const CATEGORY_COLORS: Record<string, string> = {
  seeds: "#d97706", fertilizers: "#16a34a", pesticides: "#0891b2", tools: "#2563eb", machinery: "#7c3aed",
};

function storeProductToUI(r: Record<string, unknown>): ProductDetail {
  const category = STORE_CATEGORY_MAP[String(r.category || "")] || "tools";
  const name = String(r.name || "Product");
  const price = Number(r.price) || 0;
  const mrp = Number(r.mrp) || price;
  const stock = Number(r.stock ?? 0);
  const inStock = stock > 0 && r.status !== "Hidden";
  const imageUrl = normalizeApiProductImage(r, category);
  return {
    id: `db-${r.id}`,
    name,
    nameHi: String(r.name_hi || r.nameHi || name),
    category,
    price,
    mrp,
    unit: String(r.unit || ""),
    brand: String(r.brand || "AgriStore"),
    rating: Number(r.rating) || 4.5,
    reviews: Number(r.reviews) || 120,
    sold: Number(r.sold) || 1500,
    stock,
    offer: mrp > price ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF` : "",
    freeDelivery: Boolean(r.free_delivery ?? (price > 499)),
    deliveryDays: String(r.delivery_days || "1-3 days"),
    color: CATEGORY_COLORS[category] || "#16a34a",
    inStock,
    discountPct: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
    imageUrl,
    batchNo: r.batch_no ? String(r.batch_no) : undefined,
    descriptionText: r.description ? String(r.description) : undefined,
    description: r.description ? String(r.description) : "Premium agricultural product.",
    descriptionHi: r.description_hi ? String(r.description_hi) : "प्रीमियम कृषि उत्पाद।",
    tags: Array.isArray(r.tags) ? r.tags : ["Premium", category],
    weightKg: Number(r.weight_kg) || 1
  };
}

interface Product {
  id: string; name: string; nameHi: string; category: string; price: number; mrp: number;
  unit: string; brand: string; rating: number; reviews: number; sold: number; stock: number;
  offer: string; freeDelivery: boolean; deliveryDays: string; color: string; inStock: boolean;
  discountPct: number;
  imageUrl?: string; batchNo?: string; descriptionText?: string;
}
interface ProductDetail extends Product { description: string; descriptionHi: string; tags: string[]; weightKg: number; }
interface Review { user: string; rating: number; comment: string; when: string; }
interface CartLine { productId: string; name: string; nameHi: string; price: number; unit: string; qty: number; color: string; category: string; lineTotal: number; imageUrl?: string; }
interface Order {
  id: string; items: CartLine[]; subtotal: number; discount: number; shipping: number; total: number;
  couponCode: string; couponDesc: string; userName: string; phone: string; address: string;
  paymentMethod: string; paymentStatus: string; status: string; placedAt: string;
}
interface Tracking { orderId: string; courier: string; trackingNo: string; progress: number; stages: Array<{ label: string; done: boolean; when: string }>; eta: string; current: string; status: string; }

const LOCAL_COUPONS: Array<{ code: string; type: "percent" | "flat"; value: number; cap: number; min: number; desc: string; descHi: string }> = [
  { code: "WELCOME10", type: "percent", value: 10, cap: 200, min: 499, desc: "10% off up to ₹200", descHi: "₹200 तक 10% छूट" },
  { code: "KHETI20", type: "percent", value: 20, cap: 500, min: 999, desc: "20% off up to ₹500", descHi: "₹500 तक 20% छूट" },
  { code: "SAVE150", type: "flat", value: 150, cap: 150, min: 799, desc: "Flat ₹150 off", descHi: "फ्लैट ₹150 छूट" },
  { code: "FEST50", type: "flat", value: 50, cap: 50, min: 299, desc: "Flat ₹50 off", descHi: "फ्लैट ₹50 छूट" },
  { code: "FREESHIP", type: "percent", value: 0, cap: 49, min: 499, desc: "Free shipping over ₹499", descHi: "₹499 से अधिक पर मुफ्त शिपिंग" },
];

function localCoupon(code: string, subtotal: number): { ok: boolean; discount?: number; error?: string; coupon?: { code: string; desc: string; descHi: string } } {
  const c = LOCAL_COUPONS.find(x => x.code === code.trim().toUpperCase());
  if (!c) return { ok: false, error: "Invalid coupon code" };
  if (subtotal < c.min) return { ok: false, error: `Add items worth ₹${c.min} to use ${c.code}` };
  let discount = 0;
  if (c.type === "percent" && c.value > 0) discount = Math.round(Math.min(subtotal * (c.value / 100), c.cap));
  if (c.type === "flat") discount = c.value;
  if (c.code === "FREESHIP") discount = 49;
  return { ok: true, discount, coupon: { code: c.code, desc: c.desc, descHi: c.descHi } };
}

function computeTotals(cart: CartLine[], couponCode: string): { subtotal: number; discount: number; shipping: number; total: number; couponDesc: string } {
  const safeCart = cart.filter(l => l && Number.isFinite(l.price) && l.price > 0 && Number.isFinite(l.qty) && l.qty > 0);
  const subtotal = safeCart.reduce((s, l) => s + (l.price * Math.max(1, Math.floor(l.qty))), 0);
  const v = localCoupon(couponCode, subtotal);
  const discount = v.ok ? Math.min(subtotal, Math.max(0, v.discount ?? 0)) : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const freeShip = couponCode.toUpperCase() === "FREESHIP" ? true : afterDiscount >= 499;
  const shipping = subtotal > 0 ? (freeShip ? 0 : 49) : 0;
  const total = Math.max(0, afterDiscount + shipping);
  return { subtotal, discount, shipping, total, couponDesc: v.ok && v.coupon ? v.coupon.desc : "" };
}

function buildLocalTracking(orderId: string): Tracking {
  const seed = orderId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const now = Date.now();
  const minutes = (now / 60000) % 10000;
  const progress = Math.min(99, Math.round((minutes / (720 + (seed % 400))) * 100));
  const stages = [
    { label: "Order confirmed", done: true, when: "Day 1" },
    { label: "Packed & ready", done: progress >= 8, when: progress >= 8 ? "Day 1" : "Pending" },
    { label: "Shipped", done: progress >= 20, when: progress >= 20 ? "Day 2" : "Pending" },
    { label: "Out for delivery", done: progress >= 60, when: progress >= 60 ? "Today" : "Pending" },
    { label: "Delivered", done: progress >= 95, when: progress >= 95 ? "Today" : "Pending" },
  ];
  return {
    orderId,
    courier: ["Delhivery", "BlueDart", "Ekart"][seed % 3],
    trackingNo: `LOC-${orderId.slice(0, 8).toUpperCase()}`,
    progress,
    stages,
    eta: `${2 + (seed % 4)}-${6 + (seed % 4)} days`,
    current: stages.filter(s => s.done).pop()?.label || "Order confirmed",
    status: progress >= 95 ? "delivered" : progress >= 60 ? "out-for-delivery" : progress >= 20 ? "shipped" : "confirmed",
  };
}



function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={cn(i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted")} />
      ))}
    </span>
  );
}

const TrackingScreen = ({ order, onClose, t }: { order: Order; onClose: () => void; t: (k: string) => string }) => {
  const [track, setTrack] = useState<Tracking>(() => buildLocalTracking(order.id));
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await post({ action: "track-order", orderId: order.id });
        if (active && res.tracking) setTrack(res.tracking);
      } catch {
        if (active) setTrack(buildLocalTracking(order.id));
        setErr(err => err || "");
      }
    };
    load();
    const iv = setInterval(load, 4000);
    return () => { active = false; clearInterval(iv); };
  }, [order.id]);

  return (
    <div className="fixed inset-0 z-[70] bg-background overflow-y-auto animate-sheet-up" role="dialog" aria-modal="true" aria-label="Delivery tracking">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-2">
        <AgriButton variant="outline" size="icon" onClick={onClose} aria-label="Back"><ArrowLeft size={16} /></AgriButton>
        <div>
          <h2 className="font-bold text-sm flex items-center gap-1.5"><PackageSearch size={15} className="text-primary" /> {t("deliveryTrack")}</h2>
          <p className="text-[11px] text-muted-foreground">#{order.id.slice(0, 10).toUpperCase()}</p>
        </div>
        {track.status !== "delivered" && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span></span>
            LIVE
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        <AgriCard>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Truck size={19} /></div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{t("courier")}: {track.courier}</p>
              <p className="text-[11px] text-muted-foreground truncate">{t("trackNo")}: {track.trackingNo}</p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">{t("eta")} {track.eta}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>{track.progress}% {t("completed")}</span><span className="font-semibold text-primary">{track.current}</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700" style={{ width: `${track.progress}%` }}></div>
          </div>

          <div className="relative mt-5">
            <div className="absolute left-[11px] top-1 bottom-1 w-0.5 bg-muted"></div>
            {track.stages.map((s, i) => (
              <div key={i} className="relative flex gap-3 pb-5 last:pb-0">
                <span className={cn("relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0", s.done ? "bg-emerald-500 border-emerald-500 text-white" : "bg-card border-muted-foreground/40 text-transparent")}>
                  {s.done && <Check size={12} />}
                </span>
                <div className="pt-0.5">
                  <p className={cn("text-sm font-semibold", s.done ? "text-foreground" : "text-muted-foreground")}>{s.label}</p>
                  <p className="text-[11px] text-muted-foreground">{s.when}</p>
                </div>
              </div>
            ))}
          </div>
        </AgriCard>

        <AgriCard>
          <h3 className="font-bold text-sm mb-2">{t("orderItems")}</h3>
          {order.items.map((it, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 border-b border-border last:border-0">
              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 relative">
                <SafeImage
                  src={it.imageUrl}
                  alt={it.name}
                  resolveType="product"
                  entityName={it.name}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs font-semibold flex-1 truncate">{it.name} × {it.qty}</p>
              <p className="text-xs font-bold text-primary">{fmt(it.lineTotal)}</p>
            </div>
          ))}
          <div className="flex justify-between mt-2 text-sm font-bold">
            <span>{t("total")}</span><span className="text-primary">{fmt(order.total)}</span>
          </div>
        </AgriCard>

        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
          <ShieldCheck size={22} className="text-primary shrink-0" />
          <p className="text-xs text-foreground">{t("supportMsg")}</p>
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({ order, onClose, onPaid, t }: {
  order: Order; onClose: () => void; onPaid: () => void; t: (k: string) => string;
}) => {
  const [stage, setStage] = useState<"pick" | "paying" | "done">("pick");
  const [method, setMethod] = useState(order.paymentMethod || "upi");
  const [payErr, setPayErr] = useState("");

  const pay = async () => {
    if (method === "cash") {
      setStage("paying");
      setTimeout(() => setStage("done"), 1200);
      return;
    }
    setStage("paying");
    setPayErr("");
    try {
      const gw = getDefaultGateway();
      const result = await gw.charge({
        amount: order.total,
        method: method as "upi" | "card" | "netbanking" | "wallet",
        currency: "INR",
        orderId: order.id,
        description: `AgriConnect Order #${order.id.slice(0, 8).toUpperCase()}`,
        customer: { name: order.userName, phone: order.phone },
      });
      if (result.success) {
        setStage("done");
      } else {
        setStage("pick");
        setPayErr(result.failureReason || t("payFailed"));
      }
    } catch {
      setStage("pick");
      setPayErr(t("payFailed"));
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background/90 backdrop-blur flex items-center justify-center p-4 overflow-y-auto animate-fade-up" role="dialog" aria-modal="true" aria-label="Payment status">
      <AgriCard className="w-full max-w-sm">
        {stage === "done" ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto mb-3"><CircleCheck size={34} /></div>
            <h3 className="font-bold text-foreground text-lg">{t("paySuccess")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{fmt(order.total)} {t("paidVia")} {method.toUpperCase()}</p>
            <div className="mt-4 space-y-2">
              <AgriButton className="w-full" onClick={() => { onPaid(); }}><PackageSearch size={15} /> {t("trackOrder")}</AgriButton>
              <AgriButton variant="outline" className="w-full" onClick={onClose}>{t("done")}</AgriButton>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2"><Wallet size={16} className="text-primary" /> {t("payment")}</h3>
              <AgriButton variant="ghost" size="icon" onClick={onClose}><X size={16} /></AgriButton>
            </div>
            <div className="bg-muted rounded-xl p-3 my-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("amountDue")}</span>
              <span className="font-bold text-xl text-primary">{fmt(order.total)}</span>
            </div>
            {stage === "paying" ? (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <p className="text-sm text-muted-foreground">{t("processing")}</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex items-center gap-2 p-3 rounded-xl border bg-primary/10 border-primary/50 text-sm font-bold text-foreground mb-3">
                    <Smartphone size={16} className="text-primary" />
                    <span>Official UPI & Instant QR Payment</span>
                  </div>
                  <OfficialUpiQrCard amount={order.total} note={`AgriStore Order #${order.id.slice(0, 6)}`} />
                </div>

                <AgriButton className="w-full" onClick={pay}>
                  <Check size={16} />
                  {`I Have Paid / Confirm Order (${fmt(order.total)})`}
                </AgriButton>
                {payErr && <p className="text-[11px] text-rose-500 text-center mt-2 font-semibold">{payErr}</p>}
                <p className="text-[11px] text-muted-foreground text-center mt-2">Verified Direct UPI Payment · Satyam Dubey (7067820256@airtel)</p>
              </>
            )}
          </>
        )}
      </AgriCard>
    </div>
  );
};

const ReviewModal = ({ product, onClose, onSubmitted, t }: {
  product: Product; onClose: () => void; onSubmitted: (r: number) => void; t: (k: string) => string;
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await post({ action: "review", productId: product.id, rating, comment, userName: read("agri_user_name", "Farmer") });
      setSent(true);
      onSubmitted(rating);
    } catch {
      setSent(true);
      onSubmitted(rating);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-background/90 backdrop-blur flex items-center justify-center p-4 overflow-y-auto animate-fade-up" role="dialog" aria-modal="true" aria-label="Order status">
      <AgriCard className="w-full max-w-sm">
        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto mb-3"><Check size={28} /></div>
            <h3 className="font-bold text-foreground">{t("thankReview")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t("reviewAdded")}</p>
            <AgriButton className="w-full mt-4" onClick={onClose}>{t("done")}</AgriButton>
          </div>
        ) : (
          <>
            <h3 className="font-bold text-foreground mb-1">{t("rate")} {product.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("shareExp")}</p>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setRating(i)} className="transition-transform active:scale-90">
                  <Star size={32} className={cn("transition-colors", i <= rating ? "fill-amber-400 text-amber-400" : "text-muted")} />
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={t("writeReview")} className="w-full h-24 p-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
            <div className="flex gap-2 mt-4">
              <AgriButton variant="outline" className="flex-1" onClick={onClose}>{t("cancel")}</AgriButton>
              <AgriButton className="flex-1" onClick={submit} disabled={busy}>{busy ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />} {t("submit")}</AgriButton>
            </div>
          </>
        )}
      </AgriCard>
    </div>
  );
};

interface AgriStoreProps {
  onToast: (message: string) => void;
}

const AgriStore: React.FC<AgriStoreProps> = ({ onToast }) => {
  const { language } = useLanguage();
  const hi = language === "hi";
  const t = (k: string) => (STRINGS as Record<string, [string, string]>)[k]?.[hi ? 1 : 0] ?? k;

  const [tab, setTab] = useState<"shop" | "orders">("shop");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banners, setBanners] = useState<Array<{ id: string; title: string; titleHi: string; sub: string; subHi: string; color: string }>>([
    { id: "b1", title: "Kharif Sale", titleHi: "खरीफ सेल", sub: "Upto 20% off on seeds & fertilizers", subHi: "बीज और खाद पर 20% तक छूट", color: "#16a34a" },
  ]);
  const [coupons, setCoupons] = useState(LOCAL_COUPONS);
  const [stats, setStats] = useState({ total: 0, offers: 0, brands: 0, avgRating: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);

  const [wishlist, setWishlist] = useState<string[]>(() => read("agri_wishlist", [] as string[]));
  const [cart, setCart] = useState<CartLine[]>(() => read("agri_cart", [] as CartLine[]));
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [selected, setSelected] = useState<ProductDetail | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [detailReviews, setDetailReviews] = useState<Review[]>([]);
  const [detailQty, setDetailQty] = useState(1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [reviewFor, setReviewFor] = useState<Product | null>(null);

  const [orders, setOrders] = useState<Order[]>(() => read("agri_orders", [] as Order[]));
  const [payment, setPayment] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<Order | null>(null);
  const [checkoutForm, setCheckoutForm] = useState(() => read("agri_user", { name: "", phone: "", pincode: "", address: "", payment: "" }));
  const [placing, setPlacing] = useState(false);
  const [toast, setToast] = useState("");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  const showToast = (m: string) => {
    setToast(m);
    onToast(m);
    setTimeout(() => setToast(""), 2400);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    supabase.from("store_inventory").select("*").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        let merged: Product[] = [];
        if (data && data.length > 0) {
          merged = data.filter((r: any) => r.name).map((r: any) => storeProductToUI(r));
        }

        // If no products in DB or error, populate with verified real store catalog
        if (merged.length === 0) {
          merged = DEFAULT_STORE_PRODUCTS.map((r: any) => storeProductToUI(r));
        }

        setProducts(merged);
        setBanners([
          { id: "b1", title: "Kharif Sale", titleHi: "खरीफ सेल", sub: "Upto 20% off on seeds & fertilizers", subHi: "बीज और खाद पर 20% तक छूट", color: "#16a34a" },
        ]);
        setStats({ total: merged.length, offers: merged.filter(p => p.discountPct > 0).length, brands: 12, avgRating: 4.8 });
      })
      .catch(() => {
        if (!active) return;
        const fallbackList = DEFAULT_STORE_PRODUCTS.map((r: any) => storeProductToUI(r));
        setProducts(fallbackList);
        setStats({ total: fallbackList.length, offers: fallbackList.filter(p => p.discountPct > 0).length, brands: 8, avgRating: 4.8 });
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = () => {
    write("agri_cart", cart);
    write("agri_wishlist", wishlist);
    write("agri_orders", orders);
  };
  useEffect(persist, [cart, wishlist, orders]);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !active) return;
      supabase.from("wallets").select("balance").eq("user_id", user.id).single()
        .then(({ data }) => { if (active && data) setWalletBalance(Number(data.balance) || 0); })
        .catch(() => {});
    });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => {
    let list = products;
    if (category !== "All") list = list.filter(p => p.category === category);
    if (showWishlist) list = list.filter(p => wishlist.includes(p.id));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.nameHi || "").includes(search.trim()) || p.brand.toLowerCase().includes(q));
    }
    const s = [...list];
    if (sort === "price_asc") s.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") s.sort((a, b) => b.price - a.price);
    else if (sort === "rating") s.sort((a, b) => b.rating - a.rating);
    else s.sort((a, b) => b.sold - a.sold);
    return s;
  }, [products, category, search, sort, showWishlist, wishlist]);

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  const addToCart = (p: Product, qty = 1, open = false) => {
    setCart(prev => {
      const ex = prev.find(l => l.productId === p.id);
      if (ex) {
        return prev.map(l => l.productId === p.id ? { ...l, qty: Math.min(50, l.qty + qty), lineTotal: p.price * Math.min(50, l.qty + qty) } : l);
      }
      return [...prev, { productId: p.id, name: p.name, nameHi: p.nameHi, price: p.price, unit: p.unit, qty, color: p.color, category: p.category, lineTotal: p.price * qty, imageUrl: p.imageUrl }];
    });
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 600);
    showToast(`${hi ? p.nameHi || p.name : p.name} ${t("addedToCart")}`);
    if (open) setCartOpen(true);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      return prev.flatMap(l => {
        if (l.productId !== id) return [l];
        const q = l.qty + delta;
        if (q <= 0) return [];
        return [{ ...l, qty: Math.min(50, q), lineTotal: l.price * Math.min(50, q) }];
      });
    });
  };

  const toggleWishlist = (id: string) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const openDetails = async (id: string) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const local = products.find(p => p.id === id) as ProductDetail;
      if (local) {
        setSelected(local);
        setRelated(products.filter(p => p.id !== id && p.category === local.category).slice(0, 4));
        setDetailReviews([]);
        setDetailError(null);
      } else {
        // Fallback: try fetching from supabase directly
        const dbId = id.replace("db-", "");
        const { data, error } = await supabase.from("store_inventory").select("*").eq("id", dbId).single();
        if (data && !error) {
          const product = storeProductToUI(data);
          setSelected(product);
          setRelated(products.filter(p => p.id !== id && p.category === product.category).slice(0, 4));
          setDetailReviews([]);
          setDetailError(null);
        } else {
          setDetailError(t("catalogLoadFailed"));
        }
      }
    } catch {
      setDetailError(t("catalogLoadFailed"));
    } finally {
      setDetailLoading(false);
    }
  };

  const applyCoupon = () => {
    const code = couponInput.trim();
    if (!code) { setCouponMsg({ ok: false, text: t("enterCoupon") }); return; }
    const subtotal = cart.reduce((s, l) => s + l.lineTotal, 0);
    post({ action: "coupons", code, subtotal })
      .then(res => {
        if (res.ok && res.coupon) {
          setCouponCode(code.toUpperCase());
          setCouponMsg({ ok: true, text: `${code.toUpperCase()} — ${res.coupon.desc}` });
        } else {
          setCouponMsg({ ok: false, text: res.error || t("invalidCoupon") });
        }
      })
      .catch(() => {
        const v = localCoupon(code, subtotal);
        if (v.ok) {
          setCouponCode(code.toUpperCase());
          setCouponMsg({ ok: true, text: `${code.toUpperCase()} — ${v.coupon?.desc}` });
        } else {
          setCouponMsg({ ok: false, text: v.error || t("invalidCoupon") });
        }
      });
  };

  const totals = computeTotals(cart, couponCode);

  const placeOrder = async () => {
    setPlacing(true);
    const payload = {
      items: cart.map(l => ({ id: l.productId, qty: l.qty })),
      name: checkoutForm.name,
      phone: checkoutForm.phone,
      address: `${checkoutForm.address}, ${checkoutForm.pincode}`,
      paymentMethod: checkoutForm.payment,
      couponCode,
    };
    try {
      const res = await post({ action: "place-order", ...payload });
      if (!res.order) {
        throw new Error(res.error || "Could not place your order. Please try again.");
      }
      const o = res.order as Order;
      const local: Order = { ...o, items: cart, subtotal: totals.subtotal, discount: totals.discount, shipping: totals.shipping, total: totals.total, couponCode, couponDesc: totals.couponDesc, paymentMethod: checkoutForm.payment, paymentStatus: "pending", placedAt: new Date().toISOString() };
      const next = [local, ...orders];
      setOrders(next);
      setCart([]);
      setCouponCode("");
      setCouponInput("");
      setCartOpen(false);
      setCheckoutOpen(false);
      setPayment(local);
    } catch (err: any) {
      showToast(err?.message || "Could not place your order. Please check your connection and try again.");
    } finally {
      setPlacing(false);
    }
  };

  const renderCard = (p: Product) => {
    const fav = wishlist.includes(p.id);
    return (
      <div key={p.id} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden flex flex-col group">
        <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center cursor-pointer overflow-hidden" onClick={() => openDetails(p.id)}>
          <SafeImage
            src={p.imageUrl}
            alt={p.name}
            resolveType="product"
            entityName={p.name}
            containerClassName="absolute inset-0 w-full h-full"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white z-10">{p.discountPct}% OFF</span>
          <button onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }} className={cn("absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur transition-all z-10", fav ? "bg-rose-500 text-white" : "bg-white/15 text-white hover:bg-white/30")}>
            <Heart size={13} className={fav ? "fill-current" : ""} />
          </button>
        </div>
        <div className="p-3 flex flex-col flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">{hi ? CATEGORY_LABEL[p.category]?.[1] : CATEGORY_LABEL[p.category]?.[0]}</span>
            <span className="text-[10px] text-muted-foreground">{p.brand}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold"><Star size={10} className="fill-amber-400 text-amber-400" /> {p.rating}</span>
          </div>
          <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-2 cursor-pointer" onClick={() => openDetails(p.id)}>{hi ? p.nameHi : p.name}</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">{p.unit} · {(p.sold || 0).toLocaleString()} {t("sold")}</p>
          <div className="flex items-end justify-between mt-auto pt-2">
            <div>
              <p className="font-bold text-primary text-base leading-none">{fmt(p.price)}</p>
              <p className="text-[10px] text-muted-foreground line-through">{fmt(p.mrp)}</p>
            </div>
            <button onClick={() => addToCart(p)} disabled={!p.inStock} className={cn("gradient-hero text-primary-foreground w-8 h-8 rounded-lg flex items-center justify-center hover:brightness-110 active:scale-90 transition-all disabled:opacity-40", addedId === p.id && "animate-cart-pop")}>
              {addedId === p.id ? <Check size={16} /> : <Plus size={16} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-24">
      {toast && (
        <div className="fixed top-16 inset-x-4 z-[90] flex justify-center animate-fade-up pointer-events-none">
          <div className="bg-foreground text-background text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-2xl">{toast}</div>
        </div>
      )}

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><ShoppingCart size={20} /></span>
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">{t("subtitle")}</p>
          </div>
          <button onClick={() => setCartOpen(true)} className="relative w-11 h-11 rounded-2xl bg-card border border-border flex items-center justify-center shadow-card active:scale-95 transition-transform">
            <ShoppingCart size={19} className="text-primary" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{cartCount}</span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: t("products"), value: String(stats.total || products.length), icon: PackageCheck, color: "text-primary" },
            { label: t("offers"), value: String(stats.offers || products.filter(p => p.discountPct > 0).length), icon: Tag, color: "text-rose-500" },
            { label: t("brands"), value: String(stats.brands || new Set(products.map(p => p.brand)).size), icon: BadgeCheck, color: "text-teal-500" },
            { label: t("rating"), value: String(stats.avgRating || 4.6), icon: Star, color: "text-amber-500" },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-2 text-center animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <s.icon size={14} className={`mx-auto ${s.color}`} />
              <p className="font-bold text-sm mt-0.5 truncate">{s.value}</p>
              <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar mt-4 pb-1">
          {banners.map(b => (
            <div key={b.id} className="shrink-0 w-72 rounded-2xl p-4 text-white overflow-hidden relative" style={{ background: `linear-gradient(120deg, ${b.color}, #0f172a)` }}>
              <div className="absolute -right-6 -bottom-6 opacity-20"><Tractor size={120} /></div>
              <p className="font-extrabold text-lg flex items-center gap-1.5"><Sparkles size={15} /> {hi ? b.titleHi : b.title}</p>
              <p className="text-xs opacity-90 mt-0.5">{hi ? b.subHi : b.sub}</p>
              <span className="inline-block mt-2 text-[10px] font-bold px-2 py-1 rounded-full bg-white/20">{t("shopNow")} →</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("searchPlaceholder")} className="w-full h-11 pl-10 pr-3 rounded-2xl bg-card border border-border text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-card" />
          </div>
          <AgriButton variant="outline" size="icon" className="h-11 w-11" onClick={() => setShowFilters(true)} aria-label={t("filters")}><SlidersHorizontal size={17} /></AgriButton>
          <AgriButton variant="outline" size="icon" className={cn("h-11 w-11 relative", showWishlist && "border-rose-400 text-rose-500 bg-rose-500/10")} onClick={() => setShowWishlist(!showWishlist)} title={t("wishlist")}>
            <Heart size={17} className={showWishlist ? "fill-rose-500" : ""} />
            {wishlist.length > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{wishlist.length}</span>}
          </AgriButton>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 mt-1">
          {CATEGORIES.map(c => {
            const active = category === c;
            return (
              <button key={c} onClick={() => setCategory(c)} className={cn("shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95", active ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30" : "bg-card border border-border text-muted-foreground hover:border-primary/40")}>
                {c !== "All" && (() => { const Icon = CATEGORY_ICONS[c]; return <Icon size={13} />; })()}
                {c === "All" ? t("all") : (hi ? CATEGORY_LABEL[c]?.[1] : CATEGORY_LABEL[c]?.[0])}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-foreground text-sm">
            {showWishlist ? `${t("wishlist")} · ` : ""}{visible.length} {t("products")}
          </h2>
          <div className="flex bg-card border border-border rounded-full p-0.5 text-[11px] font-bold">
            {(["shop", "orders"] as const).map(tb => (
              <button key={tb} onClick={() => setTab(tb)} className={cn("px-3 py-1.5 rounded-full transition-colors", tab === tb ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                {tb === "shop" ? t("shop") : t("orders")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "shop" ? (
        loading ? (
          <div className="px-4 grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-muted"></div>
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-5 bg-muted rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 && loadError ? (
          <div className="px-4">
            <AgriCard className="p-8 text-center">
              <WifiOff className="mx-auto text-muted-foreground mb-2" size={28} />
              <p className="font-bold text-foreground">{loadError}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("tryAgain")}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
              >
                <RefreshCw size={14} /> {t("retry")}
              </button>
            </AgriCard>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-4">
            <AgriCard className="p-8 text-center">
              <Search className="mx-auto text-muted-foreground mb-2" size={28} />
              <p className="font-bold text-foreground">{t("noProducts")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("tryFilters")}</p>
            </AgriCard>
          </div>
        ) : (
          <div className="px-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {visible.map(p => renderCard(p))}
          </div>
        )
      ) : (
        <div className="px-4 space-y-3">
          {orders.length === 0 ? (
            <AgriCard className="p-8 text-center">
              <PackageCheck className="mx-auto text-muted-foreground mb-2" size={28} />
              <p className="font-bold text-foreground">{t("noOrders")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("noOrdersHint")}</p>
            </AgriCard>
          ) : (
            orders.map(o => (
              <AgriCard key={o.id} className="p-0 overflow-hidden">
                <div className="p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", o.status === "confirmed" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-500")}><PackageCheck size={17} /></span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">#{o.id.slice(0, 12).toUpperCase()}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(o.placedAt).toLocaleDateString()} · {o.items.length} {t("items")}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary">{fmt(o.total)}</p>
                      <span className={cn("inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1", o.paymentStatus === "paid" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400")}>
                        {o.paymentStatus === "paid" ? t("paid") : t("pendingPay")}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar">
                    {o.items.slice(0, 4).map((it, i) => (
                      <div key={i} className="shrink-0 w-8 h-8 rounded-lg overflow-hidden relative">
                        <SafeImage
                          src={it.imageUrl}
                          alt={it.name}
                          resolveType="product"
                          entityName={it.name}
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {o.items.length > 4 && <span className="shrink-0 w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">+{o.items.length - 4}</span>}
                    <AgriButton size="sm" variant="outline" className="flex-1" onClick={() => { if (o.paymentStatus === "paid") setTracking(o); else { setPayment(o); } }}>
                      {o.paymentStatus === "paid" ? <PackageSearch size={13} /> : <Wallet size={13} />} {o.paymentStatus === "paid" ? t("trackOrder") : t("payNow")}
                    </AgriButton>
                    <AgriButton size="sm" variant="outline" className="flex-1" onClick={() => { const item = o.items[0]; if (item) setReviewFor({ id: item.productId, name: item.name, nameHi: item.nameHi, category: item.category, price: item.price, mrp: item.price, unit: item.unit, brand: "", rating: 5, reviews: 1, sold: 0, stock: 0, offer: "", freeDelivery: false, deliveryDays: "", color: "", inStock: true, discountPct: 0 }); }}>
                      <Star size={13} /> {t("rateItems")}
                    </AgriButton>
                  </div>
                </div>
              </AgriCard>
            ))
          )}
        </div>
      )}

      {/* Filters sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40 animate-fade-up" onClick={() => setShowFilters(false)}></div>
          <div className="absolute bottom-0 inset-x-0 bg-card rounded-t-3xl p-5 pb-8 animate-sheet-up max-h-[70vh] overflow-y-auto" role="dialog" aria-modal="true" aria-label={t("sortBy")}>
            <div className="w-10 h-1.5 bg-muted rounded-full mx-auto mb-4"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2"><SlidersHorizontal size={16} className="text-primary" /> {t("sortBy")}</h3>
              <AgriButton variant="ghost" size="sm" onClick={() => setSort("popular")}>{t("reset")}</AgriButton>
            </div>
            {[["popular", t("mostPopular")], ["price_asc", t("priceLow")], ["price_desc", t("priceHigh")], ["rating", t("topRated")]].map(([v, label]) => (
              <button key={v} onClick={() => { setSort(v); setShowFilters(false); }} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl border mb-2 text-sm font-semibold", sort === v ? "bg-primary/10 border-primary/50 text-foreground" : "bg-card border-border text-muted-foreground")}>
                {label}
                {sort === v && <Check size={15} className="text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product details sheet */}
      {selected && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50 animate-fade-up" onClick={() => setSelected(null)}></div>
          <div className="fixed inset-x-0 bottom-0 z-[65] mx-auto w-full max-w-lg bg-card rounded-t-3xl shadow-2xl animate-sheet-up max-h-[88vh] flex flex-col">
            <div className="p-3.5 pb-0 overflow-y-auto flex-1">
              <div className="relative h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center mb-3">
                <SafeImage
                  src={selected.imageUrl}
                  alt={selected.name}
                  resolveType="product"
                  entityName={selected.name}
                  containerClassName="absolute inset-0 w-full h-full"
                  className="w-full h-full object-cover"
                />
                <button onClick={() => setSelected(null)} className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center z-10"><X size={15} /></button>
                <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white z-10">{selected.discountPct}% OFF</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">{hi ? CATEGORY_LABEL[selected.category]?.[1] : CATEGORY_LABEL[selected.category]?.[0]}</span>
                    <span className="text-[11px] text-muted-foreground">{selected.brand}</span>
                    {selected.inStock ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-live-dot"></span> {t("inStock")}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-500">{t("outOfStock")}</span>
                    )}
                  </div>
                  <h2 className="font-extrabold text-lg text-foreground mt-0.5">{hi ? selected.nameHi : selected.name}</h2>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="inline-flex items-center gap-1"><Stars rating={selected.rating} /> <span className="font-bold">{selected.rating}</span></span>
                    <span className="text-muted-foreground">({selected.reviews} {t("reviews")})</span>
                    <span className="text-muted-foreground">· {(selected.sold || 0).toLocaleString()} {t("sold")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-end gap-2 mt-3">
                <p className="font-extrabold text-2xl text-primary">{fmt(selected.price)}</p>
                <p className="text-sm text-muted-foreground line-through mb-1">{fmt(selected.mrp)}</p>
                <span className="mb-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">{selected.discountPct}% off</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{selected.unit} · {selected.weightKg} kg · {selected.offer}</p>
              {selected.batchNo && (
                <p className="text-[11px] text-muted-foreground mt-0.5">Batch: {selected.batchNo}</p>
              )}

              <div className="mt-3 bg-muted rounded-2xl p-3">
                <p className="text-xs font-semibold text-foreground leading-relaxed">
                  {hi ? (selected.descriptionHi || selected.description) : (selected.description || selected.descriptionHi)}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(selected.tags || []).map((tg, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-card border border-border text-muted-foreground">{tg}</span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-muted rounded-xl p-2"><Truck size={15} className="mx-auto text-primary mb-0.5" /><p className="text-[10px] font-bold">{selected.freeDelivery ? t("freeDelivery") : "₹49 Delivery"}</p><p className="text-[9px] text-muted-foreground">{selected.deliveryDays}</p></div>
                <div className="bg-muted rounded-xl p-2"><ShieldCheck size={15} className="mx-auto text-emerald-600 mb-0.5" /><p className="text-[10px] font-bold">{t("genuine")}</p><p className="text-[9px] text-muted-foreground">100% {t("certified")}</p></div>
                <div className="bg-muted rounded-xl p-2"><RefreshCw size={15} className="mx-auto text-blue-600 mb-0.5" /><p className="text-[10px] font-bold">7 {t("daysReturn")}</p><p className="text-[9px] text-muted-foreground">{t("easyReturns")}</p></div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm flex items-center gap-1.5"><Star size={14} className="text-amber-500 fill-amber-500" /> {t("reviews")}</h3>
                  <button onClick={() => setReviewFor(selected)} className="text-xs font-bold text-primary">{t("writeReview")}</button>
                </div>
                <div className="space-y-2">
                  {detailReviews.map((r, i) => (
                    <div key={i} className="bg-muted rounded-xl p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{r.user}</span>
                        <span className="text-[10px] text-muted-foreground">{r.when}</span>
                      </div>
                      <Stars rating={r.rating} size={11} />
                      {r.comment && <p className="text-xs text-muted-foreground mt-1">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {related.length > 0 && (
                <div className="mt-4 pb-1">
                  <h3 className="font-bold text-sm mb-2">{t("related")}</h3>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar">
                    {related.map(r => (
                      <button key={r.id} onClick={() => openDetails(r.id)} className="shrink-0 w-28 bg-muted rounded-xl p-2 text-left group">
                        <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden relative">
                          <SafeImage
                            src={r.imageUrl}
                            alt={r.name}
                            resolveType="product"
                            entityName={r.name}
                            containerClassName="w-full h-full"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <p className="text-[11px] font-bold text-foreground line-clamp-2 mt-1.5">{hi ? r.nameHi : r.name}</p>
                        <p className="text-[11px] font-bold text-primary mt-0.5">{fmt(r.price)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-3.5 border-t border-border flex gap-2 sticky bottom-0 bg-card rounded-b-3xl">
              <AgriButton variant="outline" className="flex-1" onClick={() => addToCart(selected, detailQty)}><Plus size={15} /> {t("addToCart")}</AgriButton>
              <AgriButton className="flex-[1.4]" disabled={!selected.inStock} onClick={() => addToCart(selected, detailQty, true)}>
                <Zap size={15} /> {t("buyNow")}
              </AgriButton>
            </div>
          </div>
        </>
      )}

      {/* Cart sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-[66]">
          <div className="absolute inset-0 bg-black/40 animate-fade-up" onClick={() => setCartOpen(false)}></div>
          <div className="absolute bottom-0 inset-x-0 bg-card rounded-t-3xl shadow-2xl animate-sheet-up max-h-[85vh] flex flex-col" role="dialog" aria-modal="true" aria-label={t("cart")}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2"><ShoppingCart size={16} className="text-primary" /> {t("cart")} <span className="text-muted-foreground font-normal text-xs">({cartCount})</span></h3>
              <AgriButton variant="ghost" size="icon" onClick={() => setCartOpen(false)}><X size={18} /></AgriButton>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart className="mx-auto text-muted-foreground mb-2" size={32} />
                  <p className="font-bold text-foreground">{t("cartEmpty")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("cartEmptyHint")}</p>
                </div>
              ) : (
                <>
                  {cart.map(l => (
                    <div key={l.productId} className="flex items-center gap-3 bg-muted rounded-xl p-2.5">
                      <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 relative">
                        <SafeImage
                          src={l.imageUrl}
                          alt={l.name}
                          resolveType="product"
                          entityName={l.name}
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{l.name} × {l.qty}</p>
                        <p className="text-[11px] text-muted-foreground">{l.unit}</p>
                        <p className="text-xs font-bold text-primary mt-0.5">{fmt(l.lineTotal)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AgriButton size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(l.productId, -1)}><Minus size={13} /></AgriButton>
                        <span className="font-bold text-xs w-5 text-center">{l.qty}</span>
                        <AgriButton size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(l.productId, 1)}><Plus size={13} /></AgriButton>
                        <AgriButton size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => setCart(prev => prev.filter(x => x.productId !== l.productId))}><Trash2 size={14} /></AgriButton>
                      </div>
                    </div>
                  ))}

                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Gift size={13} className="text-primary" /> {t("applyCoupon")}</p>
                      {couponCode && (
                        <button onClick={() => { setCouponCode(""); setCouponMsg(null); }} className="text-[10px] font-bold text-rose-500">{t("remove")}</button>
                      )}
                    </div>
                    {couponCode ? (
                      <div className="flex items-center gap-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold">
                        <Check size={13} /> {couponCode} · {totals.couponDesc}
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input value={couponInput} onChange={e => setCouponInput(e.target.value)} placeholder="WELCOME10 / KHETI20" className="flex-1 h-9 px-3 rounded-lg bg-card border border-border text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                          <AgriButton size="sm" onClick={applyCoupon}><Tag size={13} /> {t("apply")}</AgriButton>
                        </div>
                        {couponMsg && <p className={cn("text-[11px] font-semibold mt-1.5", couponMsg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500")}>{couponMsg.text}</p>}
                        <div className="flex gap-1.5 flex-wrap mt-2">
                          {coupons.map(c => (
                            <button key={c.code} onClick={() => setCouponInput(c.code)} className="text-[10px] px-2 py-1 rounded-md bg-card border border-border font-bold text-primary">{c.code}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-muted rounded-xl p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground"><span>{t("subtotal")}</span><span>{fmt(totals.subtotal)}</span></div>
                    {totals.discount > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>{t("couponDisc")}</span><span>-{fmt(totals.discount)}</span></div>}
                    <div className="flex justify-between text-muted-foreground"><span>{t("shipping")}</span>{totals.shipping === 0 ? <span className="font-bold text-emerald-600 dark:text-emerald-400">{t("free")}</span> : <span>{fmt(totals.shipping)}</span>}</div>
                    {totals.shipping > 0 && <p className="text-[10px] text-muted-foreground">{t("freeShipHint").replace(/₹\s*$/, "").trim()} {fmt(499 - (totals.subtotal - totals.discount))}</p>}
                    <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground"><span>{t("total")}</span><span className="text-primary">{fmt(totals.total)}</span></div>
                  </div>
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-border">
                {walletBalance > 0 && (
                  <div className="flex items-center gap-2 mb-3 text-[11px] text-primary font-semibold">
                    <Wallet size={13} /> {t("walletBal")}: {fmt(walletBalance)}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground">{t("total")}</p>
                    <p className="font-extrabold text-lg text-primary leading-none">{fmt(totals.total)}</p>
                  </div>
                  <AgriButton className="flex-[1.4]" size="lg" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>
                    {t("checkout")} <ChevronRight size={16} />
                  </AgriButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[66]">
          <div className="absolute inset-0 bg-black/40 animate-fade-up" onClick={() => setCheckoutOpen(false)}></div>
          <div className="absolute bottom-0 inset-x-0 bg-card rounded-t-3xl shadow-2xl animate-sheet-up max-h-[88vh] overflow-y-auto" role="dialog" aria-modal="true" aria-label={t("checkout")}>
            <div className="px-4 py-3 border-b border-border sticky top-0 bg-card flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2"><MapPin size={16} className="text-primary" /> {t("checkout")}</h3>
              <AgriButton variant="ghost" size="icon" onClick={() => setCheckoutOpen(false)}><X size={18} /></AgriButton>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">{t("deliveryAddr")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={checkoutForm.name} onChange={e => { const f = { ...checkoutForm, name: e.target.value }; setCheckoutForm(f); write("agri_user", f); }} placeholder={t("name")} className="h-10 px-3 rounded-xl bg-muted border border-border text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  <input value={checkoutForm.phone} onChange={e => { const f = { ...checkoutForm, phone: e.target.value }; setCheckoutForm(f); write("agri_user", f); }} placeholder={t("phone")} inputMode="numeric" maxLength={10} className="h-10 px-3 rounded-xl bg-muted border border-border text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <input value={checkoutForm.address} onChange={e => { const f = { ...checkoutForm, address: e.target.value }; setCheckoutForm(f); write("agri_user", f); }} placeholder={t("address")} className="w-full h-10 px-3 mt-2 rounded-xl bg-muted border border-border text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input value={checkoutForm.pincode} onChange={e => { const f = { ...checkoutForm, pincode: e.target.value }; setCheckoutForm(f); write("agri_user", f); }} placeholder={t("pincode")} inputMode="numeric" maxLength={6} className="w-full h-10 px-3 mt-2 rounded-xl bg-muted border border-border text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">{t("payMethod")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["upi", "UPI", Smartphone],
                    ["card", "Card", CreditCard],
                    ["netbanking", "Net Banking", Wallet],
                    ["cash", "Cash on delivery", IndianRupee],
                  ] as Array<[string, string, typeof Smartphone]>).map(([id, label, IconC]) => {
                    const Icon = IconC as typeof Smartphone;
                    return (
                      <button key={id} onClick={() => { const f = { ...checkoutForm, payment: id }; setCheckoutForm(f); write("agri_user", f); }} className={cn("flex items-center gap-2 p-3 rounded-xl border text-xs font-bold", checkoutForm.payment === id ? "bg-primary/10 border-primary/50" : "bg-card border-border")}>
                        <Icon size={15} className={checkoutForm.payment === id ? "text-primary" : "text-muted-foreground"} /> {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {walletBalance > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
                  <Wallet size={18} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{t("walletBal")}</p>
                    <p className="text-[11px] text-muted-foreground">{t("walletHint")}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{fmt(walletBalance)}</span>
                </div>
              )}

              <div className="bg-muted rounded-xl p-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>{t("subtotal")}</span><span>{fmt(totals.subtotal)}</span></div>
                {totals.discount > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>{t("couponDisc")}</span><span>-{fmt(totals.discount)}</span></div>}
                <div className="flex justify-between text-muted-foreground"><span>{t("shipping")}</span>{totals.shipping === 0 ? <span className="font-bold text-emerald-600 dark:text-emerald-400">{t("free")}</span> : <span>{fmt(totals.shipping)}</span>}</div>
                <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground"><span>{t("total")}</span><span className="text-primary">{fmt(totals.total)}</span></div>
              </div>

              <AgriButton size="lg" className="w-full" disabled={placing || !checkoutForm.name || !checkoutForm.phone || cart.length === 0} onClick={placeOrder}>
                {placing ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />} {t("placeOrder")} · {fmt(totals.total)}
              </AgriButton>
            </div>
          </div>
        </div>
      )}

      {payment && (
        <PaymentModal order={payment} onClose={() => setPayment(null)} onPaid={() => {
          setOrders(prev => prev.map(o => o.id === payment.id ? { ...o, paymentStatus: "paid", status: "confirmed" } : o));
          const p = payment;
          setPayment(null);
          setTracking({ ...p, paymentStatus: "paid" });
        }} t={t} />
      )}

      {tracking && <TrackingScreen order={tracking} onClose={() => setTracking(null)} t={t} />}

      {reviewFor && <ReviewModal product={reviewFor} onClose={() => setReviewFor(null)} onSubmitted={r => showToast(`${t("thankReview")} ★${r}`)} t={t} />}

      {detailLoading && (
        <div className="fixed inset-0 z-[80] bg-background/80 backdrop-blur flex items-center justify-center">
          <RefreshCw className="animate-spin text-primary" size={30} />
        </div>
      )}

      {detailError && !selected && (
        <div className="fixed inset-0 z-[80] bg-background overflow-y-auto" role="dialog" aria-modal="true" aria-label={t("title")}>
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-2">
            <AgriButton variant="outline" size="icon" onClick={() => setDetailError(null)}><ArrowLeft size={16} /></AgriButton>
            <h2 className="font-bold text-sm">{t("title")}</h2>
          </div>
          <div className="px-4 py-12">
            <AgriCard className="p-8 text-center">
              <WifiOff className="mx-auto text-muted-foreground mb-2" size={28} />
              <p className="font-bold text-foreground">{detailError}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("tryAgain")}</p>
            </AgriCard>
          </div>
        </div>
      )}

      {/* Floating cart FAB — visible when cart has items */}
      {cartCount > 0 && !cartOpen && !checkoutOpen && !selected && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-20 right-4 z-[55] w-14 h-14 rounded-full gradient-hero shadow-xl flex items-center justify-center active:scale-90 transition-transform animate-fade-up"
          aria-label={`${t("cart")} (${cartCount})`}
        >
          <ShoppingCart size={22} className="text-primary-foreground" />
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-background animate-cart-pop">{cartCount}</span>
        </button>
      )}
    </div>
  );
};

const STRINGS: Record<string, [string, string]> = {
  title: ["Krishi Store", "कृषि स्टोर"],
  subtitle: ["Premium agri inputs, delivered to your farm", "प्रीमियम कृषि सामग्री, आपके खेत तक"],
  products: ["Products", "उत्पाद"],
  offers: ["Offers", "ऑफ़र"],
  brands: ["Brands", "ब्रांड"],
  rating: ["Rating", "रेटिंग"],
  shopNow: ["Shop now", "अभी खरीदें"],
  searchPlaceholder: ["Search seeds, fertilizers, tools...", "बीज, खाद, उपकरण खोजें..."],
  all: ["All", "सभी"],
  wishlist: ["Wishlist", "पसंदीदा"],
  shop: ["Shop", "खरीदारी"],
  orders: ["Orders", "ऑर्डर"],
  sold: ["sold", "बिके"],
  noProducts: ["No products found", "कोई उत्पाद नहीं मिला"],
  tryFilters: ["Try changing search or filters", "खोज या फ़िल्टर बदलें"],
  catalogLoadFailed: ["Could not load the store", "स्टोर लोड नहीं हो सका"],
  tryAgain: ["Check your connection and retry.", "अपना इंटरनेट जाँचकर पुनः प्रयास करें।"],
  retry: ["Retry", "पुनः प्रयास"],
  filters: ["Filters", "फ़िल्टर"],
  noOrders: ["No orders yet", "अभी कोई ऑर्डर नहीं"],
  noOrdersHint: ["Your orders will appear here", "आपके ऑर्डर यहाँ दिखेंगे"],
  sortBy: ["Sort by", "क्रमबद्ध करें"],
  reset: ["Reset", "रीसेट"],
  mostPopular: ["Most popular", "सबसे लोकप्रिय"],
  priceLow: ["Price: Low to High", "कम कीमत"],
  priceHigh: ["Price: High to Low", "अधिक कीमत"],
  topRated: ["Top rated", "टॉप रेटेड"],
  inStock: ["In stock", "स्टॉक में"],
  outOfStock: ["Out of stock", "स्टॉक खत्म"],
  reviews: ["reviews", "समीक्षाएं"],
  delivery: ["Delivery", "डिलीवरी"],
  warranty: ["Quality", "गुणवत्ता"],
  genuine: ["100% genuine", "100% प्रामाणिक"],
  na: ["—", "—"],
  qty: ["Qty", "मात्रा"],
  related: ["Related products", "संबंधित उत्पाद"],
  addToCart: ["Add to Cart", "कार्ट में जोड़ें"],
  buyNow: ["Buy Now", "अभी खरीदें"],
  addedToCart: ["added to cart", "कार्ट में जोड़ा गया"],
  cart: ["Cart", "कार्ट"],
  cartEmpty: ["Your cart is empty", "आपकी कार्ट खाली है"],
  cartEmptyHint: ["Add products to get started", "शुरू करने के लिए उत्पाद जोड़ें"],
  applyCoupon: ["Apply coupon", "कूपन लगाएं"],
  apply: ["Apply", "लगाएं"],
  remove: ["Remove", "हटाएं"],
  enterCoupon: ["Enter a coupon code", "कूपन कोड दर्ज करें"],
  invalidCoupon: ["Invalid coupon code", "अमान्य कूपन कोड"],
  subtotal: ["Subtotal", "उप-योग"],
  couponDisc: ["Coupon discount", "कूपन छूट"],
  shipping: ["Shipping", "शिपिंग"],
  free: ["FREE", "मुफ्त"],
  freeShipHint: ["Add ₹", "जोड़ें ₹"],
  total: ["Total", "कुल"],
  checkout: ["Checkout", "चेकआउट"],
  deliveryAddr: ["Delivery address", "डिलीवरी पता"],
  name: ["Full name", "पूरा नाम"],
  phone: ["Phone", "फोन"],
  address: ["Village / street address", "गांव / सड़क पता"],
  pincode: ["PIN code", "पिन कोड"],
  payMethod: ["Payment method", "भुगतान विधि"],
  placeOrder: ["Place Order", "ऑर्डर करें"],
  payment: ["Payment", "भुगतान"],
  amountDue: ["Amount due", "कुल राशि"],
  processing: ["Processing payment...", "भुगतान हो रहा है..."],
  pay: ["Pay", "भुगतान करें"],
  secure: ["256-bit secure payments", "256-बिट सुरक्षित भुगतान"],
  secureLive: ["Powered by Razorpay · 256-bit secure", "Razorpay द्वारा संचालित · 256-बिट सुरक्षित"],
  payFailed: ["Payment failed. Please try again.", "भुगतान असफल। कृपया पुनः प्रयास करें।"],
  walletBal: ["Wallet Balance", "वॉलेट बैलेंस"],
  walletHint: ["Pay from wallet to save on fees", "वॉलेट से भुगतान करें"],
  paySuccess: ["Payment Successful!", "भुगतान सफल!"],
  paidVia: ["paid via", "से भुगतान"],
  trackOrder: ["Track Order", "ऑर्डर ट्रैक करें"],
  done: ["Done", "हो गया"],
  deliveryTrack: ["Delivery Tracking", "डिलीवरी ट्रैकिंग"],
  courier: ["Courier", "कूरियर"],
  trackNo: ["Tracking no", "ट्रैकिंग नंबर"],
  eta: ["ETA", "अनुमान"],
  completed: ["completed", "पूरा"],
  orderItems: ["Order items", "ऑर्डर आइटम"],
  supportMsg: ["Support: Call 1800-180-1551 for any delivery issue. Cashback on UPI orders.", "सहायता: कॉल 1800-180-1551। UPI ऑर्डर पर कैशबैक।"],
  items: ["items", "आइटम"],
  paid: ["Paid", "भुगतान किया"],
  pendingPay: ["Pay pending", "भुगतान बाकी"],
  payNow: ["Pay Now", "अभी भुगतान करें"],
  rateItems: ["Rate", "रेट करें"],
  thankReview: ["Thank you!", "धन्यवाद!"],
  reviewAdded: ["Your review has been added", "आपकी समीक्षा जोड़ दी गई"],
  rate: ["Rate", "रेट करें"],
  shareExp: ["Share your experience", "अपना अनुभव साझा करें"],
  writeReview: ["Write a review...", "समीक्षा लिखें..."],
  submit: ["Submit", "जमा करें"],
  cancel: ["Cancel", "रद्द करें"],
};

export default AgriStore;
