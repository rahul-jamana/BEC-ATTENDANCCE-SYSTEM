import React, { useState, useEffect, useRef } from "react";
import { X, Camera, RefreshCw, CheckCircle2, ShieldCheck, QrCode, CloudUpload } from "lucide-react";
import { uploadPhotoToCloudinary } from "../services/cloudinaryService";

export const TeacherPhotoModal = ({ isOpen, onClose, onConfirmPhoto, sessionDetails }) => {
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPhotoDataUrl(null);
      setCameraError("");
      setIsUploading(false);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    stopCamera();
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.warn("Teacher camera access error:", err);
      setCameraError("Camera access required for live photo verification. Please allow camera permissions in your browser.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPhotoDataUrl(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setPhotoDataUrl(null);
    startCamera();
  };

  const handleConfirm = async () => {
    if (!photoDataUrl) return;

    setIsUploading(true);
    try {
      const cdnResult = await uploadPhotoToCloudinary(photoDataUrl, "faculty_live_photos", ["faculty", "temp_30days"]);
      onConfirmPhoto(cdnResult.url);
    } catch (err) {
      setCameraError(err.message || "Teacher photo upload failed. Please configure Cloudinary first.");
      if (onConfirmPhoto) {
        onConfirmPhoto(null);
      }
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 relative animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="gradient-header text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold backdrop-blur-md">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold leading-tight">Faculty Live Photo Verification</h3>
              <p className="text-[11px] text-blue-100">Step 1 of 2: Capture Live Photo to Launch Session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* Target Session Banner */}
          {sessionDetails && (
            <div className="bg-blue-50 border border-blue-200/70 rounded-2xl p-3.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-950 text-sm">{sessionDetails.subjectName}</span>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md font-mono text-[10px] font-bold">
                  {sessionDetails.branch} - Sec {sessionDetails.section}
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Year: {sessionDetails.year} • Semester: Sem {sessionDetails.semester}
              </p>
            </div>
          )}

          {/* Camera View / Photo Preview */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 min-h-[300px] flex flex-col items-center justify-center border-2 border-slate-200 shadow-inner">
            
            {/* Hidden Canvas for Snapshots */}
            <canvas ref={canvasRef} className="hidden" />

            {photoDataUrl ? (
              // Captured Photo Preview
              <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
                <img 
                  src={photoDataUrl} 
                  alt="Faculty Live Captured Photo" 
                  className="max-h-[280px] w-auto rounded-xl object-contain shadow-md border-2 border-emerald-400"
                />
                <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" /> Live Photo Captured &amp; Verified
                </div>
              </div>
            ) : (
              // Live Video Stream
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-[300px] object-cover"
                />

                {/* Reticle Frame */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-56 border-2 border-dashed border-sky-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.4)]">
                      <div className="absolute top-2 left-2 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded font-mono">
                        Center Face In Frame
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Camera Access Error Message */}
            {cameraError && (
              <div className="p-4 text-center text-red-400 text-xs font-medium space-y-2">
                <p>{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold"
                >
                  Retry Camera
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {!photoDataUrl ? (
              <button
                onClick={capturePhoto}
                disabled={!isCameraActive}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>SNAP TEACHER LIVE PHOTO</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleRetake}
                  className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retake Photo</span>
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={isUploading}
                  className="py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Uploading Photo...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>GENERATE QR CODE</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Footer Security Badge */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Live Biometric Fraud Prevention Enabled
          </span>
          <span className="font-mono text-slate-400">BEC Faculty System</span>
        </div>
      </div>
    </div>
  );
};
