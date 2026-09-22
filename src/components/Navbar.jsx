import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Shield, GraduationCap, School } from "lucide-react";

export const Navbar = () => {
  const { userProfile, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthPage = ["/login", "/signup", "/login/ayush"].includes(location.pathname);

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (!confirmed) return;

    await logout();
    navigate("/login");
  };

  const getRoleBadge = () => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">Admin</span>
          </span>
        );
      case "teacher":
        return (
          <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
            <School className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Faculty</span>
          </span>
        );
      case "student":
        return (
          <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Student</span>
          </span>
        );
      default:
        return null;
    }
  };

  if (isAuthPage) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & College Brand */}
          <div 
            onClick={() => {
              if (role === "admin") navigate("/admin");
              else if (role === "teacher") navigate("/teacher");
              else if (role === "student") navigate("/student");
              else navigate("/login");
            }}
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer select-none shrink-0 min-w-0"
          >
            <img 
              src="/bec-logo.png" 
              alt="Bhubaneswar Engineering College Logo" 
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-lg drop-shadow-xs hover:scale-105 transition-transform shrink-0" 
            />
            <div className="truncate">
              <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight block leading-tight truncate">
                BEC CAMPUS
              </span>
              <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase hidden sm:block truncate">
                Bhubaneswar Engineering College
              </span>
            </div>
          </div>

          {/* User Profile Pill & Actions */}
          {!isAuthPage && userProfile && (
            <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
              {/* Library / Dashboard Quick Nav Button */}
              {location.pathname === "/library" ? (
                <button
                  onClick={() => {
                    if (role === "admin") navigate("/admin");
                    else if (role === "teacher") navigate("/teacher");
                    else navigate("/student");
                  }}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200 cursor-pointer shrink-0"
                >
                  <span>← Dashboard</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate("/library")}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-200 shadow-2xs cursor-pointer shrink-0"
                >
                  <span>📚 Library</span>
                </button>
              )}

              {getRoleBadge()}

              {/* User Name Pill for Tablet/Desktop */}
              <div className="hidden md:flex items-center space-x-2.5 bg-slate-50 py-1 px-2.5 rounded-full border border-slate-200 shrink-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {userProfile.name?.charAt(0) || "U"}
                </div>
                <div className="text-left text-xs leading-tight">
                  <span className="font-semibold text-slate-800 block truncate max-w-[100px]">
                    {userProfile.name}
                  </span>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition-colors border border-slate-200 cursor-pointer shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
