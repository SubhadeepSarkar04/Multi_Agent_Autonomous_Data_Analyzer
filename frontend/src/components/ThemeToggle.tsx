"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme, ThemeMode } from "../lib/ThemeContext";
import { Sun, Moon, Laptop, Check } from "lucide-react";

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { mode: ThemeMode; label: string; icon: React.ElementType }[] = [
    { mode: "light", label: "Light Mode", icon: Sun },
    { mode: "dark", label: "Dark Forest", icon: Moon },
    { mode: "system", label: "System Preference", icon: Laptop },
  ];

  const CurrentIcon =
    theme === "system"
      ? Laptop
      : resolvedTheme === "dark"
      ? Moon
      : Sun;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Theme Settings (Light, Dark, System)"
        className={`p-2 rounded-full border transition flex items-center justify-center cursor-pointer ${
          resolvedTheme === "dark"
            ? "bg-[#12382f] border-[#1e4e42] text-[#98bbaf] hover:text-[#f4f3ee] hover:bg-[#174337]"
            : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
        }`}
      >
        <CurrentIcon className="w-4 h-4 text-[#eb5e41]" />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-xl z-50 p-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
            resolvedTheme === "dark"
              ? "bg-[#12382f]/95 border-[#1e4e42] text-[#f4f3ee]"
              : "bg-white/95 border-slate-200 text-slate-900"
          }`}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-60">
            Appearance
          </div>
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => {
                  setTheme(opt.mode);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium transition cursor-pointer ${
                  isSelected
                    ? resolvedTheme === "dark"
                      ? "bg-[#174337] text-[#eb5e41] font-semibold"
                      : "bg-slate-100 text-[#eb5e41] font-semibold"
                    : resolvedTheme === "dark"
                    ? "text-[#98bbaf] hover:bg-[#174337]/60 hover:text-[#f4f3ee]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#eb5e41]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
