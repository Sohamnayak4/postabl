"use client";

// Shared client-side notification system. Replaces the browser's
// default alert()/confirm() dialogs which look like Windows 95.
//
// Usage:
//   const notify = useNotify();
//   notify.toast("Saved to your library.");
//   notify.toast("Couldn't save the image.", { tone: "error" });
//   const ok = await notify.confirm({
//     title: "Remove this image?",
//     description: "This can't be undone.",
//     destructive: true,
//   });
//
// The provider mounts once in app/layout.tsx; the toast stack and any
// open confirm modal render via fixed-position portals that overlay
// the page.

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type ToastTone = "info" | "success" | "error";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmState = ConfirmOptions & {
  resolve: (ok: boolean) => void;
};

type NotifyApi = {
  toast: (
    message: string,
    opts?: { tone?: ToastTone; duration?: number }
  ) => () => void; // returns a dismiss handle
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const NotifyContext = createContext<NotifyApi | null>(null);

export function useNotify(): NotifyApi {
  const ctx = useContext(NotifyContext);
  if (!ctx)
    throw new Error("useNotify must be used inside <NotifyProvider>");
  return ctx;
}

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const toast = useCallback<NotifyApi["toast"]>((message, opts = {}) => {
    const id = Date.now() + Math.random();
    const tone = opts.tone ?? "info";
    const duration = opts.duration ?? 3500;
    setToasts((prev) => [...prev, { id, message, tone }]);
    let cancelled = false;
    const dismiss = () => {
      cancelled = true;
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };
    if (Number.isFinite(duration) && duration > 0) {
      setTimeout(() => {
        if (!cancelled) dismiss();
      }, duration);
    }
    return dismiss;
  }, []);

  const confirm = useCallback<NotifyApi["confirm"]>((opts) => {
    return new Promise((resolve) => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  function closeConfirm(ok: boolean) {
    if (!confirmState) return;
    confirmState.resolve(ok);
    setConfirmState(null);
  }

  // Escape closes an open confirm dialog as a cancel.
  useEffect(() => {
    if (!confirmState) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeConfirm(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmState]);

  return (
    <NotifyContext.Provider value={{ toast, confirm }}>
      {children}

      {/* TOAST STACK */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-2 rounded-full border bg-white px-4 py-2 font-mono text-[12px] tracking-wide shadow-tools animate-toast-in ${
              t.tone === "error"
                ? "border-accent/40 text-accent"
                : "border-line text-ink"
            }`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background:
                  t.tone === "error"
                    ? "var(--accent)"
                    : t.tone === "success"
                      ? "#1f7a3e"
                      : "var(--ink)",
              }}
            />
            {t.message}
          </div>
        ))}
      </div>

      {/* CONFIRM MODAL */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-ink/40 px-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeConfirm(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-tools animate-confirm-in"
          >
            <div className="px-6 pt-6 pb-5">
              <h2
                id="confirm-title"
                className="font-serif text-[22px] font-medium leading-[1.15] tracking-tight text-ink"
              >
                {confirmState.title}
              </h2>
              {confirmState.description && (
                <p className="mt-2 text-[13px] leading-[1.55] text-ink-soft">
                  {confirmState.description}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-line bg-bg-alt px-5 py-3">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink-soft transition-all hover:border-ink hover:text-ink"
              >
                {confirmState.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                autoFocus
                className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
                  confirmState.destructive
                    ? "bg-accent text-white hover:bg-[#b33a1e]"
                    : "bg-ink text-bg hover:bg-black"
                }`}
              >
                {confirmState.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotifyContext.Provider>
  );
}
