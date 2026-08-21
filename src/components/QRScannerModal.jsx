import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, AlertTriangle, CheckCircle2, MapPin } from "lucide-react";
import { DataService } from "../services/dataService";

export const QRScannerModal = ({ isOpen, onClose, studentProfile, onSuccess }) => {
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    let html5QrCode = null;

    if (isOpen) {
      setErrorMsg("");
      setSuccessMsg("");
      setIsProcessing(false);
      setIsCameraRunning(false);

      const timer = setTimeout(() => {
        try {
          const element = document.getElementById("qr-reader-target");
          if (!element) return;

          html5QrCode = new Html5Qrcode("qr-reader-target");
          scannerRef.current = html5QrCode;

          const config = { fps: 10, qrbox: { width: 220, height: 220 } };

          const onScanSuccess = (decodedText) => {
            handleQRScanned(decodedText, html5QrCode);
          };

          // Start camera automatically
          html5QrCode
            .start({ facingMode: "environment" }, config, onScanSuccess, () => {})
            .then(() => {
              setIsCameraRunning(true);
            })
            .catch(() => {
              // Fallback to user facing camera
              html5QrCode
                .start({ facingMode: "user" }, config, onScanSuccess, () => {})
                .then(() => {
                  setIsCameraRunning(true);
                })
                .catch((err) => {
                  console.warn("Camera start permission error:", err);
                  setErrorMsg("Camera access required to scan classroom QR code. Please enable camera permission in your browser.");
                });
            });
        } catch (e) {
          console.warn("Html5Qrcode init error:", e);
        }
      }, 250);

      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          })
          .catch(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          });
      } catch (e) {
        // ignore stop error
      }
    }
    setIsCameraRunning(false);
  };

  const handleQRScanned = async (decodedText, qrInstance) => {
    try {
      const data = JSON.parse(decodedText);
      if (!data.sessionId || !data.token) {
        throw new Error("Unrecognized QR Code format.");
      }

      if (qrInstance) {
        try {
          await qrInstance.stop();
        } catch (e) {}
      }

      await processAttendanceData(data);
    } catch (e) {
      setErrorMsg(e.message || "Invalid QR Code scanned.");
    }
  };

  const processAttendanceData = async (parsedData) => {
    setIsProcessing(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const sessions = await DataService.getSessions();
      const targetSession = sessions.find((s) => s.id === parsedData.sessionId);

      if (!targetSession) {
        throw new Error("Invalid Session QR code!");
      }

      const record = await DataService.markAttendance({
        student: studentProfile,
        session: targetSession,
        token: parsedData.token,
      });

      setSuccessMsg(`✅ Attendance Marked Successfully for ${targetSession.subjectName || "Class"}!`);
      if (onSuccess) onSuccess(record);

      setTimeout(() => {
        stopCamera();
        onClose();
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to mark attendance.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 relative animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="gradient-header text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs shrink-0">
              <img src="/bec-logo.png" alt="Bhubaneswar Engineering College Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Scan Class QR Code</h3>
              <p className="text-[11px] text-blue-100">Bhubaneswar Engineering College</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Student Profile Info Tag */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Student Profile</span>
                <span className="font-bold text-slate-800 text-sm">{studentProfile?.name}</span>
              </div>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full font-bold text-xs">
                Roll: {studentProfile?.rollNo}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 font-medium">
              Section: <strong>{studentProfile?.branch} - {studentProfile?.year} Yr (Sec {studentProfile?.section})</strong>
            </div>
          </div>

          {/* Success Message Banner */}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl flex items-start space-x-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">{successMsg}</p>
                <p className="text-xs text-emerald-600 mt-1">Verified Branch, Year & Section match. Dashboard updating...</p>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-2xl flex items-start space-x-3 animate-in fade-in">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Scan Notice</p>
                <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Clean Camera Viewfinder Container */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 min-h-[260px] flex flex-col items-center justify-center border border-slate-200 shadow-inner">
            <div id="qr-reader-target" className="w-full h-full"></div>

            {/* Viewfinder Target Scanning Frame Overlay */}
            {isCameraRunning && !isProcessing && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-52 border-2 border-blue-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
                  {/* Corner reticle brackets */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-xs flex items-center justify-center text-white space-x-2 z-20">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold">Verifying Token & Marking Attendance...</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
