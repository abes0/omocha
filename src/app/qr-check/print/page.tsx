"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer, QrCode as QrCodeIcon } from "lucide-react";

export default function PrintPage() {
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(`${window.location.origin}/qr-check/scan`);
  }, []);

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSvg("");
      setError("");
      return;
    }
    let cancelled = false;
    QRCode.toString(trimmed, {
      type: "svg",
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((result) => {
        if (!cancelled) {
          setSvg(result);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSvg("");
          setError("QRコードを作成できませんでした");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col print:max-w-none">
      <header className="flex items-center gap-3 p-4 print:hidden">
        <Link href="/qr-check" className="rounded-full p-2 hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">QRコードを印刷</h1>
      </header>

      <main className="flex flex-1 flex-col items-center gap-6 px-6 pb-10 print:gap-0 print:p-0">
        <div className="w-full space-y-4 print:hidden">
          <label className="block text-sm font-medium text-slate-300">
            読み取らせたいURL
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://example.com/mission/1"
              inputMode="url"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 outline-none focus:border-emerald-400"
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            見出し（任意・印刷時に表示）
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例: チェックポイント A"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 outline-none focus:border-emerald-400"
            />
          </label>
        </div>

        <div className="flex w-full flex-1 flex-col items-center justify-center rounded-3xl bg-white p-6 text-slate-900 shadow-xl print:min-h-dvh print:w-full print:flex-none print:rounded-none print:shadow-none">
          {label && (
            <p className="mb-3 text-center text-xl font-bold print:text-2xl">
              {label}
            </p>
          )}
          {svg ? (
            <div
              className="aspect-square w-full max-w-xs [&_svg]:h-full [&_svg]:w-full print:max-w-md"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="flex aspect-square w-full max-w-xs items-center justify-center text-slate-300">
              <QrCodeIcon className="h-16 w-16" />
            </div>
          )}
          {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
          {value.trim() && (
            <p className="mt-4 max-w-xs break-all text-center text-xs text-slate-500 print:text-sm">
              {value}
            </p>
          )}
        </div>

        <button
          onClick={() => window.print()}
          disabled={!svg}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-4 text-base font-semibold text-slate-950 transition active:scale-[0.98] disabled:opacity-40 print:hidden"
        >
          <Printer className="h-5 w-5" />
          印刷する
        </button>
      </main>
    </div>
  );
}
