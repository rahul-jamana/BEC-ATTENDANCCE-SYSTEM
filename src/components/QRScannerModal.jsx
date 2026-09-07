import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, AlertTriangle, CheckCircle2, ShieldCheck, QrCode, RefreshCw, ArrowRight, ExternalLink } from "lucide-react";
import { DataService } from "../services/dataService";
import { uploadPhotoToCloudinary } from "../services/cloudinaryService";

// Helper to detect if running in an iOS In-App Browser (WhatsApp, Instagram, FB, Telegram, etc.)
const isInAppBrowser = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
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
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  // Refs for Selfie Capture
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Ref for Html5Qrcode Scanner instance & DOM Observer
  const qrScannerRef = useRef(null);
  const observerRef = useRef(null);

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
      startSelfieCamera();
    } else {
      cleanupAllCameras();
    }

    return () => {
      cleanupAllCameras();
    };
  }, [isOpen]);

  const cleanupAllCameras = () => {
    stopSelfieCamera();
    stopQrScanner();
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  };

  // -------------------------------------------------------------
  // STEP 1: SELFIE CAMERA LOGIC (iOS / Safari Compatible)
  // -------------------------------------------------------------
  const startSelfieCamera = async () => {
    stopSelfieCamera();
    setErrorMsg("");
    setShowTroubleshoot(false);

    try {
      let stream = null;
      // Try ideal front camera constraints
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
        // Fallback for older iOS Safari without ideal constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
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
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (e) {}
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (e) {}
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
    // Teardown selfie stream first
    stopSelfieCamera();
    // 500ms delay to allow iOS hardware camera hardware unlock before mounting back camera
    setTimeout(() => {
      setStep("qr");
    }, 500);
  };

  // -------------------------------------------------------------
  // STEP 2: QR CODE SCANNER LOGIC (iOS / Safari Compatible)
  // -------------------------------------------------------------
  useEffect(() => {
    let html5QrCode = null;
    let isMounted = true;

    if (isOpen && step === "qr") {
      const timer = setTimeout(async () => {
        try {
          const container = document.getElementById("qr-reader-target");
          if (!container || !isMounted) return;

          // Clean up prior scanner instance
          if (qrScannerRef.current) {
            try {
              await qrScannerRef.current.stop();
            } catch (e) {}
            try {
              qrScannerRef.current.clear();
            } catch (e) {}
            qrScannerRef.current = null;
          }

          // Setup MutationObserver on container to enforce playsinline immediately when <video> element is injected
          if (observerRef.current) {
            observerRef.current.disconnect();
          }
          observerRef.current = new MutationObserver((mutations) => {
            mutations.forEach(() => {
              const video = container.querySelector("video");
              if (video) {
                video.setAttribute("playsinline", "true");
                video.setAttribute("webkit-playsinline", "true");
                video.setAttribute("muted", "true");
                video.muted = true;
                video.setAttribute("autoplay", "true");
              }
            });
          });
          observerRef.current.observe(container, { childList: true, subtree: true });

          // Initialize Html5Qrcode with stable JavaScript decoding engine (disabling buggy WebKit BarcodeDetector)
          html5QrCode = new Html5Qrcode("qr-reader-target", {
            verbose: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: false // IMPORTANT: false ensures 100% reliable jsQR/zxing on iOS 17/18
            }
          });
          qrScannerRef.current = html5QrCode;

          const config = {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const edgeSize = Math.max(180, Math.floor(minEdge * 0.75));
              return { width: edgeSize, height: edgeSize };
            },
            aspectRatio: 1.0
          };

          const onScanSuccess = (decodedText) => {
            if (navigator.vibrate) {
              try {
                navigator.vibrate(100);
              } catch (e) {}
            }
            handleQRScanned(decodedText, html5QrCode);
          };

          const onScanFailure = () => {
            // No-op for continuous scanning frames
          };

          // Resilient Multi-Tier Camera Start for iOS
          let cameraStarted = false;

          // Tier 1: Try environment / back camera with ideal constraint
          try {
            await html5QrCode.start({ facingMode: { ideal: "environment" } }, config, onScanSuccess, onScanFailure);
            cameraStarted = true;
          } catch (t1Err) {
            console.warn("Tier 1 environment camera start failed, trying Tier 2:", t1Err);
          }

          // Tier 2: Try basic facingMode environment
          if (!cameraStarted && isMounted) {
            try {
              await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure);
              cameraStarted = true;
            } catch (t2Err) {
              console.warn("Tier 2 environment camera start failed, trying Tier 3:", t2Err);
            }
          }

          // Tier 3: Fallback to user / front camera if back lens is blocked or unavailable
          if (!cameraStarted && isMounted) {
            try {
              await html5QrCode.start({ facingMode: "user" }, config, onScanSuccess, onScanFailure);
              cameraStarted = true;
            } catch (t3Err) {
              console.warn("Tier 3 user camera start failed:", t3Err);
            }
          }

          if (cameraStarted && isMounted) {
            setIsQrScannerActive(true);
            // Apply inline video styling safeguard
            const video = container.querySelector("video");
            if (video) {
              video.setAttribute("playsinline", "true");
              video.setAttribute("webkit-playsinline", "true");
              video.muted = true;
            }
          } else if (isMounted) {
            setShowTroubleshoot(true);
            setErrorMsg("Camera error on iPhone/iOS. Please ensure camera permissions are allowed in Safari settings, or ask your faculty for manual attendance.");
          }
        } catch (e) {
          console.warn("Html5Qrcode init exception:", e);
          if (isMounted) {
            setShowTroubleshoot(true);
            setErrorMsg("Camera access failed. Please reload or open in native Safari browser.");
          }
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
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current
          .stop()
          .then(() => {
            try {
              qrScannerRef.current?.clear();
            } catch (e) {}
            qrScannerRef.current = null;
          })
          .catch(() => {
            try {
              qrScannerRef.current?.clear();
            } catch (e) {}
            qrScannerRef.current = null;
          });
      } catch (e) {}
    }
    setIsQrScannerActive(false);
  };

  const handleQRScanned = async (decodedText, qrInstance) => {
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
        cleanupAllCameras();
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
              cleanupAllCameras();
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
              <canvas ref={canvasRef} className="hidden" />

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
                      ref={videoRef}
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
                      className="w-full py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
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
              STEP 2 VIEW: SCAN CLASSROOM QR CODE (iOS WebKit Optimized)
              ------------------------------------------------------------- */}
          {step === "qr" && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] max-h-[280px] w-full flex flex-col items-center justify-center border border-slate-200 shadow-inner mx-auto">
                <div
                  id="qr-reader-target"
                  className="w-full h-full flex items-center justify-center [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-xl [&_img]:hidden"
                ></div>

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
                    cleanupAllCameras();
                    setStep("selfie");
                    startSelfieCamera();
                  }}
                  className="text-blue-700 font-bold hover:underline cursor-pointer py-1"
                >
                  ⬅️ Retake Live Selfie
                </button>
                <span className="text-slate-400 font-mono text-[10px] sm:text-[11px]">Facing: Classroom Projector</span>
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
              cleanupAllCameras();
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
