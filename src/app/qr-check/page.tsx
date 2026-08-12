import Link from "next/link";
import { Camera, Printer, QrCode } from "lucide-react";

export default function QrCheckHome() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-10 px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <QrCode className="h-9 w-9" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          QRチェック
        </h1>
        <p className="text-sm leading-relaxed text-slate-500">
          QRコードを読み取って、いま開いているこのページのURLと同じかどうかを確認します。
          <br />
          一致すると「ピッ」と音が鳴ります。
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Link
          href="/qr-check/scan"
          className="flex items-center gap-4 rounded-2xl bg-emerald-500 px-5 py-5 text-white shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Camera className="h-5 w-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-semibold">スキャンする</span>
            <span className="text-xs text-white/80">
              カメラでQRコードを読み取る
            </span>
          </span>
        </Link>

        <Link
          href="/qr-check/print"
          className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 text-slate-900 shadow-sm transition active:scale-[0.98]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <Printer className="h-5 w-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-semibold">QRコードを印刷する</span>
            <span className="text-xs text-slate-500">
              好きなURLのQRコードを作って印刷
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
