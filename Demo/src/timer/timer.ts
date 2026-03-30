/**
 * 本地常驻定时任务：每周二 02:00（默认 Asia/Shanghai）执行一次 crawl，写入 DATA/City.json。
 *
 * 运行方式（在 Demo 目录）：
 *   npm run timer
 *
 * 部署说明：Vercel 等无状态环境无法常驻 node 进程，请在本机、NAS 或 VPS 上用 systemd / pm2
 * 长期运行本脚本；或使用 GitHub Actions `schedule` 调用 `npx tsx src/timer/crawl.ts`（需单独配置）。
 *
 * 环境变量：
 *   CRON_TZ — 可选，默认 Asia/Shanghai
 *   CITY_DATA_SYNC_URL — 见 crawl.ts
 *   RUN_CRAWL_ON_START — 设为 1 时启动后立即执行一次（便于调试）
 */

import cron from "node-cron";
import { crawlAndSaveCityJson } from "./crawl";

const tz = process.env.CRON_TZ ?? "Asia/Shanghai";

async function runJob(): Promise<void> {
  const t = new Date().toISOString();
  console.log(`[timer] 触发 crawl ${t}`);
  try {
    await crawlAndSaveCityJson();
  } catch (e) {
    console.error("[timer] crawl 失败:", e);
    process.exitCode = 1;
  }
}

cron.schedule(
  "0 2 * * 2",
  () => {
    void runJob();
  },
  { timezone: tz },
);

console.log(`[timer] 已调度：每周二 02:00（${tz}）→ crawlAndSaveCityJson`);

if (process.env.RUN_CRAWL_ON_START === "1") {
  void runJob();
}
