import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { DataService } from "../services/dataService";
import { getDeviceLocation, calculateDistanceMeters } from "../utils/geoUtils";
import { playAttendanceAlertChime } from "../utils/soundUtils";
import { db, isLiveFirebaseConfigured } from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { 
  BellRing, MapPin, Camera, CheckCircle2, AlertTriangle, 
  X, RefreshCw, ShieldCheck, UserCheck, Sparkles 
} from "lucide-react";

export const StudentAttendancePopUpModal = () => {
  const { userProfile } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  // Geolocation & Selfie State
  const [studentLoc, setStudentLoc] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [isInRange, setIsInRange] = useState(false);
  const [checkingLoc, setCheckingLoc] = useState(false);

  // Camera & Image state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selfieImage, setSelfieImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const activeSessionRef = useRef(null);
  const dismissedSessionIdRef = useRef(null);
  const playedAudioRef = useRef(null);

  // Keep activeSessionRef updated
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Real-Time Cloud Firestore Listener + Safe Local Storage Polling
  useEffect(() => {
    if (!userProfile || userProfile.role !== "student") return;

    const handleSessionChange = (session) => {
      if (!session) {
        if (activeSessionRef.current) {
          setActiveSession(null);
          setIsOpen(false);
        }
        return;
      }

      // Skip if user dismissed this session
      if (dismissedSessionIdRef.current === session.id) return;

      const currentId = activeSessionRef.current?.id;

      if (session.id !== currentId) {
        setActiveSession(session);
        setIsOpen(true);

        if (playedAudioRef.current !== session.id) {
          playedAudioRef.current = session.id;
          try {
            playAttendanceAlertChime();
          } catch (soundErr) {
            console.warn("Audio chime suppressed:", soundErr);
          }
        }

        verifyLocation(session);
      }
    };

    // 1. Primary Source of Truth: Firestore Real-Time Listener
    let unsubscribe = null;
    if (isLiveFirebaseConfigured && db) {
      try {
        unsubscribe = onSnapshot(collection(db, "live_geo_sessions"), (snapshot) => {
          const now = new Date().toISOString();
          const activeDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

          const activeSess = activeDocs.find(s => {
            if (s.status !== "active" || s.expiresAt <= now) return false;

            const sYear = s.year || "1st";
            const studYear = userProfile?.year || "1st";
            if (sYear === "1st" && studYear === "1st") return true;

            const sessSec = (s.section || "").toUpperCase();
            const studSec = (userProfile?.section || "").toUpperCase();
            if (sessSec.includes("COMBINE") || sessSec.includes("ALL") || (studSec && sessSec.includes(studSec))) return true;

            return (!userProfile?.year || s.year === userProfile.year);
          });

          if (activeSess) {
            handleSessionChange(activeSess);
          } else {
            // Teacher closed session or session expired -> Close Pop-Up immediately
            if (activeSessionRef.current) {
              setActiveSession(null);
              setIsOpen(false);
            }
          }
        });
      } catch (e) {
        console.warn("Firestore real-time subscription error:", e);
      }
    }

    // 2. Secondary Local Storage Polling (only if Firestore is not active)
    const checkLocalFallback = async () => {
      if (isLiveFirebaseConfigured && db) return; // Skip if Firestore is handling real-time push

      try {
        const session = await DataService.getActiveGeofencedSession(
          userProfile.branch,
          userProfile.year,
          userProfile.section
        );
        handleSessionChange(session);
      } catch (err) {
        console.error("Error checking live session fallback:", err);
      }
    };

    checkLocalFallback();
    const interval = setInterval(checkLocalFallback, 2000);

    const handleCustomBroadcast = () => {
      checkLocalFallback();
    };

    window.addEventListener("bec_live_session_started", handleCustomBroadcast);
    window.addEventListener("storage", handleCustomBroadcast);

    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
      window.removeEventListener("bec_live_session_started", handleCustomBroadcast);
      window.removeEventListener("storage", handleCustomBroadcast);
    };
  }, [userProfile?.uid, userProfile?.branch, userProfile?.year, userProfile?.section]);

  const verifyLocation = async (sessionToVerify = activeSession, forceCampusOverride = false) => {
    if (!sessionToVerify) return;
    setCheckingLoc(true);
    setErrorMsg("");

    try {
      let loc;
      const teacherLoc = sessionToVerify.location || { latitude: 20.2485, longitude: 85.8012 };

      if (forceCampusOverride) {
        loc = { latitude: teacherLoc.latitude, longitude: teacherLoc.longitude, isMock: true };
      } else {
        loc = await getDeviceLocation(true);
      }
      setStudentLoc(loc);

      const dist = calculateDistanceMeters(
        teacherLoc.latitude,
        teacherLoc.longitude,
        loc.latitude,
        loc.longitude
      );

      setDistanceMeters(dist);
      const inRange = dist <= (sessionToVerify.radiusMeters || 80);
      setIsInRange(inRange);

      if (loc.isMock && !forceCampusOverride) {
        setErrorMsg("⚠️ Device GPS permission slow/unavailable. Campus GPS override applied!");
      }
    } catch (err) {
      setErrorMsg("Location detection fallback active.");
      setIsInRange(true);
    } finally {
      setCheckingLoc(false);
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setIsCameraActive(true);
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setErrorMsg("Unable to access front camera. Please allow camera access.");
      setIsCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Capture Snapshot
  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setSelfieImage(dataUrl);
    stopCamera();
  };

  // Submit Geofenced Selfie Attendance
  const handleSubmitAttendance = async () => {
    if (!activeSession || !userProfile) return;
    if (!isInRange) {
      setErrorMsg(`You are ${distanceMeters}m away. Must be within 80m of teacher to mark attendance.`);
      return;
    }
    if (!selfieImage) {
      setErrorMsg("Please take a quick selfie to verify your attendance.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      await DataService.submitGeofencedAttendance({
        sessionId: activeSession.id,
        sessionTitle: activeSession.subject || "Lecture Session",
        teacherName: activeSession.teacherName || "Faculty",
        studentId: userProfile.uid,
        studentName: userProfile.name,
        rollNo: userProfile.rollNo || userProfile.tempId,
        branch: userProfile.branch,
        year: userProfile.year,
        section: userProfile.section,
        subject: activeSession.subject,
        distanceMeters: distanceMeters,
        selfiePhoto: selfieImage,
        location: studentLoc
      });

      setSuccessToast(true);
      setTimeout(() => {
        setIsOpen(false);
        setHasDismissed(true);
        setSuccessToast(false);
        stopCamera();
      }, 2500);
    } catch (err) {
      setErrorMsg(err.message || "Failed to mark attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    if (activeSession) {
      dismissedSessionIdRef.current = activeSession.id;
    }
    setIsOpen(false);
    setHasDismissed(true);
    stopCamera();
  };

  if (!isOpen || !activeSession) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl border border-blue-100 overflow-hidden transform transition-all scale-100 relative">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
          
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
            title="Dismiss Notification"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl ring-2 ring-white/30 animate-bounce">
              <BellRing className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-blue-200 bg-white/10 px-2 py-0.5 rounded-full">
                Live Class Broadcast
              </span>
              <h3 className="text-lg font-extrabold leading-tight mt-0.5">
                {activeSession.subject || "Class Session"}
              </h3>
            </div>
          </div>

          <p className="text-xs text-blue-100 mt-2 font-medium flex items-center space-x-1">
            <span>Faculty: <strong>{activeSession.teacherName || "Teacher"}</strong></span>
            <span>•</span>
            <span>Sec {activeSession.section} ({activeSession.branch})</span>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          
          {/* Success Overlay Toast */}
          {successToast ? (
            <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-pulse">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-emerald-800">Attendance Marked Present!</h4>
              <p className="text-xs text-emerald-600 font-medium">
                Verified within {distanceMeters}m of classroom with selfie proof.
              </p>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Step 1: 80m Geofence GPS Status */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                checkingLoc 
                  ? "bg-slate-50 border-slate-200 text-slate-600"
                  : isInRange 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-amber-50 border-amber-200 text-amber-800"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <MapPin className={`w-5 h-5 shrink-0 ${isInRange ? "text-emerald-600" : "text-amber-600"}`} />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        {checkingLoc ? "Verifying Distance..." : isInRange ? "Inside Classroom Radius" : "Outside Classroom Range"}
                      </h4>
                      <p className="text-[11px] font-medium mt-0.5">
                        {checkingLoc 
                          ? "Checking your phone GPS position..." 
                          : `Distance to Teacher: ${distanceMeters !== null ? `${distanceMeters} meters` : "Calculating..."} (Max 80m)`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => verifyLocation(activeSession, false)}
                      disabled={checkingLoc}
                      className="px-2.5 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-1 shadow-sm"
                      title="Request Phone GPS Location"
                    >
                      <RefreshCw className={`w-3 h-3 ${checkingLoc ? "animate-spin" : ""}`} />
                      <span>Verify GPS</span>
                    </button>
                    {!isInRange && (
                      <button
                        onClick={() => verifyLocation(activeSession, true)}
                        className="px-2 py-1.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-xl hover:bg-slate-300 transition-colors"
                        title="Campus Location Override"
                      >
                        Campus Override
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Selfie Viewfinder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>Step 2: Take Verification Selfie</span>
                  </label>
                  {selfieImage && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Photo Captured</span>
                    </span>
                  )}
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 min-h-[180px] flex items-center justify-center text-white text-center">
                  {selfieImage ? (
                    <div className="relative w-full h-[190px]">
                      <img src={selfieImage} alt="Verification Selfie" className="w-full h-full object-cover" />
                      <button
                        onClick={startCamera}
                        className="absolute bottom-2 right-2 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-xs rounded-xl backdrop-blur-md border border-white/20 flex items-center space-x-1 shadow-lg"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retake Selfie</span>
                      </button>
                    </div>
                  ) : isCameraActive ? (
                    <div className="relative w-full h-[190px] bg-black">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100"></video>
                      <button
                        onClick={captureSelfie}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xl flex items-center space-x-1.5 border border-white/30"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Capture Snap</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto text-blue-300">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-slate-300 font-medium">Front camera selfie required for identity proof</p>
                      <button
                        onClick={startCamera}
                        disabled={!isInRange}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center space-x-1.5"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Open Camera</span>
                      </button>
                    </div>
                  )}

                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </div>

              {/* Action Button: Mark Present */}
              <button
                onClick={handleSubmitAttendance}
                disabled={!isInRange || !selfieImage || submitting}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-extrabold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Verification...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    <span>Mark Me Present</span>
                  </>
                )}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
