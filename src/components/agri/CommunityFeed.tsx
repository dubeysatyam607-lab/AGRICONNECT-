import React, { useMemo, useState } from "react";
import {
  Users,
  Search,
  ThumbsUp,
  MessageCircle,
  Share2,
  BadgeCheck,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  Flame,
  ShieldCheck,
  Send,
  Check,
  Sparkles,
  HelpCircle,
  Leaf,
} from "lucide-react";
import { COMMUNITY_GROUPS, COMMUNITY_TOPICS, COMMUNITY_POSTS, type CommunityPost } from "@/lib/mock-data";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFarm, COMMON_CROPS } from "@/contexts/FarmContext";
import { useAuth } from "@/hooks/useAuth";
import LazyImage from "@/components/ui/lazy-image";
import { cn } from "@/lib/utils";

interface CommunityFeedProps {
  onToast: (message: string) => void;
}

type FeedFilter = "forYou" | "questions" | "cropCare" | "helpNeeded";

const MACHINERY_TAGS = new Set(["Machinery", "Transport", "Irrigation"]);

const CommunityFeed: React.FC<CommunityFeedProps> = ({ onToast }) => {
  const { t } = useLanguage();
  const { profile } = useFarm();
  const { user } = useAuth();

  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    try {
      const saved = localStorage.getItem("agri_community_posts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return COMMUNITY_POSTS;
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FeedFilter>("forYou");
  const [cropFilter, setCropFilter] = useState<string | null>(null);
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [helpful, setHelpful] = useState<Record<number, boolean>>({});
  const [expandedReply, setExpandedReply] = useState<Record<number, boolean>>({});
  const [joined, setJoined] = useState<Record<number, boolean>>({});
  const [groupCat, setGroupCat] = useState<string | null>(null);
  const [composerText, setComposerText] = useState("");
  const [composerCrop, setComposerCrop] = useState<string>(profile.crop);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || (t('home.guestName'));
  const village = user?.user_metadata?.village || (t('home.guestVillage'));
  const firstName = userName.split(" ")[0];

  const experts = useMemo(
    () =>
      Array.from(new Set(posts.filter((p) => p.verified).map((p) => p.user))).slice(0, 4),
    [posts]
  );

  const cropChips = useMemo(() => {
    const chips = [profile.crop, ...COMMON_CROPS.filter((c) => c !== profile.crop)];
    return chips.slice(0, 7);
  }, [profile.crop]);

  const groupCategories = useMemo(
    () => Array.from(new Set(COMMUNITY_GROUPS.map((g) => g.category))),
    []
  );

  const visibleGroups = useMemo(
    () => (groupCat ? COMMUNITY_GROUPS.filter((g) => g.category === groupCat) : COMMUNITY_GROUPS),
    [groupCat]
  );

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = posts.filter((p) => {
      if (q) {
        const hay = `${p.content} ${p.crop} ${p.user} ${p.region}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (cropFilter && p.crop !== cropFilter) return false;
      switch (filter) {
        case "questions":
          return p.helpWanted || p.content.includes("?");
        case "cropCare":
          return !MACHINERY_TAGS.has(p.crop);
        case "helpNeeded":
          return p.helpWanted;
        default:
          return true;
      }
    });
    list = [...list].sort((a, b) => {
      if (filter === "forYou" && cropFilter === profile.crop) {
        const aMatch = a.crop === profile.crop ? 1 : 0;
        const bMatch = b.crop === profile.crop ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
      }
      return b.trend - a.trend;
    });
    return list;
  }, [posts, search, filter, cropFilter, profile.crop]);

  const handlePost = () => {
    const text = composerText.trim();
    if (!text) {
      onToast("Type your question first");
      return;
    }
    const newPost: CommunityPost = {
      id: Date.now(),
      user: userName,
      role: "Farmer",
      time: "Just now",
      content: text,
      likes: 0,
      comments: 0,
      image: null,
      crop: composerCrop,
      region: village,
      trend: 0,
      helpWanted: text.includes("?"),
      expertReply: null,
    };
    setPosts((prev) => {
      const updated = [newPost, ...prev];
      try {
        localStorage.setItem("agri_community_posts", JSON.stringify(updated.slice(0, 50)));
      } catch {
        // storage quota fallback
      }
      return updated;
    });
    setComposerText("");
    onToast(`${firstName} ${t("community.posted")}`);
  };

  const handleLike = (id: number) => {
    setLiked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) onToast("Thanks — this helps fellow farmers see it");
      return next;
    });
  };

  const handleHelpful = (id: number) => {
    setHelpful((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShare = () => {
    onToast(t("community.shared"));
  };

  const toggleJoin = (id: number, name: string) => {
    setJoined((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      onToast(next[id] ? `Joined ${name}` : `Left ${name}`);
      return next;
    });
  };

  const toggleCropChip = (crop: string) => {
    setCropFilter((prev) => (prev === crop ? null : crop));
  };

  const filterChips: { key: FeedFilter; label: string }[] = [
    { key: "forYou", label: t("community.forYou") },
    { key: "questions", label: t("community.questions") },
    { key: "cropCare", label: t("community.cropCare") },
    { key: "helpNeeded", label: t("community.helpNeeded") },
  ];

  return (
    <div className="pb-28 pt-4 animate-fade-in">
      {/* ── Hero band ───────────────────────────────────── */}
      <header className="relative mx-4 overflow-hidden rounded-[28px] gradient-community p-5 text-white shadow-colorful">
        <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10 blur-2xl animate-drift-soft" />
        <div className="absolute -left-8 -bottom-16 h-40 w-40 rounded-full bg-white/5 blur-xl animate-drift-soft" style={{ animationDelay: "1.2s" }} />
        <span className="absolute bottom-2 right-5 text-4xl opacity-15 select-none" aria-hidden="true">🌾</span>

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md">
            <Users size={22} />
          </span>
          <div>
            <h2 className="font-display text-[22px] font-bold leading-tight tracking-tight">{t("community.title")}</h2>
            <p className="text-[12px] font-semibold text-white/75">{t("community.subtitle")}</p>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          <span className="feature-chip bg-white/15 text-white"><Users size={12} /> {COMMUNITY_GROUPS.length * 10}+ {t("community.statsFarmers")}</span>
          <span className="feature-chip bg-white/15 text-white"><Leaf size={12} /> {COMMUNITY_GROUPS.length} {t("community.statsGroups")}</span>
          <span className="feature-chip bg-white/15 text-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 animate-ping opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            {experts.length} {t("community.statsOnline")}
          </span>
        </div>

        <div className="relative mt-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/70" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("community.search")}
              className="w-full rounded-2xl border border-white/20 bg-white/12 py-2.5 pl-10 pr-4 text-[14px] font-medium text-white placeholder:text-white/60 outline-none backdrop-blur-md focus:border-white/40 focus:bg-white/18 transition-colors"
            />
          </div>
        </div>
      </header>

      {/* ── Composer ────────────────────────────────────── */}
      <section className="mx-4 mt-4 rounded-[24px] border border-border bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-display font-bold text-foreground">
            {firstName.charAt(0).toUpperCase()}
          </span>
          <div className="flex-1">
            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              rows={2}
              placeholder={t("community.composerPlaceholder")}
              className="w-full resize-none rounded-2xl border border-border bg-background/60 px-3.5 py-2.5 text-[14px] font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-feature-community/60 focus:ring-2 focus:ring-feature-community/15 transition"
            />
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground mr-1">
                <Sparkles size={12} className="text-feature-community" /> Crop:
              </span>
              {cropChips.map((crop) => (
                <button
                  key={crop}
                  onClick={() => setComposerCrop(crop)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
                    composerCrop === crop
                      ? "bg-feature-community text-white shadow-colorful"
                      : "border border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {crop}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={handlePost}
            disabled={!composerText.trim()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-feature-community px-4 py-2 text-[13px] font-bold text-white shadow-colorful active:scale-95",
              composerText.trim() ? "hover-lift" : "cursor-not-allowed opacity-40"
            )}
          >
            <Send size={14} /> {t("community.askCommunity")}
          </button>
        </div>
      </section>

      {/* ── Trending topics ─────────────────────────────── */}
      <section className="mt-5">
        <div className="flex items-end justify-between px-4 mb-2">
          <h3 className="font-display font-semibold text-[17px] tracking-tight text-foreground flex items-center gap-1.5">
            <Flame size={16} className="text-feature-tractor" /> {t("community.trending")}
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{t('agr190')}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
          {COMMUNITY_TOPICS.map((topic) => (
            <button
              key={topic.tag}
              onClick={() => setSearch(topic.tag.slice(1))}
              className="group flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 shadow-card transition-transform hover-lift active:scale-95"
            >
              <span className="text-[12px] font-bold text-feature-community">{topic.tag}</span>
              <span className="text-[11px] font-semibold text-muted-foreground">{topic.posts.toLocaleString()} posts</span>
              <span className={cn("flex items-center gap-0.5 text-[10px] font-black", topic.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                {topic.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Top experts ─────────────────────────────────── */}
      {experts.length > 0 && (
        <section className="mt-5">
          <div className="flex items-end justify-between px-4 mb-2">
            <h3 className="font-display font-semibold text-[17px] tracking-tight text-foreground flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-feature-ai" /> {t("community.experts")}
            </h3>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
            {experts.map((name) => (
              <button
                key={name}
                onClick={() => onToast(`Asked ${name} — experts usually reply within hours`)}
                className="flex shrink-0 flex-col items-center gap-1.5 rounded-[20px] border border-border bg-card px-4 py-3 shadow-card transition-transform hover-lift active:scale-95"
              >
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-feature-community to-feature-news font-display font-bold text-white">
                  {name.charAt(0)}
                  <BadgeCheck size={15} className="absolute -bottom-0.5 -right-0.5 rounded-full bg-card text-emerald-600 dark:text-emerald-400" />
                </span>
                <span className="text-[11px] font-bold text-foreground">{name.split(" ")[0]}</span>
                <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">{t("community.verifiedExpert")}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Feed ────────────────────────────────────────── */}
      <section className="mt-5">
        <div className="flex items-end justify-between px-4 mb-3">
          <h3 className="font-display font-semibold text-[17px] tracking-tight text-foreground">{t("community.posts")}</h3>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
                filter === chip.key
                  ? "bg-feature-community text-white shadow-colorful"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {chip.label}
            </button>
          ))}
          <button
            onClick={() => toggleCropChip(profile.crop)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
              cropFilter === profile.crop
                ? "bg-emerald-600 text-white shadow-colorful"
                : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            )}
          >
            <Leaf size={12} /> {profile.crop}
            {cropFilter === profile.crop && <Check size={12} />}
          </button>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="mx-4 flex flex-col items-center gap-2 rounded-[24px] border border-dashed border-border bg-card/60 px-6 py-12 text-center">
            <HelpCircle size={30} className="text-muted-foreground/50" />
            <p className="text-[14px] font-bold text-foreground">{t('agr191')}</p>
            <p className="text-[12px] text-muted-foreground">{t('agr192')}</p>
            <button
              onClick={() => { setSearch(""); setFilter("forYou"); setCropFilter(null); }}
              className="mt-1 rounded-full bg-feature-community px-4 py-2 text-[12px] font-bold text-white shadow-colorful hover-lift active:scale-95"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-3 px-4">
            {filteredPosts.map((post) => {
              const isExpert = !!post.verified;
              const reply = post.expertReply;
              const isLiked = !!liked[post.id];
              const isHelpful = !!helpful[post.id];
              const showReply = !!expandedReply[post.id];
              const likeCount = post.likes + (isLiked ? 1 : 0);
              return (
                <article
                  key={post.id}
                  className="animate-fade-up rounded-[24px] border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-soft"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display font-bold text-white",
                        isExpert ? "bg-gradient-to-br from-feature-community to-feature-news" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {post.user.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="truncate text-[14px] font-bold text-foreground">{post.user}</h4>
                        {isExpert && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                            <BadgeCheck size={10} /> {t("community.verifiedExpert")}
                          </span>
                        )}
                      </div>
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        <span>{post.role}</span>
                        <span>·</span>
                        <MapPin size={10} /> {post.region}
                        <span>·</span>
                        <Clock size={10} /> {post.time}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted/70 px-2.5 py-1 text-[10px] font-black text-feature-community">
                      {post.crop}
                    </span>
                  </div>

                  <p className="mt-3 text-[14px] leading-relaxed text-foreground">{post.content}</p>

                  {post.image && (
                    <div className="mt-3 flex h-36 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-muted-foreground">
                      <Leaf size={22} className="text-emerald-600/70" />
                      <span className="text-[12px] font-bold">{post.image.replace("_", " ")}</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-1 border-t border-border pt-3">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors",
                        isLiked ? "bg-feature-community/12 text-feature-community" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <ThumbsUp size={15} className={isLiked ? "fill-current" : ""} /> {likeCount}
                    </button>
                    <button
                      onClick={() => handleHelpful(post.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors",
                        isHelpful ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Sparkles size={14} /> {t("community.helpful")}
                    </button>
                    <button
                      onClick={() => onToast(`${post.comments} ${t("community.comment")} — replies coming soon`)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <MessageCircle size={15} /> {post.comments}
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Share2 size={15} /> {t("community.share")}
                    </button>
                  </div>

                  {reply ? (
                    <div className="mt-3">
                      {!showReply ? (
                        <button
                          onClick={() => setExpandedReply((prev) => ({ ...prev, [post.id]: true }))}
                          className="flex w-full items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-left transition-colors hover:bg-primary/10"
                        >
                          <ShieldCheck size={15} className="shrink-0 text-primary" />
                          <span className="flex-1 text-[12px] font-bold text-primary">{t("community.viewReply")}</span>
                          <span className="text-[11px] font-semibold text-muted-foreground">· {reply.user}</span>
                        </button>
                      ) : (
                        <div className="animate-slide-up rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck size={14} className="text-primary" />
                              <span className="text-[11px] font-black text-primary">{t("community.expertReply")}</span>
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary">{reply.user}</span>
                            </div>
                            <button
                              onClick={() => setExpandedReply((prev) => ({ ...prev, [post.id]: false }))}
                              className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {t("community.hideReply")}
                            </button>
                          </div>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">{reply.content}</p>
                        </div>
                      )}
                    </div>
                  ) : post.helpWanted ? (
                    <p className="mt-3 flex items-center gap-1.5 rounded-2xl bg-muted/60 px-3.5 py-2 text-[11px] font-bold text-muted-foreground">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 animate-ping opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                      Awaiting expert reply
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Groups ──────────────────────────────────────── */}
      <section className="mt-7">
        <div className="flex items-end justify-between px-4 mb-3">
          <h3 className="font-display font-semibold text-[17px] tracking-tight text-foreground flex items-center gap-1.5">
            <Users size={16} className="text-feature-community" /> {t("community.groups")}
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{t('agr190')}</span>
            <button
              onClick={() => onToast("All groups coming to the hub soon")}
              className="flex shrink-0 items-center gap-1 text-[12px] font-bold text-forest dark:text-emerald-400"
            >
              {t("community.seeAllGroups")} <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
          <button
            onClick={() => setGroupCat(null)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
              !groupCat ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {groupCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setGroupCat(groupCat === cat ? null : cat)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
                groupCat === cat ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 pb-2">
          {visibleGroups.map((group) => {
            const isJoined = !!joined[group.id];
            return (
              <article
                key={group.id}
                className="w-[240px] shrink-0 snap-center overflow-hidden rounded-[24px] border border-border bg-card shadow-card"
              >
                <div className="relative h-28 w-full">
                  <LazyImage
                    src={group.image}
                    alt={group.name}
                    className="h-28 w-full"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-feature-community/30 to-feature-mandi/30 text-muted-foreground">
                        {group.name.charAt(0)}
                      </div>
                    }
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <span className="absolute left-2.5 top-2.5 feature-chip bg-white/15 text-white backdrop-blur-md">{group.category}</span>
                  <span className="absolute right-2.5 top-2.5 flex items-center gap-1 feature-chip bg-black/45 text-white backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-live-pulse" />
                    {group.online.toLocaleString()}
                  </span>
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between">
                    <div>
                      <h4 className="font-display text-[15px] font-bold leading-tight text-white">{group.name}</h4>
                      <p className="text-[10px] font-semibold text-white/70 mt-0.5">
                        {group.members.toLocaleString()} {t("community.members")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">{group.description}</p>
                  <button
                    onClick={() => toggleJoin(group.id, group.name)}
                    className={cn(
                      "mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold transition-colors",
                      isJoined
                        ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                        : "bg-feature-community text-white shadow-colorful hover-lift active:scale-95"
                    )}
                  >
                    {isJoined ? <><Check size={13} /> {t("community.joined")}</> : <>{t("community.join")}</>}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default CommunityFeed;
