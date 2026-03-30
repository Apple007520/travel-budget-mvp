import { crawlAndSaveCityJson } from "./crawl";

void crawlAndSaveCityJson().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
