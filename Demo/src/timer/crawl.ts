/**
 * City.json 同步逻辑（「爬取携程」的合规替代方案见下方说明）。
 *
 * 【重要】对携程 (ctrip.com) 页面进行未授权自动化抓取通常违反用户协议，且页面为动态渲染、
 * 有反爬机制，不适合作为稳定数据源。携程玩乐/门票合作需通过 **携程开放平台** 等正式商务与 API。
 *
 * 本模块支持的数据来源（按优先级）：
 * 1. 环境变量 `CITY_DATA_SYNC_URL`：指向与 `DATA/City.json` 同结构的 JSON（可由你在服务端
 *    用合规方式生成后托管，例如自建服务对接官方 API 后暴露只读 JSON）。
 * 2. 未配置时：**不修改** `cities` 内容，仅向 stderr 输出提示（避免误以为已「爬取携程」）。
 *
 * 手动执行一次（在 Demo 目录）：`npm run crawl`
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Attraction, CityDataFile } from "../data/mockCities";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getProjectRoot(): string {
  return join(__dirname, "..", "..");
}

export function getCityJsonPath(): string {
  return join(getProjectRoot(), "DATA", "City.json");
}

function isAttraction(x: unknown): x is Attraction {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.name === "string" &&
    typeof o.price === "number" &&
    (o.type === "paid" || o.type === "free") &&
    typeof o.description === "string"
  );
}

function isCityDataFile(x: unknown): x is CityDataFile {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (!o.cities || typeof o.cities !== "object") return false;
  for (const v of Object.values(o.cities)) {
    if (!Array.isArray(v)) return false;
    for (const item of v) {
      if (!isAttraction(item)) return false;
    }
  }
  return true;
}

/**
 * 从 `CITY_DATA_SYNC_URL` 拉取与 City.json 同结构的 JSON（HTTPS 推荐）。
 */
async function fetchCityDataFromSyncUrl(): Promise<CityDataFile | null> {
  const url = process.env.CITY_DATA_SYNC_URL?.trim();
  if (!url) return null;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    throw new Error(`CITY_DATA_SYNC_URL 请求失败: HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (!isCityDataFile(data)) {
    throw new Error("远程 JSON 结构与 CityDataFile 不兼容（需有 cities 及各景点字段）");
  }
  return data;
}

/**
 * 执行一次：若有配置的远程 JSON 则写入 DATA/City.json；否则不修改文件并输出说明。
 */
export async function crawlAndSaveCityJson(): Promise<void> {
  const path = getCityJsonPath();
  mkdirSync(dirname(path), { recursive: true });

  const remote = await fetchCityDataFromSyncUrl().catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`拉取远程 City 数据失败: ${msg}`);
  });

  if (remote) {
    const out: CityDataFile = {
      _meta: {
        ...remote._meta,
        generatedAt: new Date().toISOString(),
        formatVersion: remote._meta?.formatVersion ?? 1,
        source:
          remote._meta?.source ??
          "CITY_DATA_SYNC_URL（自建合规数据源，非页面爬取）",
        note:
          remote._meta?.note ??
          "由定时任务经 CITY_DATA_SYNC_URL 写入；应用内展示仍以构建时读取的 City.json 为准，需重新构建/部署后前端才更新。",
      },
      cities: remote.cities,
    };
    writeFileSync(path, JSON.stringify(out, null, 2), "utf8");
    console.log(`[crawl] 已写入 ${path}`);
    return;
  }

  if (!existsSync(path)) {
    throw new Error(
      "缺少 DATA/City.json，且未设置 CITY_DATA_SYNC_URL。请先提交初始 City.json 或配置同步地址。",
    );
  }

  console.warn(
    "[crawl] 未设置 CITY_DATA_SYNC_URL，跳过写入（未对携程进行任何网络抓取）。",
    "若需定期更新：请在合规前提下提供 JSON 的 HTTPS 地址，或对接携程开放平台 API 后由自建服务生成该 JSON。",
  );

  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as CityDataFile;
  parsed._meta = {
    ...parsed._meta,
    lastSyncAttempt: new Date().toISOString(),
    lastSyncSkippedReason:
      "no CITY_DATA_SYNC_URL — 未执行远程更新（禁止使用未授权爬取替代）",
  };
  if (process.env.CRAWL_TOUCH_META === "1") {
    writeFileSync(path, JSON.stringify(parsed, null, 2), "utf8");
    console.log(`[crawl] 已按 CRAWL_TOUCH_META=1 仅更新 _meta: ${path}`);
  }
}

