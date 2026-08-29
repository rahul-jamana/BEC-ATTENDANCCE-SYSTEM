import React from "react";
import { Sparkles, ExternalLink, ShieldCheck, Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="w-full bg-white/80 backdrop-blur-md border-t border-slate-200/80 py-4 px-4 sm:px-6 lg:px-8 mt-auto text-center text-xs text-slate-600 select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        
        {/* Left: Institution Copyright */}
        <div className="flex items-center space-x-2 text-slate-500 font-medium text-[11px] sm:text-xs">
          <span>&copy; {new Date().getFullYear()} Bhubaneswar Engineering College (BEC). All rights reserved.</span>
        </div>

        {/* Right / Center: Designed & Developed by Ayush Technologies */}
        <div className="flex items-center space-x-1.5 font-semibold text-slate-700 text-xs">
          <span className="text-slate-500">Designed &amp; Developed by</span>
          <a
            href="https://www.ayushtechnologies.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-extrabold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200 transition-all hover:scale-105 shadow-xs"
            title="Visit Ayush Technologies Official Website"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>Ayush Technologies</span>
            <ExternalLink className="w-3 h-3 text-blue-500" />
          </a>
        </div>

      </div>
    </footer>
  );
};
