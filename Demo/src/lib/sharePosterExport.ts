import { toPng } from "html-to-image";

/** 给二维码与布局一帧渲染时间，避免导出空白或缺图 */
export async function waitForStablePoster() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise<void>((r) => setTimeout(r, 120));
}

export async function posterNodeToPngBlob(node: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#f0fdfa",
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

export function downloadPngBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type SharePngResult = "shared" | "unsupported" | "canceled";

export async function sharePngIfPossible(
  blob: Blob,
  filename: string,
  options?: { title?: string; text?: string },
): Promise<SharePngResult> {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator === "undefined" || !navigator.share) {
    return "unsupported";
  }
  const payload = { files: [file], title: options?.title, text: options?.text };
  if (!navigator.canShare?.(payload)) {
    return "unsupported";
  }
  try {
    await navigator.share(payload);
    return "shared";
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "AbortError") return "canceled";
    return "unsupported";
  }
}
