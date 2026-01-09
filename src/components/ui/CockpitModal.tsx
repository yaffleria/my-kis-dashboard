'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, Zap, Activity, X, ChevronRight } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useUIStore } from '@/store/uiStore'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function CockpitModal() {
  const { isCockpitModalOpen, closeCockpitModal } = useUIStore()

  const menuItems = [
    { label: 'SYSTEM CHECK', icon: Activity, color: 'text-emerald-400', border: 'border-emerald-500/50' },
    { label: 'IGNITION', icon: Zap, color: 'text-yellow-400', border: 'border-yellow-500/50' },
    { label: 'COMMS LINK', icon: Radio, color: 'text-cyan-400', border: 'border-cyan-500/50' },
  ]

  return (
    <>
      {/* MODAL OVERLAY */}

      {/* MODAL OVERLAY */}
      <AnimatePresence>
        {isCockpitModalOpen && (
          <div className="fixed inset-0 z-60 flex items-end justify-start pointer-events-none">
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCockpitModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto"
            />

            {/* MODAL CONTENT */}
            <motion.div
              layoutId="cockpit-modal"
              initial={{ opacity: 0, x: -50, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, y: 50, scale: 0.8 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="pointer-events-auto relative ml-8 mb-24 w-80 overflow-hidden"
            >
              {/* Main "HUD" Container */}
              <div className="relative bg-black/90 border border-slate-700 p-1">
                {/* Decorative Angles using borders */}
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-cyan-500/20 rotate-45 transform origin-bottom-right" />

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                  <span className="text-xs font-mono text-cyan-500 tracking-[0.2em] animate-pulse">
                    INCOMING TRANSMISSION
                  </span>
                  <button
                    onClick={closeCockpitModal}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content Grid */}
                <div className="p-4 space-y-3">
                  {menuItems.map((item, idx) => (
                    <motion.button
                      key={item.label}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 + 0.1 }}
                      className={cn(
                        'w-full group relative flex items-center justify-between p-3 border hover:bg-white/5 transition-all text-left',
                        'border-l-4', // Thick left border mark
                        'bg-linear-to-r from-transparent to-transparent hover:from-white/5',
                        item.border
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn('w-5 h-5', item.color)} />
                        <span
                          className={cn(
                            'font-mono text-sm tracking-widest text-slate-300 group-hover:text-white transition-colors'
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />

                      {/* Hover Effect Lines */}
                      <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 pointer-events-none" />
                    </motion.button>
                  ))}
                </div>

                {/* Footer / Status Line */}
                <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>SYS.VER.2.0.4</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-3 bg-cyan-900 animate-pulse" />
                    <div className="w-1 h-3 bg-cyan-800 animate-pulse delay-75" />
                    <div className="w-1 h-3 bg-cyan-500 animate-pulse delay-150" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
