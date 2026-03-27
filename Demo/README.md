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
