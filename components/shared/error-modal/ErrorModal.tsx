"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

type Props = {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  retryLabel?: string;
};

export default function ErrorModal({
  isOpen,
  title = "Noget gik galt",
  message,
  onClose,
  retryLabel = "Prøv igen",
}: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black-alpha-48 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            className="relative bg-accent-white rounded-16 w-full max-w-[440px] p-32 z-[1] shadow-2xl text-center"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
          >
            <div className="mx-auto mb-16 size-56 rounded-full bg-heat-8 flex-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="text-heat-100"
              >
                <path
                  d="M12 8v5m0 3v.01M4.93 19h14.14a2 2 0 0 0 1.74-3L13.74 4a2 2 0 0 0-3.48 0l-7.07 12a2 2 0 0 0 1.74 3Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="text-title-h5 text-accent-black mb-8">{title}</h2>
            <p className="text-body-medium text-black-alpha-64 mb-24">
              {message}
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full px-20 py-12 bg-accent-black hover:bg-black-alpha-80 text-white rounded-8 text-label-medium transition-all"
            >
              {retryLabel}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
