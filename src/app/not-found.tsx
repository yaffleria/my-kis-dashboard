"use client";

import Link from "next/link";
import { TerminalHeader } from "@/components/terminal";

export default function NotFound() {
  return (
    <div className="h-screen w-full bg-terminal-bg text-terminal-text font-mono flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <TerminalHeader title="ERROR 404" ip="UNKNOWN" status="NOT FOUND" />

        <div className="border border-brew-red p-8 bg-terminal-bg relative opacity-90 shadow-[0_0_15px_rgba(255,0,0,0.15)] animate-pulse">
          <div className="absolute top-0 left-0 w-2 h-2 bg-brew-red" />
          <div className="absolute top-0 right-0 w-2 h-2 bg-brew-red" />
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-brew-red" />
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-brew-red" />

          <div className="text-center space-y-6">
            <h1 className="text-6xl font-bold text-brew-red custom-text-shadow tracking-tighter">
              404
            </h1>
            <div className="space-y-2">
              <p className="text-xl font-bold text-brew-red">PAGE NOT FOUND</p>
              <div className="h-px bg-brew-red/50 w-full my-4" />
              <p className="text-sm text-terminal-muted leading-relaxed">
                THE REQUESTED RESOURCE COULD NOT BE LOCATED.
                <br />
                PLEASE VERIFY THE URL OR CONTACT THE ADMINISTRATOR.
              </p>
            </div>

            <div className="pt-6">
              <Link
                href="/"
                className="inline-block border border-brew-red text-brew-red hover:bg-brew-red hover:text-terminal-bg px-6 py-2 text-sm font-bold transition-all uppercase tracking-wider"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
