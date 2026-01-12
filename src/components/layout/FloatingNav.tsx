"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoldingsTable } from "@/components/dashboard/HoldingsTable";
import { useBalanceQuery } from "@/hooks/useBalance";
import { useDashboardStore } from "@/store";
import { usePathname } from "next/navigation";

export function FloatingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { balances, portfolioSummary } = useDashboardStore();
  const { isPending } = useBalanceQuery();
  const pathname = usePathname();

  const totalAsset = portfolioSummary?.totalAsset || 0;

  // Don't show on login page
  if (pathname === "/login") {
    return null;
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed top-6 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-2xl backdrop-blur-xl border border-white/20 transition-all outline-none",
            isOpen ? "bg-white/10" : "bg-black/60 hover:bg-black/80"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isOpen ? "close" : "open"}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <List className="w-6 h-6" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Bottom-to-Top Overlay Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md"
            />

            {/* Full Screen Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="w-full flex justify-between items-center px-6 py-6 border-b border-white/5">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Portfolio List
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-hidden">
                <div className="w-full h-full max-w-2xl mx-auto">
                  <HoldingsTable
                    balances={balances}
                    portfolioTotalAsset={totalAsset}
                    isLoading={isPending && balances.length === 0}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default FloatingNav;
