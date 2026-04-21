This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 开发脚本（固定端口 + 可重复调用）

项目已提供统一的启动/停止脚本，开发端口固定为 `3015`。

### 1) 启动脚本（可重复调用，每次都会重启）

```bash
npm run dev:start
```

行为说明：
- 每次调用都会先执行停止逻辑，再重新启动开发服务。
- 启动后会固定监听 `http://localhost:3015`。
- 日志输出在 `.runtime/logs/dev.log`。

### 2) 停止脚本

```bash
npm run dev:stop
```

行为说明：
- 优先根据 `.runtime/dev.pid` 停止进程。
- 同时会清理占用 `3015` 端口的残留进程，避免端口冲突。

### 3) 直接脚本调用方式（可选）

```bash
./scripts/start.sh
./scripts/stop.sh
```

启动后在浏览器访问 [http://localhost:3015](http://localhost:3015)。

## 景点门票定时任务（一键启动）

已提供定时任务一键启动/停止脚本，用于「先拉取一次数据 + 常驻调度」：

### 1) 启动定时任务（先拉取，再常驻）

```bash
npm run timer:start
```

行为说明：
- 每次调用会先停止已有 timer 进程，再重启（避免重复跑多份）。
- 启动时会先执行一次 `npm run crawl`，然后再启动 `npm run timer` 常驻任务。
- PID 文件：`.runtime/timer.pid`
- 日志文件：`.runtime/logs/timer.log`

### 2) 停止定时任务

```bash
npm run timer:stop
```

### 3) 查看定时任务状态

```bash
npm run timer:status
```

输出内容包括：
- 是否在运行（含 pid 文件是否陈旧）
- 当前 pid（若在运行）
- 日志文件路径
- 最近 20 行日志

### 4) 关键环境变量

- `CITY_DATA_SYNC_URL`：必须配置，指向可访问的 JSON 数据源（与 `DATA/City.json` 同结构）。
- `CRON_TZ`：可选，定时任务时区（默认 `Asia/Shanghai`）。
- `RUN_CRAWL_ON_START`：可选，`npm run timer` 单独运行时是否启动后立刻拉取一次（`timer:start` 已内置先拉取，通常不必再设）。

可选环境变量：部署生产时设置 `NEXT_PUBLIC_APP_URL`（例如 `https://your-domain.com`），分享海报上的二维码将指向该地址；未设置时使用当前访问的 `origin`（本地开发为 `http://localhost:3015`）。

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
