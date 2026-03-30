import cityDataBundle from "../../DATA/City.json";

export type AttractionType = "paid" | "free";

export interface Attraction {
  name: string;
  /** 计入预算的成人参考单价（元）；有区间时取代表值 */
  price: number;
  type: AttractionType;
  /** 卡片副标题，一句话介绍 */
  description: string;
  /** 票价展示主文案，若设置则优先于数字价 */
  priceLabel?: string;
  /** 参考价区间（展示用；预算仍以 price 为准） */
  priceFrom?: number;
  priceTo?: number;
  /** 参考价标注年月，如 2025-03 */
  priceAsOf?: string;
  /** 票价补充说明 */
  priceNote?: string;
  /**
   * 景区官方售票/公示页（用于核对票价）。维护方式：打开官网或「在线购票」页，
   * 对照成人全票写入 price / priceFrom–priceTo，并更新 priceAsOf。
   */
  sourceUrl?: string;
}

/** DATA/City.json 根结构 */
export interface CityDataFile {
  _meta?: {
    generatedAt?: string;
    formatVersion?: number;
    source?: string;
    note?: string;
    /** 定时任务尝试同步的时间（ISO），可选 */
    lastSyncAttempt?: string;
    /** 未拉取远程数据时的说明，可选 */
    lastSyncSkippedReason?: string;
  };
  cities: Record<string, Attraction[]>;
}

/** 未单独标注时的默认参考价月份 */
export const DEFAULT_TICKET_PRICE_AS_OF = "2026-03";

export const DEFAULT_TICKET_PRICE_NOTE =
  "以景区官方或主流 OTA 当日价格为准";

/** 收费景点卡片角标主文案 */
export function attractionTicketBadgeText(a: Attraction): string {
  if (a.type !== "paid") return "";
  if (a.priceLabel) return a.priceLabel;
  if (
    a.priceFrom != null &&
    a.priceTo != null &&
    Number.isFinite(a.priceFrom) &&
    Number.isFinite(a.priceTo)
  ) {
    return `参考约￥${Math.round(a.priceFrom)}–￥${Math.round(a.priceTo)}`;
  }
  return `参考价￥${Math.round(a.price)}`;
}

/** 收费景点卡片下方灰色说明 */
export function attractionTicketFootnote(a: Attraction): string {
  if (a.type !== "paid") return "";
  const asOf = a.priceAsOf ?? DEFAULT_TICKET_PRICE_AS_OF;
  const note = a.priceNote ?? DEFAULT_TICKET_PRICE_NOTE;
  return `截至 ${asOf} · ${note}`;
}

/** 城市 → 景点列表（数据源：`DATA/City.json` → `cities`） */
export const CITY_DATA: Record<string, Attraction[]> = (
  cityDataBundle as CityDataFile
).cities;

export const CITY_NAMES = Object.keys(CITY_DATA).sort((a, b) =>
  a.localeCompare(b, "zh-CN"),
);
