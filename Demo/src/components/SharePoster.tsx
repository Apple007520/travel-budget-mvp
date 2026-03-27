"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import QRCode from "qrcode";
import type { Attraction } from "@/data/mockCities";

const MAX_ROWS = 8;

export type SharePosterCustomItem = { id: string; name: string; fee: number };

export type SharePosterProps = {
  city: string;
  people: number;
  days: number;
  totalBudget: number;
  itinerary: Attraction[];
  customItineraryItems: SharePosterCustomItem[];
  shareUrl: string;
};

function formatYuanComma(n: number): string {
  const rounded = Math.round(Number.isFinite(n) ? n : 0);
  return `¥${rounded.toLocaleString("en-US")}`;
}

const POSTER_STROKE = "#0f766e";
const POSTER_MUTED = "#64748b";

function PosterMiniIcon({
  children,
  size = 18,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={POSTER_STROKE}
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** 货币/预算 */
function PosterIconClipboard({ size = 18 }: { size?: number }) {
  return (
    <PosterMiniIcon size={size}>
      <path d="M9 4.5h6l1 2h3a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7.5a1 1 0 0 1 1-1h3l1-2Z" />
      <path d="M9.5 12.5h5M9.5 16h8" />
    </PosterMiniIcon>
  );
}

function PosterIconAlert({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={POSTER_MUTED}
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 9v5M12 17h.01" />
      <path d="M10.3 3.9 2.8 17a1.8 1.8 0 0 0 1.6 2.7h15.2a1.8 1.8 0 0 0 1.6-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z" />
    </svg>
  );
}

/** 行程清单统一使用地点图钉，导出 PNG 时与内联 SVG 一致、不依赖外链 */
function ItineraryPinIcon({
  size = 22,
  stroke = POSTER_STROKE,
}: {
  size?: number;
  stroke?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21c0 0 7-5.25 7-11a7 7 0 1 0-14 0c0 5.75 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}

/**
 * 与主界面 TravelBudgetPlanner 中 ProductLogo 同一套图形（清单板 + 圆形算盘），
 * 内联渲染以便导出 PNG 稳定；右侧文案与页头标题一致。
 */
function PosterProductBrand() {
  const stroke = "#0d9488";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: 220,
      }}
      role="img"
      aria-label="旅行小算盘"
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          border: "1px solid #ccfbf1",
          backgroundColor: "rgba(240, 253, 250, 0.92)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width={32}
          height={32}
          viewBox="0 0 40 40"
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
            stroke={stroke}
            strokeWidth="1.85"
          />
          <path
            d="M11.5 13h10M11.5 18h10M11.5 23h7"
            stroke={stroke}
            strokeWidth="1.85"
            strokeLinecap="round"
          />
          <circle
            cx="27.5"
            cy="25.5"
            r="7"
            stroke={stroke}
            strokeWidth="1.85"
            fill="rgba(13, 148, 136, 0.1)"
          />
          <path
            d="M24.5 23.5 27.5 27 30.5 23.5M24 25.5h7M24 27.5h7"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: "#042f2e",
            lineHeight: 1.25,
          }}
        >
          旅行小算盘
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "#64748b",
            lineHeight: 1.35,
          }}
        >
          轻松构建游玩行程清单与开销
        </p>
      </div>
    </div>
  );
}

function ListRow({
  name,
  feeText,
  isLast,
}: {
  name: string;
  feeText: string;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: isLast
          ? "none"
          : "1px solid rgba(15,118,110,0.12)",
      }}
    >
      <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        <ItineraryPinIcon size={18} stroke={POSTER_MUTED} />
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          fontWeight: 600,
          color: "#134e4a",
          lineHeight: 1.35,
          wordBreak: "break-word",
        }}
      >
        {name}
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 700,
          color: "#0f766e",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {feeText}
      </span>
    </div>
  );
}

export const SharePoster = forwardRef<HTMLDivElement, SharePosterProps>(
  function SharePoster(
    {
      city,
      people,
      days,
      totalBudget,
      itinerary,
      customItineraryItems,
      shareUrl,
    },
    ref,
  ) {
    const [qrSrc, setQrSrc] = useState<string | null>(null);

    useEffect(() => {
      let canceled = false;
      const url = shareUrl?.trim() || window.location.href;
      QRCode.toDataURL(url, {
        margin: 1,
        width: 168,
        color: { dark: "#134e4a", light: "#ffffff" },
      })
        .then((dataUrl) => {
          if (!canceled) setQrSrc(dataUrl);
        })
        .catch(() => {
          if (!canceled) setQrSrc(null);
        });
      return () => {
        canceled = true;
      };
    }, [shareUrl]);

    const pCount = Math.max(1, people);
    const dCount = Math.max(1, days);

    const rows = useMemo(() => {
      const fromAttr = itinerary.map((a) => ({
        key: `a:${a.name}|${a.type}|${a.price}`,
        name: a.name,
        feeText:
          a.type === "free"
            ? "免费"
            : `${formatYuanComma(a.price * pCount)}（${pCount}人门票）`,
      }));
      const fromCustom = customItineraryItems.map((i) => ({
        key: `c:${i.id}`,
        name: i.name,
        feeText: i.fee > 0 ? formatYuanComma(i.fee) : "免费",
      }));
      return [...fromAttr, ...fromCustom];
    }, [itinerary, customItineraryItems, pCount]);

    const visibleRows = rows.slice(0, MAX_ROWS);
    const truncated = rows.length > visibleRows.length;

    const shellStyle: CSSProperties = {
      width: "100%",
      maxWidth: 390,
      boxSizing: "border-box",
      padding: 24,
      borderRadius: 20,
      background: "linear-gradient(165deg, #ecfdf5 0%, #f0fdfa 45%, #ffffff 100%)",
      border: "1px solid rgba(15,118,110,0.15)",
      fontFamily:
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: "#134e4a",
    };

    const perPerson = Math.round(totalBudget / pCount);
    const perPersonLine = `人均约 ${formatYuanComma(perPerson)}（${pCount}人 / ${dCount}天）`;

    return (
      <div ref={ref} style={shellStyle} data-share-poster-root>
        <header style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "8px 16px",
            }}
          >
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                  color: "#042f2e",
                  wordBreak: "break-word",
                }}
              >
                <span style={{ flexShrink: 0, display: "flex" }}>
                  <ItineraryPinIcon />
                </span>
                <span>{city || "旅行目的地"}</span>
              </p>
            </div>
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                  color: "#0d9488",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                总费用 {formatYuanComma(totalBudget)}
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#115e59",
                  lineHeight: 1.35,
                }}
              >
                {perPersonLine}
              </p>
            </div>
          </div>
        </header>

        <section
          style={{
            background: "rgba(255,255,255,0.95)",
            borderRadius: 14,
            padding: "12px 14px 14px",
            border: "1px solid rgba(15,118,110,0.1)",
            marginBottom: 18,
            boxSizing: "border-box",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: "#0f766e",
            }}
          >
            <PosterIconClipboard />
            <span>行程清单</span>
          </p>
          <div>
            {visibleRows.length === 0 ? (
              <p
                style={{
                  margin: "8px 0 4px",
                  fontSize: 13,
                  color: "#64748b",
                }}
              >
                行程待补充
              </p>
            ) : (
              visibleRows.map((r, index) => (
                <ListRow
                  key={r.key}
                  name={r.name}
                  feeText={r.feeText}
                  isLast={index === visibleRows.length - 1 && !truncated}
                />
              ))
            )}
          </div>
          <p
            style={{
              margin: "10px 0 0",
              paddingTop: 8,
              borderTop: "1px solid rgba(15,118,110,0.1)",
              fontSize: 11,
              color: "#64748b",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: 6,
              lineHeight: 1.4,
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 1 }}>
              <PosterIconAlert />
            </span>
            <span>门票价格为参考价，出行前请核对官方票价</span>
          </p>
          {truncated ? (
            <p
              style={{
                margin: "10px 0 0",
                paddingTop: 8,
                borderTop: "1px solid rgba(15,118,110,0.1)",
                fontSize: 11,
                color: "#94a3b8",
              }}
            >
              海报仅展示前 {MAX_ROWS} 项
            </p>
          ) : null}
        </section>

        <footer
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              width: "100%",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrSrc}
                  width={120}
                  height={120}
                  alt=""
                  style={{ display: "block", borderRadius: 8 }}
                />
              ) : (
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 8,
                    background: "#e2e8f0",
                  }}
                />
              )}
            </div>
            <div style={{ maxWidth: 210 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#134e4a",
                  textAlign: "left",
                  lineHeight: 1.35,
                }}
              >
                扫码立即体验~
              </p>
            </div>
          </div>
          <PosterProductBrand />
        </footer>
      </div>
    );
  },
);

SharePoster.displayName = "SharePoster";
