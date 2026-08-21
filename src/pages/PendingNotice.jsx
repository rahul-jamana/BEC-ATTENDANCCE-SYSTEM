import React from "react";
import { useAuth } from "../context/AuthContext";
import { Clock, ShieldAlert, LogOut, RefreshCw } from "lucide-react";

export const PendingNotice = () => {
  const { userProfile, logout, refreshProfile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-sky-100 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-blue-200/80 text-center space-y-6">
        <img src="/bec-logo.png" alt="Bhubaneswar Engineering College Logo" className="w-16 h-16 object-contain mx-auto drop-shadow-md" />

        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">
            Verification Pending
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900">Account Pending Admin Approval</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Welcome, <strong>{userProfile?.name}</strong>! Your self-registration request for <strong>{userProfile?.branch}</strong> ({userProfile?.rollNo}) has been received and is awaiting verification by the BEC Administrator.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-left font-mono text-slate-700 space-y-1">
          <div>• Email: {userProfile?.email}</div>
          <div>• Branch: {userProfile?.branch} | Sec: {userProfile?.section}</div>
          <div>• Year: {userProfile?.year} | Sem: {userProfile?.semester}</div>
          <div>• Current Status: PENDING</div>
        </div>

        <div className="flex items-center justify-center space-x-3 pt-2">
          <button
            onClick={refreshProfile}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-blue-500/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Approval Status</span>
          </button>

          <button
            onClick={logout}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
