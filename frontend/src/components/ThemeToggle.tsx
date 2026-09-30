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
    { mode: "light", label: "Light", icon: Sun },
    { mode: "dark", label: "Dark", icon: Moon },
    { mode: "system", label: "System", icon: Laptop },
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
        className={`p-2 rounded-lg border transition flex items-center justify-center cursor-pointer ${
          resolvedTheme === "dark"
            ? "bg-[#2a2720] border-[#3a3428] text-[#c8c2b6] hover:text-[#e8e2d8] hover:bg-[#3a3428]"
            : "bg-[#ede9e0] border-[#c8c3b8] text-[#7a7268] hover:text-[#4a453e] hover:bg-[#d6d0c6]"
        }`}
      >
        <CurrentIcon className="w-4 h-4 text-[#658a60]" />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-44 rounded-xl border shadow-xl z-50 p-1.5 duration-150 ${
            resolvedTheme === "dark"
              ? "bg-[#2a2720] border-[#3a3428] text-[#c8c2b6]"
              : "bg-[#f4f1ea] border-[#c8c3b8] text-[#4a453e]"
          }`}
        >
          <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            resolvedTheme === "dark" ? "text-[#7a7268]" : "text-[#7a7268]"
          }`}>
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
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg font-medium transition cursor-pointer ${
                  isSelected
                    ? resolvedTheme === "dark"
                      ? "bg-[#3a3428] text-[#d97706] font-semibold"
                      : "bg-[#ede9e0] text-[#658a60] font-semibold"
                    : resolvedTheme === "dark"
                    ? "text-[#a09a8e] hover:bg-[#3a3428] hover:text-[#e8e2d8]"
                    : "text-[#7a7268] hover:bg-[#ede9e0] hover:text-[#4a453e]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#658a60]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
