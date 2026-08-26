import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, AlertTriangle, CheckCircle2, ShieldCheck, QrCode, RefreshCw, ArrowRight } from "lucide-react";
import { DataService } from "../services/dataService";
import { uploadPhotoToCloudinary } from "../services/cloudinaryService";

export const QRScannerModal = ({ isOpen, onClose, studentProfile, onSuccess }) => {
  const [step, setStep] = useState("selfie"); // "selfie" | "qr"
  const [selfieDataUrl, setSelfieDataUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSelfieCameraActive, setIsSelfieCameraActive] = useState(false);
  const [isQrScannerActive, setIsQrScannerActive] = useState(false);

  // Refs for Selfie Capture
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Ref for Html5Qrcode Scanner
  const qrScannerRef = useRef(null);

  // -------------------------------------------------------------
  // RESET STATE & MANAGE LIFECYCLE
  // -------------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      setStep("selfie");
      setSelfieDataUrl(null);
      setErrorMsg("");
      setSuccessMsg("");
      setIsProcessing(false);
      startSelfieCamera();
    } else {
      stopSelfieCamera();
      stopQrScanner();
    }

    return () => {
      stopSelfieCamera();
      stopQrScanner();
    };
  }, [isOpen]);

  // -------------------------------------------------------------
  // STEP 1: SELFIE CAMERA LOGIC
  // -------------------------------------------------------------
  const startSelfieCamera = async () => {
    stopSelfieCamera();
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsSelfieCameraActive(true);
      }
    } catch (err) {
      console.warn("Student selfie camera error:", err);
      setErrorMsg("Front camera access required to capture live photo. Please enable camera permissions.");
      setIsSelfieCameraActive(false);
    }
  };

  const stopSelfieCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsSelfieCameraActive(false);
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setSelfieDataUrl(dataUrl);
    stopSelfieCamera();
  };

  const retakeSelfie = () => {
    setSelfieDataUrl(null);
    startSelfieCamera();
  };

  const proceedToQRScan = () => {
    if (!selfieDataUrl) return;
    stopSelfieCamera();
    setStep("qr");
  };

  // -------------------------------------------------------------
  // STEP 2: QR CODE SCANNER LOGIC
  // -------------------------------------------------------------
  useEffect(() => {
    let html5QrCode = null;
    let isMounted = true;

    if (isOpen && step === "qr") {
      const timer = setTimeout(async () => {
        try {
          const element = document.getElementById("qr-reader-target");
          if (!element || !isMounted) return;

          html5QrCode = new Html5Qrcode("qr-reader-target");
          qrScannerRef.current = html5QrCode;

          const config = { fps: 10, qrbox: { width: 220, height: 220 } };

          const onScanSuccess = (decodedText) => {
            handleQRScanned(decodedText, html5QrCode);
          };

          // Try back camera first, fallback to user facing
          try {
            await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {});
            if (isMounted) setIsQrScannerActive(true);
          } catch (backErr) {
            console.warn("Back camera failed, trying front camera:", backErr);
            try {
              await html5QrCode.start({ facingMode: "user" }, config, onScanSuccess, () => {});
              if (isMounted) setIsQrScannerActive(true);
            } catch (err) {
              console.warn("QR Camera error:", err);
              if (isMounted) setErrorMsg("Camera error while scanning QR code. Please ensure camera permissions are allowed.");
            }
          }
        } catch (e) {
          console.warn("Html5Qrcode init error:", e);
        }
      }, 400);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        stopQrScanner();
      };
    }
  }, [isOpen, step]);

  const stopQrScanner = () => {
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current
          .stop()
          .then(() => {
            qrScannerRef.current?.clear();
            qrScannerRef.current = null;
          })
          .catch(() => {
            qrScannerRef.current?.clear();
            qrScannerRef.current = null;
          });
      } catch (e) {}
    }
    setIsQrScannerActive(false);
  };

  const handleQRScanned = async (decodedText, qrInstance) => {
    try {
      const data = JSON.parse(decodedText);
      if (!data.sessionId || !data.token) {
        throw new Error("Unrecognized QR Code format.");
      }

      if (qrInstance) {
        try { await qrInstance.stop(); } catch (e) {}
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
      const persistedSession = sessions.find((s) => s.id === parsedData.sessionId);

      const targetSession = persistedSession || {
        id: parsedData.sessionId,
        branch: parsedData.branch,
        year: parsedData.year,
        section: parsedData.section,
        semester: parsedData.semester,
        subjectId: parsedData.subjectId,
        subjectName: parsedData.subjectName || "Class Lecture",
        teacherName: parsedData.teacherName || "Faculty",
        token: parsedData.token,
        isActive: true
      };

      if (!targetSession || !targetSession.id) {
        throw new Error("Invalid Session QR code!");
      }

      if (!selfieDataUrl) {
        throw new Error("Live selfie is required before attendance can be marked.");
      }

      // Try Cloudinary upload, fallback directly to selfieDataUrl if unconfigured
      let finalPhotoUrl = selfieDataUrl;
      try {
        const cdnRes = await uploadPhotoToCloudinary(selfieDataUrl, "student_live_photos", ["student", "temp_30days"]);
        if (cdnRes?.url) {
          finalPhotoUrl = cdnRes.url;
        }
      } catch (e) {
        console.warn("Cloudinary upload skipped, using live selfie photo data:", e.message);
      }

      const record = await DataService.markAttendance({
        student: studentProfile,
        session: targetSession,
        token: parsedData.token,
        livePhoto: finalPhotoUrl
      });

      setSuccessMsg(`✅ Attendance Marked Successfully for ${targetSession.subjectName || "Class"}!`);
      if (onSuccess) onSuccess(record);

      setTimeout(() => {
        stopQrScanner();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 relative animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="gradient-header text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs shrink-0">
              <img src="/bec-logo.png" alt="BEC Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Student Attendance Verification</h3>
              <p className="text-[11px] text-blue-100">
                {step === "selfie" ? "Step 1 of 2: Capture Live Photo" : "Step 2 of 2: Scan Classroom QR"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSelfieCamera();
              stopQrScanner();
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Stepper Progress Bar */}
        <div className="bg-slate-100 px-5 py-2 flex items-center justify-between border-b border-slate-200 text-xs">
          <div className={`flex items-center space-x-1.5 font-bold ${step === 'selfie' ? 'text-blue-700' : 'text-emerald-700'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-mono ${step === 'selfie' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
              {selfieDataUrl ? '✓' : '1'}
            </span>
            <span>1. Capture Live Selfie</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

          <div className={`flex items-center space-x-1.5 font-bold ${step === 'qr' ? 'text-blue-700' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-mono ${step === 'qr' ? 'bg-blue-600' : 'bg-slate-300'}`}>
              2
            </span>
            <span>2. Scan QR Code</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          
          {/* Student Profile Info Tag */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs flex items-center justify-between gap-3">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Student Roster</span>
              <span className="font-extrabold text-slate-800 text-sm">{studentProfile?.name}</span>
              <span className="block text-[11px] text-slate-500 font-mono">Roll: {studentProfile?.rollNo} ({studentProfile?.branch} Sec-{studentProfile?.section})</span>
            </div>

            {selfieDataUrl && (
              <div className="relative shrink-0">
                <img src={selfieDataUrl} alt="Student Selfie" className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 shadow-sm" />
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5" title="Live Selfie Verified">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
            )}
          </div>

          {/* Success Message Banner */}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl flex items-start space-x-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">{successMsg}</p>
                <p className="text-xs text-emerald-600 mt-1">Live photo verified &amp; saved with timestamp.</p>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-2xl flex items-start space-x-3 animate-in fade-in">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Notice</p>
                <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              STEP 1 VIEW: CAPTURE LIVE SELFIE
              ------------------------------------------------------------- */}
          {step === "selfie" && (
            <div className="space-y-4">
              <canvas ref={canvasRef} className="hidden" />

              <div className="relative rounded-2xl overflow-hidden bg-slate-950 min-h-[260px] flex flex-col items-center justify-center border border-slate-200 shadow-inner">
                {selfieDataUrl ? (
                  <div className="relative w-full h-[260px] flex flex-col items-center justify-center p-2">
                    <img src={selfieDataUrl} alt="Captured Selfie" className="h-[240px] w-auto rounded-xl object-contain shadow-md border-2 border-emerald-400" />
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selfie Captured
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-[260px] flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {isSelfieCameraActive && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-dashed border-sky-400 rounded-full relative shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded font-mono">
                            Center Face
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons for Selfie */}
              {!selfieDataUrl ? (
                <button
                  onClick={captureSelfie}
                  disabled={!isSelfieCameraActive}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>SNAP LIVE SELFIE PHOTO</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={retakeSelfie}
                    className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake</span>
                  </button>

                  <button
                    onClick={proceedToQRScan}
                    className="py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>SCAN QR CODE ➡️</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------------
              STEP 2 VIEW: SCAN CLASSROOM QR CODE
              ------------------------------------------------------------- */}
          {step === "qr" && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 min-h-[260px] flex flex-col items-center justify-center border border-slate-200 shadow-inner">
                <div id="qr-reader-target" className="w-full h-full"></div>

                {isQrScannerActive && !isProcessing && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-52 h-52 border-2 border-blue-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
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
                    <span className="text-sm font-bold">Verifying Live Photo &amp; Token...</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-xs">
                <button
                  onClick={() => {
                    stopQrScanner();
                    setStep("selfie");
                    startSelfieCamera();
                  }}
                  className="text-blue-700 font-bold hover:underline cursor-pointer"
                >
                  ⬅️ Retake Live Selfie
                </button>
                <span className="text-slate-400 font-mono text-[11px]">Facing: Classroom Projector</span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="flex items-center gap-1 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Live Selfie Verified
          </span>
          <button
            onClick={() => {
              stopSelfieCamera();
              stopQrScanner();
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
