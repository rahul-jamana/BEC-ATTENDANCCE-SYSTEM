import React, { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X, Camera, AlertTriangle, CheckCircle2, QrCode, Sparkles } from "lucide-react";
import { DataService } from "../services/dataService";

export const QRScannerModal = ({ isOpen, onClose, studentProfile, onSuccess }) => {
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [manualTokenInput, setManualTokenInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setSuccessMsg("");
      setScanResult(null);

      // Initialize Html5QrcodeScanner when modal opens
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
          );

          scanner.render(
            (decodedText) => {
              handleQRScanned(decodedText);
              scanner.clear();
            },
            (error) => {
              // Ignore scan frame error
            }
          );
          scannerRef.current = scanner;
        } catch (e) {
          console.warn("Camera initialization notice:", e);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }
      };
    }
  }, [isOpen]);

  const processAttendanceData = async (parsedData) => {
    setIsProcessing(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Fetch active sessions to find matching session
      const sessions = await DataService.getSessions();
      const targetSession = sessions.find(s => s.id === parsedData.sessionId);

      if (!targetSession) {
        throw new Error("Invalid Session QR code!");
      }

      // 2. Execute attendance marking & validation rules in DataService
      const record = await DataService.markAttendance({
        student: studentProfile,
        session: targetSession,
        token: parsedData.token
      });

      setSuccessMsg(`✅ Attendance Marked Successfully for ${targetSession.subjectName || "Class"}!`);
      if (onSuccess) onSuccess(record);
      setTimeout(() => {
        onClose();
      }, 2200);

    } catch (err) {
      setErrorMsg(err.message || "Failed to mark attendance.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRScanned = (decodedText) => {
    try {
      const data = JSON.parse(decodedText);
      if (!data.sessionId || !data.token) {
        throw new Error("Unrecognized QR Code format.");
      }
      processAttendanceData(data);
    } catch (e) {
      setErrorMsg(e.message || "Invalid QR Code scanned.");
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) return;
    try {
      const data = JSON.parse(manualTokenInput.trim());
      processAttendanceData(data);
    } catch (e) {
      setErrorMsg("Invalid token string syntax. Please scan the QR code.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 relative animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="gradient-header text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-6 h-6" />
            <h3 className="text-lg font-bold">Class Attendance QR Scanner</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          
          {/* Target Student Info Tag */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-500 block">Student Roster Match Filter:</span>
              <span className="font-bold text-slate-800">
                {studentProfile?.branch} | {studentProfile?.year} Year | Sec {studentProfile?.section}
              </span>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
              Roll: {studentProfile?.rollNo}
            </span>
          </div>

          {/* Success Message Banner */}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl flex items-start space-x-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">{successMsg}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  Verified Branch, Year & Section match. Your dashboard is updating...
                </p>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-xl flex items-start space-x-3 animate-in fade-in">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Attendance Failed</p>
                <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Camera Viewport */}
          <div className="relative rounded-xl overflow-hidden bg-slate-900 min-h-[260px] flex flex-col items-center justify-center border-2 border-dashed border-slate-300">
            <div id="reader" className="w-full"></div>
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center text-white space-x-2">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-semibold">Validating Section & Token...</span>
              </div>
            )}
          </div>

          {/* Manual Token Code Fallback */}
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer font-medium hover:text-slate-800 transition-colors py-1 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> Camera not opening? Use manual token code
            </summary>
            <form onSubmit={handleManualSubmit} className="mt-2 space-y-2">
              <input
                type="text"
                placeholder='Paste QR JSON token string...'
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors"
              >
                Submit Token
              </button>
            </form>
          </details>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
          >
            Close Scanner
          </button>
        </div>

      </div>
    </div>
  );
};
