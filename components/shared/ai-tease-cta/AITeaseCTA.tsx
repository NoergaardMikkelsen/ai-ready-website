"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

type Props = {
  onClick: () => void;
};

export default function AITeaseCTA({ onClick }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5] px-16 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
        className="pointer-events-auto bg-accent-white rounded-16 shadow-2xl border border-black-alpha-8 max-w-[440px] w-full p-24 md:p-32 text-center"
      >
        <div className="mx-auto mb-16 size-56 rounded-full bg-heat-8 flex-center">
          <Sparkles className="w-24 h-24 text-heat-100" />
        </div>
        <h3 className="text-title-h5 text-accent-black mb-8">
          Lås den fulde AI-analyse op
        </h3>
        <p className="text-body-medium text-black-alpha-64 mb-24">
          Få 8 dybdegående indsigter om hvordan AI-systemer forstår din side,
          plus konkrete handlingspunkter — gratis.
        </p>
        <button
          type="button"
          onClick={onClick}
          className="w-full px-20 py-12 bg-accent-black hover:bg-black-alpha-80 text-white rounded-8 text-label-medium transition-all"
        >
          Lås AI-analysen op
        </button>
      </motion.div>
    </div>
  );
}
