"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer, QrCode as QrCodeIcon } from "lucide-react";

export default function PrintPage() {
  const [value, setValue] = useState("");
  const [svg, setSvg] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(`${window.location.origin}/qr-check/scan`);
  }, []);

  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      // Lowest error correction = fewest modules for the same data, so each
      // module stays as large as possible when printed very small.
      errorCorrectionLevel: "L",
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then((result) => {
      if (!cancelled) setSvg(result);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col print:max-w-none">
      <header className="flex items-center gap-3 p-4 print:hidden">
        <Link
          href="/qr-check"
          className="rounded-full p-2 text-slate-700 hover:bg-slate-900/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">
          QRコードを印刷
        </h1>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-10 print:gap-0 print:p-0">
        <div className="flex w-full flex-1 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl print:min-h-dvh print:w-full print:flex-none print:rounded-none print:border-none print:shadow-none">
          {svg ? (
            <div
              className="aspect-square w-full max-w-xs [&_svg]:h-full [&_svg]:w-full print:w-[3cm] print:max-w-none"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="flex aspect-square w-full max-w-xs items-center justify-center text-slate-300">
              <QrCodeIcon className="h-16 w-16" />
            </div>
          )}
        </div>

        <button
          onClick={() => window.print()}
          disabled={!svg}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition active:scale-[0.98] disabled:opacity-40 print:hidden"
        >
          <Printer className="h-5 w-5" />
          印刷する
        </button>
      </main>
    </div>
  );
}
