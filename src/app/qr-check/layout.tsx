import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "QRチェック",
  description:
    "QRコードを読み取って、いま開いているURLと同じかどうかを確認するアプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8fafc",
};

export default function QrCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh w-full bg-gradient-to-b from-white via-sky-50 to-emerald-50 text-slate-900 print:bg-white">
      {children}
    </div>
  );
}
