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
    <div className="pb-28 pt-4">
      {/* ── Hero band ───────────────────────────────────── */}
      <header className="relative mx-4 overflow-hidden rounded-xl bg-card border border-border p-5">
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 className="type-h2 leading-tight">{t("community.title")}</h2>
            <p className="type-small text-muted-foreground">{t("community.subtitle")}</p>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded bg-muted px-2.5 py-1 type-meta font-semibold text-foreground"><Users size={12} aria-hidden="true" /> {COMMUNITY_GROUPS.length * 10}+ {t("community.statsFarmers")}</span>
          <span className="flex items-center gap-1.5 rounded bg-muted px-2.5 py-1 type-meta font-semibold text-foreground"><Leaf size={12} aria-hidden="true" /> {COMMUNITY_GROUPS.length} {t("community.statsGroups")}</span>
          <span className="flex items-center gap-1.5 rounded bg-muted px-2.5 py-1 type-meta font-semibold text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary animate-ping opacity-75" aria-hidden="true" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            </span>
            {experts.length} {t("community.statsOnline")}
          </span>
        </div>

        <div className="relative mt-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("community.search")}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 type-small text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-colors"
            />
          </div>
        </div>
      </header>

      {/* ── Composer ────────────────────────────────────── */}
      <section className="mx-4 mt-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted  font-semibold text-foreground">
            {firstName.charAt(0).toUpperCase()}
          </span>
          <div className="flex-1">
            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              rows={2}
              placeholder={t("community.composerPlaceholder")}
              className="w-full resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 type-body font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition"
            />
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mr-1">
                <Sparkles size={12} className="text-primary" /> Crop:
              </span>
              {cropChips.map((crop) => (
                <button
                  key={crop}
                  onClick={() => setComposerCrop(crop)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                    composerCrop === crop
                      ? "bg-primary text-white "
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
              "inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 type-small font-semibold text-white  ",
              composerText.trim() ? "" : "cursor-not-allowed opacity-40"
            )}
          >
            <Send size={14} /> {t("community.askCommunity")}
          </button>
        </div>
      </section>

      {/* ── Trending topics ─────────────────────────────── */}
      <section className="mt-5">
        <div className="flex items-end justify-between px-4 mb-2">
          <h3 className=" font-semibold type-h3 tracking-tight text-foreground flex items-center gap-1.5">
            <Flame size={16} className="text-feature-tractor" /> {t("community.trending")}
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{t('agr190')}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
          {COMMUNITY_TOPICS.map((topic) => (
            <button
              key={topic.tag}
              onClick={() => setSearch(topic.tag.slice(1))}
              className="group flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 shadow-card transition-transform  "
            >
              <span className="type-meta font-semibold text-primary">{topic.tag}</span>
              <span className="text-xs font-semibold text-muted-foreground">{topic.posts.toLocaleString()} posts</span>
              <span className={cn("flex items-center gap-0.5 text-xs font-semibold", topic.up ? "text-primary" : "text-red-500")}>
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
            <h3 className=" font-semibold type-h3 tracking-tight text-foreground flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-feature-ai" /> {t("community.experts")}
            </h3>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
            {experts.map((name) => (
              <button
                key={name}
                onClick={() => onToast(`Asked ${name} — experts usually reply within hours`)}
                className="flex shrink-0 flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-3 shadow-card transition-transform  "
              >
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary  font-semibold text-white">
                  {name.charAt(0)}
                  <BadgeCheck size={15} className="absolute -bottom-0.5 -right-0.5 rounded-full bg-card text-primary" />
                </span>
                <span className="text-xs font-semibold text-foreground">{name.split(" ")[0]}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">{t("community.verifiedExpert")}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Feed ────────────────────────────────────────── */}
      <section className="mt-5">
        <div className="flex items-end justify-between px-4 mb-3">
          <h3 className=" font-semibold type-h3 tracking-tight text-foreground">{t("community.posts")}</h3>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 type-meta font-semibold transition-colors",
                filter === chip.key
                  ? "bg-primary text-white "
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {chip.label}
            </button>
          ))}
          <button
            onClick={() => toggleCropChip(profile.crop)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 type-meta font-semibold transition-colors",
              cropFilter === profile.crop
                ? "bg-primary text-white "
                : "border border-primary/25 bg-primary/10 text-primary"
            )}
          >
            <Leaf size={12} /> {profile.crop}
            {cropFilter === profile.crop && <Check size={12} />}
          </button>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="mx-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <HelpCircle size={30} className="text-muted-foreground/50" />
            <p className="type-body font-semibold text-foreground">{t('agr191')}</p>
            <p className="type-meta text-muted-foreground">{t('agr192')}</p>
            <button
              onClick={() => { setSearch(""); setFilter("forYou"); setCropFilter(null); }}
              className="mt-1 rounded-full bg-primary px-4 py-2 type-meta font-semibold text-white   "
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
                  className="rounded-xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-soft"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full  font-semibold text-white",
                        isExpert ? "bg-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {post.user.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="truncate type-body font-semibold text-foreground">{post.user}</h4>
                        {isExpert && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                            <BadgeCheck size={10} /> {t("community.verifiedExpert")}
                          </span>
                        )}
                      </div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <span>{post.role}</span>
                        <span>·</span>
                        <MapPin size={10} /> {post.region}
                        <span>·</span>
                        <Clock size={10} /> {post.time}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted/70 px-2.5 py-1 text-xs font-semibold text-primary">
                      {post.crop}
                    </span>
                  </div>

                  <p className="mt-3 type-body leading-relaxed text-foreground">{post.content}</p>

                  {post.image && (
                    <div className="mt-3 flex h-36 items-center justify-center gap-2 overflow-hidden rounded-xl bg-muted text-muted-foreground">
                      <Leaf size={22} className="text-primary/70" />
                      <span className="type-meta font-semibold">{post.image.replace("_", " ")}</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-1 border-t border-border pt-3">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 type-meta font-semibold transition-colors",
                        isLiked ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <ThumbsUp size={15} className={isLiked ? "fill-current" : ""} /> {likeCount}
                    </button>
                    <button
                      onClick={() => handleHelpful(post.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 type-meta font-semibold transition-colors",
                        isHelpful ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Sparkles size={14} /> {t("community.helpful")}
                    </button>
                    <button
                      onClick={() => onToast(`${post.comments} ${t("community.comment")} — replies coming soon`)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 type-meta font-semibold text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <MessageCircle size={15} /> {post.comments}
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 type-meta font-semibold text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Share2 size={15} /> {t("community.share")}
                    </button>
                  </div>

                  {reply ? (
                    <div className="mt-3">
                      {!showReply ? (
                        <button
                          onClick={() => setExpandedReply((prev) => ({ ...prev, [post.id]: true }))}
                          className="flex w-full items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-left transition-colors hover:bg-primary/10"
                        >
                          <ShieldCheck size={15} className="shrink-0 text-primary" />
                          <span className="flex-1 type-meta font-semibold text-primary">{t("community.viewReply")}</span>
                          <span className="text-xs font-semibold text-muted-foreground">· {reply.user}</span>
                        </button>
                      ) : (
                        <div className=" rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck size={14} className="text-primary" />
                              <span className="text-xs font-semibold text-primary">{t("community.expertReply")}</span>
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">{reply.user}</span>
                            </div>
                            <button
                              onClick={() => setExpandedReply((prev) => ({ ...prev, [post.id]: false }))}
                              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {t("community.hideReply")}
                            </button>
                          </div>
                          <p className="mt-1.5 type-small leading-relaxed text-foreground">{reply.content}</p>
                        </div>
                      )}
                    </div>
                  ) : post.helpWanted ? (
                    <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-muted/60 px-3.5 py-2 text-xs font-semibold text-muted-foreground">
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
          <h3 className=" font-semibold type-h3 tracking-tight text-foreground flex items-center gap-1.5">
            <Users size={16} className="text-primary" /> {t("community.groups")}
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{t('agr190')}</span>
            <button
              onClick={() => onToast("All groups coming to the hub soon")}
              className="flex shrink-0 items-center gap-1 type-meta font-semibold text-forest dark:text-primary-foreground/80"
            >
              {t("community.seeAllGroups")} <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
          <button
            onClick={() => setGroupCat(null)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 type-meta font-semibold transition-colors",
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
                "shrink-0 rounded-full px-3.5 py-1.5 type-meta font-semibold transition-colors",
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
                className="w-[240px] shrink-0 snap-center overflow-hidden rounded-xl border border-border bg-card shadow-card"
              >
                <div className="relative h-28 w-full">
                  <LazyImage
                    src={group.image}
                    alt={group.name}
                    className="h-28 w-full"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                        {group.name.charAt(0)}
                      </div>
                    }
                  />
                  <div className="absolute inset-0 bg-emerald-700" />
                  <span className="absolute left-2.5 top-2.5 feature-chip bg-white/15 text-white ">{group.category}</span>
                  <span className="absolute right-2.5 top-2.5 flex items-center gap-1 feature-chip bg-black/45 text-white ">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 " />
                    {group.online.toLocaleString()}
                  </span>
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between">
                    <div>
                      <h4 className=" type-body font-semibold leading-tight text-white">{group.name}</h4>
                      <p className="text-xs font-semibold text-white/70 mt-0.5">
                        {group.members.toLocaleString()} {t("community.members")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 type-meta leading-snug text-muted-foreground">{group.description}</p>
                  <button
                    onClick={() => toggleJoin(group.id, group.name)}
                    className={cn(
                      "mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full py-2 type-meta font-semibold transition-colors",
                      isJoined
                        ? "bg-primary/10 text-primary"
                        : "bg-primary text-white   "
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
