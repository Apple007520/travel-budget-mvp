"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  attractionTicketBadgeText,
  attractionTicketFootnote,
  CITY_DATA,
  type Attraction,
} from "@/data/mockCities";
import {
  CHINA_CITY_NAMES,
  isChinaCityName,
  normalizeChinaCityName,
} from "@/data/chinaCityNames";
import { SharePoster } from "@/components/SharePoster";
import {
  downloadPngBlob,
  posterNodeToPngBlob,
  waitForStablePoster,
} from "@/lib/sharePosterExport";

const LODGING_PER_NIGHT = 300;
const DEFAULT_PUBLIC_APP_URL = "https://travelbudget-demo.vercel.app";

const DEFAULT_BUDGET_IDS = {
  lodging: "lodging",
  transport: "transport",
  food: "food",
  entertainment: "entertainment",
} as const;

/** 分享弹窗：与海报一致的简约线稿图标 */
function ShareDialogIconMap({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 9.5 9 6l6 3.5L21 6v11l-6 3.5-6-3.5-6 3.5V9.5z" />
      <path d="M9 6v11M15 9.5V20.5" />
    </svg>
  );
}

function ShareDialogIconClose({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ShareDialogIconImage({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.75" />
      <path d="m21 15-5-5-4 4-2-2-4 4" />
    </svg>
  );
}

type BudgetLine = {
  id: string;
  name: string;
  amount: number;
  removable: boolean;
};

type CustomItineraryItem = {
  id: string;
  name: string;
  fee: number;
};

type PlannerSnapshot = {
  city: string;
  people: number;
  days: number;
  draftReady: boolean;
  /** 不在中国地级行政区名单内 */
  invalidDestination: boolean;
  /** 城市有效但暂无内置景点数据 */
  noBuiltinAttractions: boolean;
  attractions: Attraction[];
  itinerary: Attraction[];
  budgetLines: BudgetLine[];
  customItineraryItems: CustomItineraryItem[];
};

const HOT_CITIES = ["北京", "上海", "成都", "西安", "三亚"] as const;

function createDefaultBudgetLines(): BudgetLine[] {
  return [
    {
      id: DEFAULT_BUDGET_IDS.lodging,
      name: "住宿",
      amount: 0,
      removable: false,
    },
    {
      id: DEFAULT_BUDGET_IDS.transport,
      name: "交通",
      amount: 0,
      removable: false,
    },
    {
      id: DEFAULT_BUDGET_IDS.food,
      name: "餐饮",
      amount: 0,
      removable: false,
    },
    {
      id: DEFAULT_BUDGET_IDS.entertainment,
      name: "景点门票",
      amount: 0,
      removable: false,
    },
  ];
}

function cloneBudgetLines(lines: BudgetLine[]): BudgetLine[] {
  return lines.map((l) => ({ ...l }));
}

function cloneAttractions(list: Attraction[]): Attraction[] {
  return list.map((a) => ({ ...a }));
}

function cloneCustomItems(items: CustomItineraryItem[]): CustomItineraryItem[] {
  return items.map((i) => ({ ...i }));
}

function lodgingSuggestion(people: number, days: number): number {
  const rooms = Math.ceil(Math.max(1, people) / 2);
  return LODGING_PER_NIGHT * rooms * Math.max(1, days);
}

function attractionKey(a: Attraction): string {
  return `${a.name}|${a.type}|${a.price}`;
}

function formatYuan(n: number): string {
  return `￥${Number.isFinite(n) ? Math.round(n) : 0}`;
}

/** 示例：￥3,580 */
function formatYuanComma(n: number): string {
  const rounded = Math.round(Number.isFinite(n) ? n : 0);
  return `￥${rounded.toLocaleString("en-US")}`;
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function IconPin({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 21c0 0 7-5.25 7-11a7 7 0 1 0-14 0c0 5.75 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8 2v3M16 2v3M3 9h18M5 7h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      <path d="M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** 行程清单 + 预算：清单板与货币符号，简约线稿 */
function ProductLogo({ className }: { className?: string }) {
  return (
    <div
      className={`inline-flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50/90 dark:border-teal-800/50 dark:bg-teal-950/40 ${className ?? ""}`}
      role="img"
      aria-label="旅行小算盘：行程清单与预算规划"
    >
      <svg
        viewBox="0 0 40 40"
        className="h-8 w-8 text-teal-600 dark:text-teal-400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect
          x="7"
          y="6"
          width="19"
          height="25"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.85"
        />
        <path
          d="M11.5 13h10M11.5 18h10M11.5 23h7"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
        />
        <circle
          cx="27.5"
          cy="25.5"
          r="7"
          stroke="currentColor"
          strokeWidth="1.85"
          className="fill-teal-600/10 dark:fill-teal-400/10"
        />
        <path
          d="M24.5 23.5 27.5 27 30.5 23.5M24 25.5h7M24 27.5h7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function IconTicket({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 9.5V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3.5M3 14.5V18a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3.5M13 5v3M13 16v3M9 5v14M15 5v14" />
    </svg>
  );
}

function IconClipboardList({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
      <path d="M9 12h6M9 16h6M9 8h2" />
    </svg>
  );
}

function IconWallet({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M19 7V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v1" />
      <path d="M3 10a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function StepperField({
  icon,
  label,
  value,
  onChange,
  unit,
  min = 1,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  onChange: (n: number) => void;
  unit?: string;
  min?: number;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        <span className="shrink-0 text-teal-600 dark:text-teal-400">
          {icon}
        </span>
        {label}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${label}减少`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-lg font-medium leading-none text-zinc-700 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          −
        </button>
        <span className="min-w-[1.75rem] text-center text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {value}
        </span>
        <button
          type="button"
          aria-label={`${label}增加`}
          onClick={() => onChange(value + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-lg font-medium leading-none text-zinc-700 transition hover:bg-stone-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          +
        </button>
        {unit ? (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-orange-500">{icon}</span>
      <div className="min-w-0">
        <div className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </div>
        {subtitle ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      {right ? <div className="ml-auto shrink-0">{right}</div> : null}
    </div>
  );
}

export function TravelBudgetPlanner() {
  const [city, setCity] = useState("");
  const [people, setPeople] = useState<number>(2);
  const [days, setDays] = useState<number>(3);
  const [draftReady, setDraftReady] = useState(false);
  const [invalidDestination, setInvalidDestination] = useState(false);
  const [noBuiltinAttractions, setNoBuiltinAttractions] = useState(false);
  const [lodgingAuto, setLodgingAuto] = useState(true);
  const [cityInputError, setCityInputError] = useState<string | null>(null);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [itinerary, setItinerary] = useState<Attraction[]>([]);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>(
    createDefaultBudgetLines,
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryAmount, setNewCategoryAmount] = useState("");
  const [showCustomCategoryEditor, setShowCustomCategoryEditor] =
    useState(false);
  const [customItineraryItems, setCustomItineraryItems] = useState<
    CustomItineraryItem[]
  >([]);
  const [customItineraryName, setCustomItineraryName] = useState("");
  const [customItineraryFee, setCustomItineraryFee] = useState("");
  const [showManualItineraryEditor, setShowManualItineraryEditor] =
    useState(false);
  const [lastSnapshot, setLastSnapshot] = useState<PlannerSnapshot | null>(
    null,
  );
  const [sharePosterOpen, setSharePosterOpen] = useState(false);
  const [sharePosterBusy, setSharePosterBusy] = useState(false);
  const [sharePosterUrl, setSharePosterUrl] = useState("");
  const sharePosterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
    if (fromEnv) {
      setSharePosterUrl(fromEnv);
      return;
    }

    if (typeof window === "undefined") {
      setSharePosterUrl(DEFAULT_PUBLIC_APP_URL);
      return;
    }

    const href = window.location.href.trim();
    const origin = window.location.origin.trim();
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

    if (!href || isLocalhost) {
      setSharePosterUrl(DEFAULT_PUBLIC_APP_URL);
      return;
    }

    // 用完整 URL，确保 GitHub Pages 子路径（/travel-budget-mvp）不会丢失。
    const current = new URL(href);
    current.search = "";
    current.hash = "";
    setSharePosterUrl(current.toString());
  }, []);

  useEffect(() => {
    if (!sharePosterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSharePosterOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sharePosterOpen]);

  const sharePosterFilename = useCallback(() => {
    const safe =
      city.trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 48) || "行程";
    return `旅行小算盘-${safe}-海报.png`;
  }, [city]);

  const handleSharePosterDownload = useCallback(async () => {
    const el = sharePosterRef.current;
    if (!el) return;
    setSharePosterBusy(true);
    try {
      await waitForStablePoster();
      const blob = await posterNodeToPngBlob(el);
      downloadPngBlob(blob, sharePosterFilename());
    } finally {
      setSharePosterBusy(false);
    }
  }, [sharePosterFilename]);

  const itineraryKeys = useMemo(
    () => new Set(itinerary.map(attractionKey)),
    [itinerary],
  );

  const customItineraryFeesTotal = useMemo(
    () =>
      customItineraryItems.reduce(
        (s, item) => s + (Number(item.fee) || 0),
        0,
      ),
    [customItineraryItems],
  );

  const totalBudget = useMemo(() => {
    const lines = budgetLines.reduce(
      (s, line) => s + (Number(line.amount) || 0),
      0,
    );
    return lines + customItineraryFeesTotal;
  }, [budgetLines, customItineraryFeesTotal]);

  const allAttractionsAdded =
    attractions.length > 0 &&
    attractions.every((a) => itineraryKeys.has(attractionKey(a)));

  const perPersonBudget = useMemo(() => {
    const p = Math.max(1, people);
    return totalBudget / p;
  }, [totalBudget, people]);

  const transportHint = useMemo(() => {
    const p = Math.max(1, people);
    const d = Math.max(1, days);
    const low = 50 * p * d;
    const high = 100 * p * d;
    const fmt = (n: number) => formatYuan(n).replace("￥", "¥");
    return `💡 市内交通建议按 ¥50–100/人/天估算，约 ${fmt(low)}–${fmt(high)}（未自动填入）`;
  }, [people, days]);

  const foodHint = useMemo(() => {
    const p = Math.max(1, people);
    const d = Math.max(1, days);
    const est = 100 * p * d;
    const fmt = (n: number) => formatYuan(n).replace("￥", "¥");
    return `💡 餐饮可按人均 ¥100 × 人数 × 天数，约 ${fmt(est)}（未自动填入）`;
  }, [people, days]);

  // 归一到“展示用的标准城市名”，用于模糊搜索与数据查表。
  const normalizedCityInput = useMemo(
    () => normalizeChinaCityName(city),
    [city],
  );

  const exactCityInput = useMemo(
    () => normalizedCityInput.trim(),
    [normalizedCityInput],
  );

  const exactCityValid = useMemo(() => {
    if (!exactCityInput) return false;
    return isChinaCityName(exactCityInput);
  }, [exactCityInput]);

  const citySuggestions = useMemo(() => {
    if (!cityDropdownOpen) return [];
    if (!exactCityInput) return [];
    if (exactCityValid) return [];
    const q = exactCityInput;
    // 模糊：包含即可（输入“北”会匹配北京/北海/北辰…）
    return CHINA_CITY_NAMES.filter((c) => c.includes(q)).slice(0, 12);
  }, [cityDropdownOpen, exactCityInput, exactCityValid]);

  const updateLineAmount = useCallback((id: string, amount: number) => {
    if (id === DEFAULT_BUDGET_IDS.lodging) setLodgingAuto(false);
    setBudgetLines((lines) =>
      lines.map((line) =>
        line.id === id ? { ...line, amount: Math.max(0, amount) } : line,
      ),
    );
  }, []);

  const handleGenerate = () => {
    const trimmed = city.trim();
    if (!trimmed) {
      setCityInputError("请输入城市");
      return;
    }
    const normalized = normalizeChinaCityName(trimmed);
    setCityInputError(null);
    setCity(normalized);

    const inChina = isChinaCityName(normalized);
    const list = CITY_DATA[normalized];
    let nextBudgetLines: BudgetLine[];

    if (!inChina) {
      setInvalidDestination(true);
      setNoBuiltinAttractions(false);
      setAttractions([]);
      nextBudgetLines = budgetLines.map((line) =>
        line.id === DEFAULT_BUDGET_IDS.entertainment
          ? { ...line, amount: 0 }
          : line,
      );
    } else if (!list) {
      setInvalidDestination(false);
      setNoBuiltinAttractions(true);
      setAttractions([]);
      const lodging = lodgingSuggestion(people, days);
      nextBudgetLines = budgetLines.map((line) => {
        if (line.id === DEFAULT_BUDGET_IDS.lodging) {
          return { ...line, amount: lodging };
        }
        if (line.id === DEFAULT_BUDGET_IDS.entertainment) {
          return { ...line, amount: 0 };
        }
        return line;
      });
    } else {
      setInvalidDestination(false);
      setNoBuiltinAttractions(false);
      setAttractions(list);
      const lodging = lodgingSuggestion(people, days);
      nextBudgetLines = budgetLines.map((line) => {
        if (line.id === DEFAULT_BUDGET_IDS.lodging) {
          return { ...line, amount: lodging };
        }
        if (line.id === DEFAULT_BUDGET_IDS.entertainment) {
          return { ...line, amount: 0 };
        }
        return line;
      });
    }

    setBudgetLines(nextBudgetLines);
    setItinerary([]);
    setCustomItineraryItems([]);
    setDraftReady(true);

    setLastSnapshot({
      city: normalized,
      people,
      days,
      draftReady: true,
      invalidDestination: !inChina,
      noBuiltinAttractions: inChina && !list,
      attractions: list ? cloneAttractions(list) : [],
      itinerary: [],
      budgetLines: cloneBudgetLines(nextBudgetLines),
      customItineraryItems: [],
    });
  };

  // 输入城市后：当匹配到“标准城市名”时，自动生成/展示对应景点与预算（无需再点「生成」）。
  useEffect(() => {
    const trimmedRaw = city.trim();
    if (!trimmedRaw) return;

    const normalized = normalizeChinaCityName(trimmedRaw);
    if (!normalized) return;

    // 若用户输入了“北京市”等带后缀的写法，归一后再继续。
    if (normalized !== trimmedRaw) {
      setCity(normalized);
      return;
    }

    if (!isChinaCityName(normalized)) return;

    const lastCity = lastSnapshot?.city;
    if (draftReady && lastCity === normalized) return;

    const list = CITY_DATA[normalized];
    let nextBudgetLines: BudgetLine[];

    if (!list) {
      setInvalidDestination(false);
      setNoBuiltinAttractions(true);
      setAttractions([]);

      const lodging = lodgingSuggestion(people, days);
      nextBudgetLines = budgetLines.map((line) => {
        if (line.id === DEFAULT_BUDGET_IDS.lodging) {
          return { ...line, amount: lodging };
        }
        if (line.id === DEFAULT_BUDGET_IDS.entertainment) {
          return { ...line, amount: 0 };
        }
        return line;
      });
    } else {
      setInvalidDestination(false);
      setNoBuiltinAttractions(false);
      setAttractions(list);

      const lodging = lodgingSuggestion(people, days);
      nextBudgetLines = budgetLines.map((line) => {
        if (line.id === DEFAULT_BUDGET_IDS.lodging) {
          return { ...line, amount: lodging };
        }
        if (line.id === DEFAULT_BUDGET_IDS.entertainment) {
          return { ...line, amount: 0 };
        }
        return line;
      });
    }

    setBudgetLines(nextBudgetLines);
    setItinerary([]);
    setCustomItineraryItems([]);
    setDraftReady(true);

    setLastSnapshot({
      city: normalized,
      people,
      days,
      draftReady: true,
      invalidDestination: false,
      noBuiltinAttractions: !list,
      attractions: list ? cloneAttractions(list) : [],
      itinerary: [],
      budgetLines: cloneBudgetLines(nextBudgetLines),
      customItineraryItems: [],
    });
  }, [city, draftReady, lastSnapshot?.city, people, days, budgetLines]);

  // 天数/人数变化时：自动联动住宿预算（不影响其它分类），并驱动总预算更新。
  // 若用户手动改过“住宿”金额，则不再自动覆盖（lodgingAuto=false）。
  useEffect(() => {
    if (!draftReady) return;
    if (invalidDestination) return;
    if (!lodgingAuto) return;

    const trimmed = city.trim();
    if (!trimmed) return;
    if (!isChinaCityName(trimmed)) return;

    const nextLodging = lodgingSuggestion(people, days);
    setBudgetLines((lines) =>
      lines.map((line) =>
        line.id === DEFAULT_BUDGET_IDS.lodging
          ? line.amount === nextLodging
            ? line
            : { ...line, amount: nextLodging }
          : line,
      ),
    );
  }, [days, people, city, draftReady, invalidDestination, lodgingAuto]);

  const handleReset = () => {
    if (!lastSnapshot) return;
    setCity(lastSnapshot.city);
    setPeople(lastSnapshot.people);
    setDays(lastSnapshot.days);
    setDraftReady(lastSnapshot.draftReady);
    setInvalidDestination(lastSnapshot.invalidDestination);
    setNoBuiltinAttractions(lastSnapshot.noBuiltinAttractions);
    setLodgingAuto(true);
    setAttractions(cloneAttractions(lastSnapshot.attractions));
    setItinerary(cloneAttractions(lastSnapshot.itinerary));
    setBudgetLines(cloneBudgetLines(lastSnapshot.budgetLines));
    setCustomItineraryItems(cloneCustomItems(lastSnapshot.customItineraryItems));
    setCityInputError(null);
  };

  const handleClearAll = () => {
    setCity("");
    setPeople(2);
    setDays(3);
    setDraftReady(false);
    setInvalidDestination(false);
    setNoBuiltinAttractions(false);
    setLodgingAuto(true);
    setCityDropdownOpen(false);
    setCityInputError(null);
    setAttractions([]);
    setItinerary([]);
    setBudgetLines(createDefaultBudgetLines());
    setCustomItineraryItems([]);
    setLastSnapshot(null);
    setNewCategoryName("");
    setCustomItineraryName("");
    setCustomItineraryFee("");
  };

  const addToItinerary = (a: Attraction) => {
    const key = attractionKey(a);
    if (itineraryKeys.has(key)) return;
    setItinerary((prev) => [...prev, a]);
    if (a.type === "paid") {
      const delta = a.price * Math.max(1, people);
      setBudgetLines((lines) =>
        lines.map((line) =>
          line.id === DEFAULT_BUDGET_IDS.entertainment
            ? { ...line, amount: line.amount + delta }
            : line,
        ),
      );
    }
  };

  const removeFromItinerary = (a: Attraction) => {
    const key = attractionKey(a);
    setItinerary((prev) => prev.filter((x) => attractionKey(x) !== key));
    if (a.type === "paid") {
      const delta = a.price * Math.max(1, people);
      setBudgetLines((lines) =>
        lines.map((line) =>
          line.id === DEFAULT_BUDGET_IDS.entertainment
            ? { ...line, amount: Math.max(0, line.amount - delta) }
            : line,
        ),
      );
    }
  };

  const toggleAllAttractions = () => {
    if (noBuiltinAttractions) return;
    if (attractions.length === 0) return;

    const allAdded = attractions.every((a) =>
      itineraryKeys.has(attractionKey(a)),
    );

    if (allAdded) {
      attractions.forEach((a) => removeFromItinerary(a));
    } else {
      attractions.forEach((a) => {
        if (!itineraryKeys.has(attractionKey(a))) addToItinerary(a);
      });
    }
  };

  const addCustomItineraryRow = () => {
    const name = customItineraryName.trim();
    const fee = Math.max(0, Number(customItineraryFee) || 0);
    if (!name) return;
    setCustomItineraryItems((prev) => [
      ...prev,
      { id: `ci-${Date.now()}`, name, fee },
    ]);
    setCustomItineraryName("");
    setCustomItineraryFee("");
  };

  const removeCustomItinerary = (id: string) => {
    setCustomItineraryItems((prev) => prev.filter((x) => x.id !== id));
  };

  const addCustomCategory = () => {
    const name = newCategoryName.trim();
    const amount = Math.max(0, Number(newCategoryAmount) || 0);
    if (!name) return;
    setBudgetLines((lines) => [
      ...lines,
      { id: `custom-${Date.now()}`, name, amount, removable: true },
    ]);
    setNewCategoryName("");
    setNewCategoryAmount("");
  };

  const removeCategory = (id: string) => {
    setBudgetLines((lines) => lines.filter((line) => line.id !== id));
  };

  const pCount = Math.max(1, people);
  const dCount = Math.max(1, days);

  const fillCity = (name: string) => {
    setCity(name);
    setCityInputError(null);
    setCityDropdownOpen(false);
  };

  return (
    <div className="flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
      <header className="flex w-full flex-col items-center gap-1.5 text-center">
        <ProductLogo />
        <div className="mx-auto max-w-xl space-y-1 sm:max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            旅行小算盘
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {
              "智能旅行预算规划 · 轻松构建行程与花费清单"
            }
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <IconPin className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              旅行目的地
            </label>
            <div className="relative w-full min-w-0">
              <input
                type="text"
                value={city}
                onFocus={() => setCityDropdownOpen(true)}
                onBlur={() => {
                  // 给下拉项点击留出时间（避免先 blur 关闭再无法点击）
                  window.setTimeout(() => setCityDropdownOpen(false), 120);
                }}
                onChange={(e) => {
                  setCity(e.target.value);
                  setCityInputError(null);
                  setCityDropdownOpen(true);
                }}
                placeholder="请输入你想去的城市，例如：北京、成都、西安…"
                autoComplete="off"
                className={`w-full rounded-xl border border-stone-200 bg-stone-100 py-2.5 pl-3 text-zinc-900 outline-none ring-teal-600/20 placeholder:text-zinc-400 focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
                  city ? "pr-10" : "pr-3"
                }`}
              />
              {city ? (
                <button
                  type="button"
                  aria-label="清空城市"
                  onClick={() => {
                    // 与「清空」按钮保持同一套逻辑：回到初始初始化状态
                    handleClearAll();
                  }}
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition hover:bg-stone-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              ) : null}

              {cityDropdownOpen && citySuggestions.length > 0 ? (
                <div
                  className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                  role="listbox"
                  aria-label="城市搜索结果"
                >
                  {citySuggestions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        fillCity(c);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-zinc-900 transition hover:bg-stone-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      role="option"
                      aria-selected={c === city}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {cityInputError ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {cityInputError}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="shrink-0">🔥 热门城市：</span>
              {HOT_CITIES.map((c, idx) => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => fillCity(c)}
                    className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {c}
                  </button>
                  {idx < HOT_CITIES.length - 1 ? (
                    <span className="select-none text-zinc-300 dark:text-zinc-700">
                      ｜{/* 全角分隔符更贴合中文排版 */}
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StepperField
              icon={<IconUsers className="h-4 w-4" />}
              label="旅行人数"
              value={people}
              min={1}
              onChange={setPeople}
            />
            <StepperField
              icon={<IconCalendar className="h-4 w-4" />}
              label="旅行天数"
              value={days}
              min={1}
              onChange={setDays}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={!lastSnapshot}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              重置
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              清空
            </button>
          </div>
        </div>
      </section>

      {!draftReady ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-4 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          门票价格为市场参考价，实际支出请以当地为准
        </p>
      ) : invalidDestination ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          未识别为中国地级城市名称。请核对城市名称是否多字、少字后再试。
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-6">
            <SectionHeading
              icon={<IconPin className="h-6 w-6" />}
              title={`${city} · 景点推荐`}
              subtitle={
                noBuiltinAttractions
                  ? "该城市暂无内置热门景点"
                  : "选择感兴趣的景点加入行程"
              }
              right={
                noBuiltinAttractions ? null : (
                  // pr-4 与下方景点卡片 li 的 p-4 一致，使全选与圆形「+」列横向对齐
                  <div className="self-center pr-4">
                    <button
                      type="button"
                      onClick={toggleAllAttractions}
                      disabled={attractions.length === 0}
                      role="checkbox"
                      aria-checked={allAttractionsAdded}
                      aria-label={
                        allAttractionsAdded ? "取消全选景点" : "全选景点"
                      }
                      className={
                        attractions.length === 0
                          ? "flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
                          : allAttractionsAdded
                            ? "flex h-7 w-7 items-center justify-center rounded-md border border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm"
                            : "flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-zinc-500 transition hover:bg-stone-50"
                      }
                    >
                      {allAttractionsAdded ? (
                        <IconCheck className="h-3 w-3" />
                      ) : null}
                    </button>
                  </div>
                )
              }
            />
            {noBuiltinAttractions ? (
              <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/50 px-4 py-6 text-center dark:border-teal-900 dark:bg-teal-950/20">
                <p className="text-sm leading-relaxed text-teal-900 dark:text-teal-100">
                  当前版本尚未为该城市维护推荐景点列表。
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-4">
                  {attractions.map((a) => {
                    const key = attractionKey(a);
                    const added = itineraryKeys.has(key);
                    return (
                      <li
                        key={key}
                        className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                              {a.name}
                            </span>
                            {a.type === "paid" ? (
                              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                                <IconTicket className="h-3.5 w-3.5 shrink-0" />
                                <span className="break-words">
                                  {attractionTicketBadgeText(a)}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                免费
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {a.description}
                          </p>
                          {a.type === "paid" ? (
                            <p className="mt-1.5 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                              预算按单价 {formatYuan(a.price)}/人 计入 ·{" "}
                              {attractionTicketFootnote(a)}
                              {a.sourceUrl ? (
                                <>
                                  {" · "}
                                  <a
                                    href={a.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-teal-600 underline decoration-teal-600/30 underline-offset-2 hover:decoration-teal-600 dark:text-teal-400"
                                  >
                                    核对官方票价
                                  </a>
                                </>
                              ) : null}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={added}
                          onClick={() => addToItinerary(a)}
                          aria-label={added ? "已加入行程" : "加入行程"}
                          className={
                            added
                              ? "flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded-full border border-emerald-500 bg-white text-emerald-600 shadow-sm dark:bg-zinc-900 dark:text-emerald-400"
                              : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-base font-light leading-none text-zinc-700 transition hover:bg-stone-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                          }
                        >
                          {added ? (
                            <IconCheck className="h-3.5 w-3.5 shrink-0 stroke-[2.75]" />
                          ) : (
                            <span>+</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  门票为参考价，出行前请以景区官方或正规售票渠道为准。
                </p>
              </>
            )}
          </section>

          <div className="flex flex-col gap-4">
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
              <SectionHeading
                icon={<IconClipboardList className="h-6 w-6" />}
                title="行程清单"
                subtitle={
                  itinerary.length === 0 && customItineraryItems.length === 0
                    ? "尚未添加行程，从景点推荐添加或手动添加"
                    : undefined
                }
              />
              {itinerary.length > 0 || customItineraryItems.length > 0 ? (
                <ul className="space-y-3">
                  {itinerary.map((a) => (
                    <li
                      key={attractionKey(a)}
                      className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-3 text-sm dark:border-zinc-800"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {a.name}
                          </p>
                          {a.type === "free" ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              免费
                            </span>
                          ) : null}
                        </div>
                        {a.type === "paid" ? (
                          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                            {pCount} 人 · 参考单价 {formatYuan(a.price)} · 门票合计{" "}
                            {formatYuan(a.price * pCount)}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label="从行程中移除"
                        onClick={() => removeFromItinerary(a)}
                        className="shrink-0 rounded-md p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                  {customItineraryItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-3 text-sm dark:border-zinc-800"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          自定义 · 费用 {formatYuan(item.fee)}
                        </p>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {item.name}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="移除自定义行程"
                        onClick={() => removeCustomItinerary(item.id)}
                        className="shrink-0 rounded-md p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div
                className={`space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800 ${
                  itinerary.length > 0 || customItineraryItems.length > 0
                    ? "mt-2"
                    : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowManualItineraryEditor(true)}
                  className="flex items-center gap-2 text-sm font-medium text-teal-900 dark:text-teal-100"
                  aria-expanded={showManualItineraryEditor}
                >
                  <span className="text-base leading-none">➕</span>
                  <span>添加自定义行程</span>
                </button>
                {showManualItineraryEditor ? (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={customItineraryName}
                        onChange={(e) => setCustomItineraryName(e.target.value)}
                        placeholder="行程名称，如：逛本地小吃街"
                        className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950"
                      />
                      <div className="flex items-center gap-2 sm:w-40">
                        <span className="text-zinc-400">￥</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={customItineraryFee}
                          onChange={(e) => setCustomItineraryFee(e.target.value)}
                          placeholder="费用"
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950"
                        />
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <button
                          type="button"
                          onClick={addCustomItineraryRow}
                          className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        >
                          确认
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowManualItineraryEditor(false)}
                          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      填写费用后将自动计入总预算（与分类预算相加）。
                    </p>
                  </>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
              <SectionHeading
                icon={<IconWallet className="h-6 w-6" />}
                title="预算分类"
              />
              <ul className="space-y-4">
                {budgetLines.map((line) => (
                  <li key={line.id}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <label
                          htmlFor={`amt-${line.id}`}
                          className="w-28 shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                          {line.name}
                        </label>
                        <div className="relative flex-1">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                            ￥
                          </span>
                          <input
                            id={`amt-${line.id}`}
                            type="number"
                            min={0}
                            step={1}
                            value={
                              (line.id === DEFAULT_BUDGET_IDS.transport ||
                                line.id === DEFAULT_BUDGET_IDS.food) &&
                              line.amount === 0
                                ? ""
                                : line.amount
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              updateLineAmount(
                                line.id,
                                v === "" ? 0 : Number(v) || 0,
                              );
                            }}
                            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-8 pr-3 text-zinc-900 outline-none ring-teal-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </div>
                      </div>
                      {line.removable && (
                        <button
                          type="button"
                          onClick={() => removeCategory(line.id)}
                          className="text-sm text-red-600 hover:underline dark:text-red-400"
                        >
                          删除分类
                        </button>
                      )}
                    </div>
                    {line.id === DEFAULT_BUDGET_IDS.transport && (
                      <p className="mt-1 pl-0 text-xs text-zinc-500 sm:pl-28 dark:text-zinc-400">
                        {transportHint}
                      </p>
                    )}
                    {line.id === DEFAULT_BUDGET_IDS.food && (
                      <p className="mt-1 pl-0 text-xs text-zinc-500 sm:pl-28 dark:text-zinc-400">
                        {foodHint}
                      </p>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-3 space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCustomCategoryEditor(true)}
                  className="flex items-center gap-2 text-sm font-medium text-teal-900 dark:text-teal-100"
                  aria-expanded={showCustomCategoryEditor}
                >
                  <span className="text-base leading-none">➕</span>
                  <span>添加自定义分类</span>
                </button>

                {showCustomCategoryEditor ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="输入分类名，如：购物、娱乐、纪念品…"
                      className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950"
                    />
                    <div className="flex items-center gap-2 sm:w-44">
                      <span className="text-zinc-400">￥</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={newCategoryAmount}
                        onChange={(e) => setNewCategoryAmount(e.target.value)}
                        placeholder="费用"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950"
                      />
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={addCustomCategory}
                        className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      >
                        确认
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomCategoryEditor(false)}
                        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 space-y-3 rounded-xl bg-teal-50 px-4 py-3 dark:bg-teal-950/30">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-teal-900 dark:text-teal-100">
                    <IconWallet className="h-4 w-4 text-teal-700 dark:text-teal-200" />
                    总预算
                  </span>
                  <span className="text-2xl font-extrabold leading-none text-teal-900 dark:text-teal-100">
                    {formatYuanComma(totalBudget)}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-teal-200/80 pt-3 text-right dark:border-teal-800/60">
                  <span className="text-xs font-medium text-teal-900 dark:text-teal-100">
                    人均预算
                  </span>
                  <span className="text-xs font-semibold text-teal-800 dark:text-teal-200">
                    {formatYuanComma(perPersonBudget)}（{pCount}人 / {dCount}天）
                  </span>
                </div>
              </div>
            </section>

            <div className="w-full">
              <button
                type="button"
                onClick={() => setSharePosterOpen(true)}
                aria-label="生成行程海报"
                className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 py-3 text-sm font-medium text-white shadow-sm transition hover:from-teal-700 hover:to-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
              >
                生成海报
              </button>
              <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                生成行程海报、保存或一键分享
              </p>
            </div>
          </div>
        </div>
      )}
      {sharePosterOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3"
          aria-hidden={!sharePosterOpen}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="关闭行程海报"
            onClick={() => setSharePosterOpen(false)}
          />
          <div className="relative z-10 flex w-full min-w-0 max-w-lg flex-col items-stretch gap-3">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-poster-dialog-title"
              className="flex w-full min-w-0 flex-col overflow-x-hidden overflow-y-visible rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:p-3"
            >
              <div className="relative mb-3 flex min-h-10 items-center justify-end">
                <h2
                  id="share-poster-dialog-title"
                  className="absolute inset-x-0 flex items-center justify-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  <ShareDialogIconMap className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" />
                  <span>我的{city || "旅行"}旅行计划</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setSharePosterOpen(false)}
                  className="relative z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <ShareDialogIconClose className="h-4 w-4 shrink-0" />
                  关闭
                </button>
              </div>
              <div className="flex w-full min-w-0 justify-center">
                <SharePoster
                  ref={sharePosterRef}
                  city={city}
                  people={people}
                  days={days}
                  totalBudget={totalBudget}
                  itinerary={itinerary}
                  customItineraryItems={customItineraryItems}
                  shareUrl={sharePosterUrl}
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={handleSharePosterDownload}
                disabled={sharePosterBusy}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/80 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-md hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                <ShareDialogIconImage className="h-4 w-4 shrink-0" />
                保存到相册
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
