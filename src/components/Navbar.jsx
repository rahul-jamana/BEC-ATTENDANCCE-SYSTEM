import React from "react";
import { useAuth } from "../context/AuthContext";
import { LogOut, User, Shield, GraduationCap, School, QrCode } from "lucide-react";

export const Navbar = () => {
  const { userProfile, role, logout } = useAuth();

  const getRoleBadge = () => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3.5 h-3.5 text-purple-600" /> Admin
          </span>
        );
      case "teacher":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <School className="w-3.5 h-3.5 text-blue-600" /> Faculty / Teacher
          </span>
        );
      case "student":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" /> Student
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & College Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl gradient-blue-bg flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-slate-900 tracking-tight block leading-none">
                BEC ATTENDANCE
              </span>
              <span className="text-[11px] font-medium text-slate-500 tracking-wider uppercase block mt-0.5">
                Bhubaneswar Engineering College
              </span>
            </div>
          </div>

          {/* User Profile Pill & Actions */}
          {userProfile && (
            <div className="flex items-center space-x-4">
              {getRoleBadge()}

              <div className="hidden md:flex items-center space-x-3 bg-slate-50 py-1.5 px-3 rounded-full border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {userProfile.name?.charAt(0) || "U"}
                </div>
                <div className="text-left text-xs leading-tight">
                  <span className="font-semibold text-slate-800 block truncate max-w-[120px]">
                    {userProfile.name}
                  </span>
                  <span className="text-slate-500 text-[10px] block">
                    {userProfile.rollNo || userProfile.email}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
