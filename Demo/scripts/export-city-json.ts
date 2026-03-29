/**
 * 从 src/data/mockCities.ts 导出 CITY_DATA 为 DATA/City.json（与运行时数据源一致）。
 * 说明：携程景点票价无公开、可稳定爬取的全国接口；本导出与 App 内置数据一致。
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CITY_DATA } from "../src/data/mockCities";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "DATA");
const outFile = join(outDir, "City.json");

mkdirSync(outDir, { recursive: true });

const payload = {
  _meta: {
    generatedAt: new Date().toISOString(),
    formatVersion: 1,
    source: "TravelBudgetPlanner/src/data/mockCities.ts → CITY_DATA",
    note:
      "数据与当前应用内置景点库一致。携程平台票价受日历/票种影响且禁止未经授权抓取；若需携程官方价请通过携程开放平台等商务合作获取 API，再写入本文件或替换为接口拉取结果。",
  },
  cities: CITY_DATA,
};

writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
console.log(`Wrote ${outFile}`);
