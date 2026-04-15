"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import "./hubspot-gate.css";

const PORTAL_ID = "2106542";
const FORM_ID = "dc199324-bd49-49eb-a776-2aec4f073a8e";
const HS_SCRIPT_SRC = `https://js.hsforms.net/forms/embed/developer/${PORTAL_ID}.js`;

let hubspotScriptPromise: Promise<void> | null = null;

function loadHubspotScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (hubspotScriptPromise) return hubspotScriptPromise;

  hubspotScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${HS_SCRIPT_SRC}"]`,
    );
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = HS_SCRIPT_SRC;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load HubSpot script"));
    document.head.appendChild(script);
  });

  return hubspotScriptPromise;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  websiteUrl: string;
};

export default function HubspotGate({
  isOpen,
  onClose,
  onSuccess,
  websiteUrl,
}: Props) {
  const formContainerRef = useRef<HTMLDivElement | null>(null);
  const submittedRef = useRef(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    loadHubspotScript()
      .then(() => {
        if (!cancelled) setScriptLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const container = formContainerRef.current;
    if (!container) return;

    const prefillWebsite = () => {
      const input = container.querySelector<HTMLInputElement>(
        'input[name*="website" i], input[name*="url" i]',
      );
      if (!input || input.value === websiteUrl) return false;

      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeSetter?.call(input, websiteUrl);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    };

    // Retry a few times while React hydrates the form island.
    const retries = [0, 100, 300, 700, 1500, 3000];
    const timers = retries.map(ms => window.setTimeout(prefillWebsite, ms));

    const observer = new MutationObserver(() => {
      prefillWebsite();
      // Detect post-submit state: HubSpot replaces the form with a
      // "Form submitted" rich-text block, at which point there is no
      // longer an email input inside the container.
      if (submittedRef.current && !container.querySelector('input[type="email"]')) {
        submittedRef.current = false;
        onSuccess();
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    // Catch the submit event in the capture phase so we fire even if
    // HubSpot's own handler calls stopPropagation downstream.
    function handleSubmit(event: Event) {
      const form = event.target as HTMLFormElement | null;
      if (!form || form.tagName !== "FORM") return;
      submittedRef.current = true;

      // Fallback: if the DOM-replacement signal never arrives (network
      // timeout, validation error, etc.), give up after 12s so we don't
      // hold the submittedRef flag forever.
      window.setTimeout(() => {
        submittedRef.current = false;
      }, 12000);
    }
    container.addEventListener("submit", handleSubmit, true);

    // Legacy embed still emits this — keep as a belt-and-braces fallback.
    function handleMessage(event: MessageEvent) {
      const data = event.data as
        | { type?: string; eventName?: string }
        | undefined;
      if (data?.type !== "hsFormCallback") return;
      if (data.eventName === "onFormReady") {
        prefillWebsite();
      }
      if (data.eventName === "onFormSubmitted") {
        setTimeout(onSuccess, 400);
      }
    }
    window.addEventListener("message", handleMessage);

    return () => {
      timers.forEach(t => window.clearTimeout(t));
      observer.disconnect();
      container.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("message", handleMessage);
    };
  }, [isOpen, websiteUrl, onSuccess]);

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
    <>
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
              className="relative bg-accent-white rounded-16 w-full max-w-[680px] p-20 md:p-40 z-[1] shadow-2xl max-h-[92vh] overflow-y-auto"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
            >
              <button
                type="button"
                className="absolute top-16 right-16 w-32 h-32 rounded-full hover:bg-black-alpha-4 flex-center text-accent-black"
                onClick={onClose}
                aria-label="Luk"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 1L13 13M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <h2 className="text-title-h5 text-accent-black mb-8 pr-32 break-words">
                Lås den fulde AI-analyse op
              </h2>
              <p className="text-body-small md:text-body-medium text-black-alpha-64 mb-20 md:mb-24">
                Indtast dine kontaktoplysninger, så låser vi den dybdegående
                AI-analyse af{" "}
                <span className="text-accent-black font-medium break-all">
                  {websiteUrl || "din side"}
                </span>{" "}
                op.
              </p>

              <div className="min-h-[280px] relative">
                <div
                  ref={formContainerRef}
                  className="hs-form-html nm-hubspot-form"
                  data-region="na1"
                  data-form-id={FORM_ID}
                  data-portal-id={PORTAL_ID}
                />
                {!scriptLoaded && !loadError && (
                  <div className="absolute inset-0 flex items-center justify-center text-body-small text-black-alpha-48">
                    Henter formular…
                  </div>
                )}
                {loadError && (
                  <div className="absolute inset-0 flex items-center justify-center text-body-small text-heat-200 text-center px-16">
                    Kunne ikke hente formularen. Tjek din forbindelse og prøv igen.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
