"use client";

import React from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="h-screen w-full bg-black relative overflow-hidden flex flex-col items-center justify-center text-white font-sans selection:bg-violet-500/30">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.15),transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
      </div>

      {/* Ambient Glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-violet-600/5 rounded-full blur-[120px] pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Content Card */}
      <div className="z-10 flex flex-col items-center text-center p-12 max-w-2xl w-full mx-4 bg-black/20 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl relative">
        {/* Subtle border glow */}
        <div className="absolute inset-0 rounded-3xl bg-linear-to-b from-white/10 to-transparent opacity-50 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-8xl md:text-9xl font-black mb-2 text-transparent bg-clip-text bg-linear-to-b from-white to-white/10 tracking-tighter drop-shadow-[0_0_30px_rgba(139,92,246,0.4)]">
            404
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="relative"
        >
          <h2 className="text-2xl md:text-3xl font-light mb-6 text-white/90 tracking-wide">
            Signal Lost in Deep Space
          </h2>
          <p className="text-white/50 mb-10 max-w-md mx-auto leading-relaxed text-sm md:text-base">
            The coordinates you are looking for do not exist in this sector.
            Return to the command center to re-calibrate your trajectory.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link href="/">
            <button className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/50 rounded-xl transition-all duration-300 flex items-center gap-3 overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-r from-violet-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Home className="w-5 h-5 text-violet-400 group-hover:text-violet-300 transition-colors z-10" />
              <span className="font-medium text-white/90 group-hover:text-white transition-colors z-10 relative">
                Return to Orbit
              </span>
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
