import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "QRチェック",
  description:
    "QRコードを読み取って、いま開いているURLと同じかどうかを確認するアプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
};

export default function QrCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 print:bg-white print:text-slate-900">
      {children}
    </div>
  );
}
