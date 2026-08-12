import Link from "next/link";
import { Camera, Printer, QrCode } from "lucide-react";

export default function QrCheckHome() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-10 px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <QrCode className="h-9 w-9" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">QRチェック</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          QRコードを読み取って、いま開いているこのページのURLと同じかどうかを確認します。
          <br />
          一致すると「ピッ」と音が鳴ります。
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Link
          href="/qr-check/scan"
          className="flex items-center gap-4 rounded-2xl bg-emerald-400 px-5 py-5 text-slate-950 shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950/10">
            <Camera className="h-5 w-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-semibold">スキャンする</span>
            <span className="text-xs text-slate-950/70">
              カメラでQRコードを読み取る
            </span>
          </span>
        </Link>

        <Link
          href="/qr-check/print"
          className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-5 text-slate-50 transition active:scale-[0.98]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Printer className="h-5 w-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-semibold">QRコードを印刷する</span>
            <span className="text-xs text-slate-400">
              好きなURLのQRコードを作って印刷
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
