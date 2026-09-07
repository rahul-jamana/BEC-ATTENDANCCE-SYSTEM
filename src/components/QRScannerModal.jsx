import React, { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import { X, Camera, AlertTriangle, CheckCircle2, ShieldCheck, QrCode, RefreshCw, ArrowRight, ExternalLink, SwitchCamera } from "lucide-react";
import { DataService } from "../services/dataService";
import { uploadPhotoToCloudinary } from "../services/cloudinaryService";

// Helper to detect if running in an iOS In-App Browser (WhatsApp, Instagram, FB, Telegram, etc.)
const isInAppBrowser = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isWebview = isIOS && (
    ua.includes("FBAN") ||
    ua.includes("FBAV") ||
    ua.includes("Instagram") ||
    ua.includes("WhatsApp") ||
    ua.includes("Telegram") ||
    ua.includes("Line") ||
    ua.includes("MicroMessenger") ||
    ua.includes("LinkedInApp")
  );
  return { isIOS, isWebview };
};

export const QRScannerModal = ({ isOpen, onClose, studentProfile, onSuccess }) => {
  const [step, setStep] = useState("selfie"); // "selfie" | "qr"
  const [selfieDataUrl, setSelfieDataUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSelfieCameraActive, setIsSelfieCameraActive] = useState(false);
  const [isQrScannerActive, setIsQrScannerActive] = useState(false);
  const [qrFacingMode, setQrFacingMode] = useState("environment"); // "environment" | "user"
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  // Refs for Selfie Capture
  const selfieVideoRef = useRef(null);
  const selfieCanvasRef = useRef(null);
  const selfieStreamRef = useRef(null);

  // Refs for Direct iOS-Native QR Scanner
  const qrVideoRef = useRef(null);
  const qrCanvasRef = useRef(null);
  const qrStreamRef = useRef(null);
  const scanAnimationRef = useRef(null);
  const isScanningRef = useRef(false);

  const { isIOS, isWebview } = isInAppBrowser();

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
      setShowTroubleshoot(false);
      setQrFacingMode("environment");
      startSelfieCamera();
    } else {
      cleanupAll();
    }

    return () => {
      cleanupAll();
    };
  }, [isOpen]);

  const cleanupAll = () => {
    stopSelfieCamera();
    stopQrCamera();
  };

  // -------------------------------------------------------------
  // STEP 1: SELFIE CAMERA LOGIC (Front Camera)
  // -------------------------------------------------------------
  const startSelfieCamera = async () => {
    stopSelfieCamera();
    setErrorMsg("");
    setShowTroubleshoot(false);

    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
      } catch (err) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false
        });
      }

      selfieStreamRef.current = stream;
      if (selfieVideoRef.current) {
        selfieVideoRef.current.srcObject = stream;
        selfieVideoRef.current.setAttribute("playsinline", "true");
        selfieVideoRef.current.setAttribute("webkit-playsinline", "true");
        selfieVideoRef.current.muted = true;
        try {
          await selfieVideoRef.current.play();
        } catch (e) {
          console.warn("Selfie video play error:", e);
        }
        setIsSelfieCameraActive(true);
      }
    } catch (err) {
      console.warn("Student selfie camera error:", err);
      setShowTroubleshoot(true);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Camera permission denied. On iPhone, go to Settings > Safari > Camera and set to 'Allow'.");
      } else {
        setErrorMsg("Front camera could not be accessed. Please ensure no other app is using the camera and reload.");
      }
      setIsSelfieCameraActive(false);
    }
  };

  const stopSelfieCamera = () => {
    if (selfieStreamRef.current) {
      try {
        selfieStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      selfieStreamRef.current = null;
    }
    if (selfieVideoRef.current) {
      try {
        selfieVideoRef.current.srcObject = null;
      } catch (e) {}
    }
    setIsSelfieCameraActive(false);
  };

  const captureSelfie = () => {
    if (!selfieVideoRef.current || !selfieCanvasRef.current) return;
    const video = selfieVideoRef.current;
    const canvas = selfieCanvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");

    // Draw mirrored selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
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
    // 350ms delay for iOS hardware camera unlock
    setTimeout(() => {
      setStep("qr");
    }, 350);
  };

  // -------------------------------------------------------------
  // STEP 2: DIRECT NATIVE QR SCANNER (100% iOS Safari Compatible)
  // -------------------------------------------------------------
  useEffect(() => {
    if (isOpen && step === "qr") {
      startQrCamera(qrFacingMode);
    } else {
      stopQrCamera();
    }

    return () => {
      stopQrCamera();
    };
  }, [isOpen, step, qrFacingMode]);

  const startQrCamera = async (facingModeToUse = "environment") => {
    stopQrCamera();
    setErrorMsg("");
    setShowTroubleshoot(false);

    try {
      let stream = null;
      // Try back camera with ideal constraint
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingModeToUse },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (err1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingModeToUse },
            audio: false
          });
        } catch (err2) {
          // Fallback to any available video stream
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      qrStreamRef.current = stream;
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = stream;
        qrVideoRef.current.setAttribute("playsinline", "true");
        qrVideoRef.current.setAttribute("webkit-playsinline", "true");
        qrVideoRef.current.muted = true;
        await qrVideoRef.current.play();

        setIsQrScannerActive(true);
        isScanningRef.current = true;
        // Start continuous frame analysis with jsQR
        requestAnimationFrame(scanQrFrame);
      }
    } catch (err) {
      console.warn("QR Camera error on iOS:", err);
      setShowTroubleshoot(true);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Camera permission is required. On iPhone: tap 'aA' in Safari address bar > Website Settings > Camera > Allow.");
      } else {
        setErrorMsg("Could not start back camera. Tap 'Switch Camera' or retry.");
      }
      setIsQrScannerActive(false);
    }
  };

  const stopQrCamera = () => {
    isScanningRef.current = false;
    if (scanAnimationRef.current) {
      cancelAnimationFrame(scanAnimationRef.current);
      scanAnimationRef.current = null;
    }
    if (qrStreamRef.current) {
      try {
        qrStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      qrStreamRef.current = null;
    }
    if (qrVideoRef.current) {
      try {
        qrVideoRef.current.srcObject = null;
      } catch (e) {}
    }
    setIsQrScannerActive(false);
  };

  const toggleQrCamera = () => {
    const nextMode = qrFacingMode === "environment" ? "user" : "environment";
    setQrFacingMode(nextMode);
  };

  // Frame processing loop using jsQR on offscreen canvas
  const scanQrFrame = () => {
    if (!isScanningRef.current) return;

    const video = qrVideoRef.current;
    const canvas = qrCanvasRef.current;

    if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (ctx && canvas.width > 0 && canvas.height > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Decode QR using jsQR
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });

        if (code && code.data && code.data.trim()) {
          if (navigator.vibrate) {
            try {
              navigator.vibrate(100);
            } catch (e) {}
          }
          isScanningRef.current = false;
          handleQRScanned(code.data.trim());
          return;
        }
      }
    }

    if (isScanningRef.current) {
      scanAnimationRef.current = requestAnimationFrame(scanQrFrame);
    }
  };

  const handleQRScanned = async (decodedText) => {
    try {
      let data = null;
      const cleanText = (decodedText || "").trim();

      // Case 1: Raw JSON string
      if (cleanText.startsWith("{") && cleanText.endsWith("}")) {
        data = JSON.parse(cleanText);
      }
      // Case 2: URL with encoded query parameters
      else if (cleanText.includes("sessionId=") || cleanText.includes("token=")) {
        const urlParams = new URLSearchParams(cleanText.includes("?") ? cleanText.split("?")[1] : cleanText);
        data = {
          sessionId: urlParams.get("sessionId"),
          token: urlParams.get("token"),
          branch: urlParams.get("branch"),
          year: urlParams.get("year"),
          section: urlParams.get("section"),
          semester: urlParams.get("semester"),
          subjectId: urlParams.get("subjectId")
        };
      } else {
        throw new Error("Unrecognized QR Code format. Please scan the official BEC Projector QR.");
      }

      if (!data?.sessionId || !data?.token) {
        throw new Error("Incomplete QR Code data. Please scan the active projector screen.");
      }

      stopQrCamera();
      await processAttendanceData(data);
    } catch (e) {
      setErrorMsg(e.message || "Invalid QR Code scanned.");
      // Resume scanning on error after 1.5s
      setTimeout(() => {
        if (isOpen && step === "qr") {
          isScanningRef.current = true;
          requestAnimationFrame(scanQrFrame);
        }
      }, 1500);
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
        cleanupAll();
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative max-w-lg w-full max-h-[94dvh] sm:max-h-[90vh] bg-white rounded-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-white/15 border border-white/20 text-white">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">Live Student QR Verification</h3>
              <p className="text-[11px] text-sky-200">iOS &amp; Android Anti-Proxy Camera Scanner</p>
            </div>
          </div>
          <button
            onClick={() => {
              cleanupAll();
              onClose();
            }}
            className="w-8 h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* In-App Browser (WhatsApp/Instagram) Warning on iOS */}
        {isWebview && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start space-x-2 text-amber-900 text-[11px]">
            <ExternalLink className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Opening from WhatsApp/Instagram?</strong>
              <p className="text-amber-800 mt-0.5">
                Apple restricts cameras in chat apps. Tap <strong>•••</strong> or <strong>Share</strong> and choose <strong>"Open in Safari"</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Step Stepper Progress Bar */}
        <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200 text-xs shrink-0">
          <div className={`flex items-center space-x-1.5 font-bold ${step === "selfie" ? "text-blue-700" : "text-emerald-700"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-mono ${step === "selfie" ? "bg-blue-600" : "bg-emerald-600"}`}>
              {selfieDataUrl ? "✓" : "1"}
            </span>
            <span className="text-[11px] sm:text-xs">1. Live Selfie</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          <div className={`flex items-center space-x-1.5 font-bold ${step === "qr" ? "text-blue-700" : "text-slate-400"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-mono ${step === "qr" ? "bg-blue-600" : "bg-slate-300"}`}>
              2
            </span>
            <span className="text-[11px] sm:text-xs">2. Scan Classroom QR</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Student Profile Info Tag */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 text-xs flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Student Roster</span>
              <span className="font-extrabold text-slate-800 text-sm block truncate">{studentProfile?.name}</span>
              <span className="block text-[11px] text-slate-500 font-mono truncate">
                Roll: {studentProfile?.rollNo} ({studentProfile?.branch} Sec-{studentProfile?.section})
              </span>
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
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3.5 rounded-2xl flex items-start space-x-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs sm:text-sm">{successMsg}</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">Attendance verified &amp; saved in real-time.</p>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-300 text-red-800 p-3.5 rounded-2xl flex items-start space-x-3 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-xs sm:text-sm">Camera Notice</p>
                <p className="text-[11px] text-red-700 mt-0.5">{errorMsg}</p>
                {showTroubleshoot && (
                  <div className="mt-2 pt-2 border-t border-red-200 text-[10px] text-red-900 space-y-1">
                    <p className="font-bold">iPhone / Safari Fix:</p>
                    <p>1. Tap the <strong>"aA"</strong> or <strong>settings icon</strong> in the Safari search bar.</p>
                    <p>2. Tap <strong>Website Settings</strong> &gt; <strong>Camera</strong> &gt; Set to <strong>"Allow"</strong>.</p>
                    <p>3. Refresh the webpage.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              STEP 1 VIEW: CAPTURE LIVE SELFIE
              ------------------------------------------------------------- */}
          {step === "selfie" && (
            <div className="space-y-4">
              <canvas ref={selfieCanvasRef} className="hidden" />

              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] max-h-[280px] w-full flex flex-col items-center justify-center border border-slate-200 shadow-inner mx-auto">
                {selfieDataUrl ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
                    <img src={selfieDataUrl} alt="Captured Selfie" className="w-full h-full rounded-xl object-contain shadow-md border-2 border-emerald-400" />
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selfie Ready
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={selfieVideoRef}
                      autoPlay
                      playsInline
                      webkit-playsinline="true"
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    {isSelfieCameraActive && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-40 h-40 sm:w-48 sm:h-48 border-2 border-dashed border-sky-400 rounded-full relative shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded font-mono whitespace-nowrap">
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
                <div className="space-y-2">
                  <button
                    onClick={captureSelfie}
                    disabled={!isSelfieCameraActive}
                    className="w-full min-h-[48px] py-3.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                  >
                    <Camera className="w-4 h-4" />
                    <span>SNAP LIVE SELFIE PHOTO</span>
                  </button>
                  {!isSelfieCameraActive && (
                    <button
                      onClick={startSelfieCamera}
                      className="w-full py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Camera Permissions
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={retakeSelfie}
                    className="min-h-[48px] py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake</span>
                  </button>

                  <button
                    onClick={proceedToQRScan}
                    className="min-h-[48px] py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>PROCEED TO QR ➡️</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------------
              STEP 2 VIEW: SCAN CLASSROOM QR CODE (Native Video + jsQR)
              ------------------------------------------------------------- */}
          {step === "qr" && (
            <div className="space-y-4">
              {/* Offscreen canvas for jsQR analysis */}
              <canvas ref={qrCanvasRef} className="hidden" />

              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] max-h-[280px] w-full flex flex-col items-center justify-center border border-slate-200 shadow-inner mx-auto">
                <video
                  ref={qrVideoRef}
                  autoPlay
                  playsInline
                  webkit-playsinline="true"
                  muted
                  className={`w-full h-full object-cover rounded-2xl ${qrFacingMode === "user" ? "transform -scale-x-100" : ""}`}
                />

                {isQrScannerActive && !isProcessing && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-44 h-44 sm:w-52 sm:h-52 border-2 border-blue-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
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
                    <span className="text-xs sm:text-sm font-bold">Verifying Attendance &amp; Token...</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-xs">
                <button
                  onClick={() => {
                    cleanupAll();
                    setStep("selfie");
                    startSelfieCamera();
                  }}
                  className="text-blue-700 font-bold hover:underline cursor-pointer py-1"
                >
                  ⬅️ Retake Live Selfie
                </button>

                <button
                  onClick={toggleQrCamera}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Switch between front and back camera"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-blue-600" />
                  <span>{qrFacingMode === "environment" ? "Back Camera" : "Front Camera"}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-4 sm:px-5 py-3 border-t border-slate-200 flex justify-between items-center text-xs shrink-0">
          <span className="flex items-center gap-1 text-slate-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Anti-Proxy Shield Active
          </span>
          <button
            onClick={() => {
              cleanupAll();
              onClose();
            }}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer active:scale-98"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
