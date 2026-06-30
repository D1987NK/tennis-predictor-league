"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * One-time full-screen splash shown after an admin imports results.
 * Styled like the welcome screen (dark court green). Shows once per results
 * version per device — it records the seen version in a cookie on mount.
 */
export function ResultsUpdateSplash({ version }: { version: string }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      document.cookie = `tpl_results_seen=${version}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      /* ignore */
    }
  }, [version]);

  if (!open) return null;

  return (
    <div
      dir="rtl"
      lang="fa"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{
        background:
          "radial-gradient(1200px 500px at 50% -10%, rgba(34,197,94,0.28), transparent 60%), #0c1f14",
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-3xl border border-primary/40 bg-[#0e2417]/90 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-primary/15 text-4xl">
          🎾
        </div>
        <h2 className="text-2xl font-extrabold text-white">نتایج آپدیت شد</h2>
        <p className="mt-2 text-sm text-emerald-200/80">
          امتیازها و جدول رده‌بندی به‌روزرسانی شد
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => {
              setOpen(false);
              router.push("/leaderboard");
            }}
            className="tap rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            مشاهده نتایج
          </button>
          <button
            onClick={() => setOpen(false)}
            className="tap rounded-xl px-6 py-2 text-sm text-emerald-200/70 hover:text-emerald-100"
          >
            باشه
          </button>
        </div>
      </div>
    </div>
  );
}
