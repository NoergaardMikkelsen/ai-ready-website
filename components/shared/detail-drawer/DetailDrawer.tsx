"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { X } from "lucide-react";

type CheckItem = {
  id: string;
  label: string;
  score?: number;
  status: "pass" | "fail" | "warning" | "pending" | "checking";
  details?: string;
  recommendation?: string;
  actionItems?: string[];
};

type Props = {
  check: CheckItem | null;
  onClose: () => void;
};

const statusLabel: Record<string, string> = {
  pass: "Bestået",
  warning: "Advarsel",
  fail: "Fejlet",
};

const statusColor: Record<string, string> = {
  pass: "text-accent-black bg-black-alpha-4",
  warning: "text-heat-100 bg-heat-8",
  fail: "text-heat-200 bg-heat-8",
};

const barColor: Record<string, string> = {
  pass: "bg-accent-black",
  warning: "bg-heat-100",
  fail: "bg-heat-200",
};

export default function DetailDrawer({ check, onClose }: Props) {
  const isOpen = check !== null;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && check && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[1000] bg-black-alpha-32 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed inset-y-0 right-0 z-[1001] flex flex-col w-full max-w-[460px] bg-accent-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-24 pt-24 pb-20 border-b border-black-alpha-8">
              <div className="flex-1 min-w-0 pr-16">
                <p className="text-label-x-small text-black-alpha-32 uppercase tracking-wider mb-6">
                  Detaljer
                </p>
                <h2 className="text-title-h5 text-accent-black leading-snug">
                  {check.label}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 w-32 h-32 flex items-center justify-center rounded-full hover:bg-black-alpha-4 transition-colors"
              >
                <X className="w-16 h-16 text-black-alpha-48" />
              </button>
            </div>

            {/* Score bar */}
            {check.score !== undefined && (
              <div className="px-24 py-16 border-b border-black-alpha-8">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-label-small text-black-alpha-48">Score</span>
                  <div className="flex items-center gap-8">
                    {check.status in statusLabel && (
                      <span
                        className={`text-label-x-small px-8 py-3 rounded-full font-medium ${
                          statusColor[check.status] ?? ""
                        }`}
                      >
                        {statusLabel[check.status]}
                      </span>
                    )}
                    <span className="text-title-h5 font-bold text-accent-black tabular-nums">
                      {check.score}%
                    </span>
                  </div>
                </div>
                <div className="h-6 bg-black-alpha-8 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${barColor[check.status] ?? "bg-black-alpha-16"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${check.score}%` }}
                    transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-24 py-20 space-y-24">
              {check.details && (
                <div>
                  <p className="text-label-x-small text-black-alpha-32 uppercase tracking-wider mb-8">
                    Status
                  </p>
                  <p className="text-body-medium text-accent-black leading-relaxed">
                    {check.details}
                  </p>
                </div>
              )}

              {check.recommendation && (
                <div>
                  <p className="text-label-x-small text-black-alpha-32 uppercase tracking-wider mb-8">
                    Anbefaling
                  </p>
                  <p className="text-body-medium text-black-alpha-64 leading-relaxed">
                    {check.recommendation}
                  </p>
                </div>
              )}

              {check.actionItems && check.actionItems.length > 0 && (
                <div>
                  <p className="text-label-x-small text-black-alpha-32 uppercase tracking-wider mb-12">
                    Handlingspunkter
                  </p>
                  <ul className="space-y-10">
                    {check.actionItems.map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        className="flex items-start gap-12 text-body-medium text-black-alpha-64 leading-relaxed"
                      >
                        <div className="w-6 h-6 rounded-full bg-heat-100 flex-shrink-0 mt-[6px]" />
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
