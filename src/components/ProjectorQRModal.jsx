import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Maximize2, RotateCw, Users, CheckCircle, Clock } from "lucide-react";
import { DataService } from "../services/dataService";

export const ProjectorQRModal = ({ isOpen, onClose, session, onEndSession }) => {
  const [token, setToken] = useState(session?.token || "");
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [attendees, setAttendees] = useState([]);

  // Token auto-rotation interval (every 30 seconds)
  useEffect(() => {
    if (!session || !isOpen) return;

    setToken(session.token);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Generate new 30-second token
          const newToken = `tok_${Math.random().toString(36).substring(2, 8)}`;
          setToken(newToken);
          DataService.updateSessionToken(session.id, newToken);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, isOpen]);

  // Live polling for marked attendance
  useEffect(() => {
    if (!session || !isOpen) return;

    const fetchLiveAttendance = async () => {
      const allAttendance = await DataService.getAttendance();
      const sessionAttendees = allAttendance.filter(a => a.sessionId === session.id);
      setAttendees(sessionAttendees);
    };

    fetchLiveAttendance();
    const pollInterval = setInterval(fetchLiveAttendance, 2000);

    return () => clearInterval(pollInterval);
  }, [session, isOpen]);

  if (!isOpen || !session) return null;

  // Construct QR Payload
  const qrPayload = JSON.stringify({
    sessionId: session.id,
    branch: session.branch,
    year: session.year,
    section: session.section,
    semester: session.semester,
    subjectId: session.subjectId,
    token: token
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 text-white p-4 sm:p-8 overflow-y-auto">
      <div className="max-w-4xl w-full flex flex-col md:flex-row items-center justify-between gap-8 bg-slate-900/90 border border-slate-800 p-6 sm:p-10 rounded-3xl shadow-2xl relative">
        
        {/* Top Controls */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Minimize"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Left Column: QR Code & Rotation Timer */}
        <div className="flex flex-col items-center text-center space-y-6 w-full md:w-1/2">
          {/* Header Title & Teacher Verified Photo */}
          <div className="flex flex-col items-center space-y-2">
            {session.teacherPhoto && (
              <div className="relative">
                <img
                  src={session.teacherPhoto}
                  alt="Faculty Live Photo"
                  className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400 shadow-lg"
                />
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 text-[10px]" title="Faculty Live Verified">
                  <CheckCircle className="w-4 h-4" />
                </span>
              </div>
            )}
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-500/30">
              Live Classroom Projector Mode
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {session.subjectName || "Subject Class"}
            </h2>
            <p className="text-slate-400 text-sm">
              Faculty: <span className="text-emerald-400 font-bold">{session.teacherName || "Faculty"} (Live Verified 📸)</span>
            </p>
            <p className="text-slate-400 text-xs">
              Target Roster: <span className="text-blue-400 font-bold">{session.branch}</span> | Year <span className="text-blue-400 font-bold">{session.year}</span> | Section <span className="text-blue-400 font-bold">{session.section}</span> (Sem {session.semester})
            </p>
          </div>

          {/* QR Container with Glow (Fully Responsive on Mobile) */}
          <div className="p-3 sm:p-6 bg-white rounded-3xl shadow-2xl pulse-glow border-4 border-blue-500/50 w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] flex items-center justify-center">
            <QRCodeSVG 
              value={qrPayload}
              size={220}
              className="w-full h-full object-contain"
              level="H"
              includeMargin={true}
            />
          </div>

          {/* Token Rotation Timer Bar */}
          <div className="w-full max-w-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5 text-blue-400 animate-spin" /> Token Rotates In:
              </span>
              <span className="font-mono font-bold text-blue-400 text-sm">{secondsLeft}s</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div 
                className="bg-gradient-to-r from-blue-500 to-sky-400 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsLeft / 30) * 100}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-500">
              Anti-Screenshot Protection: QR token updates automatically every 30 seconds.
            </p>
          </div>

          {/* End Session Button */}
          {onEndSession && (
            <button
              onClick={() => {
                onEndSession(session.id);
                onClose();
              }}
              className="w-full max-w-xs py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/30 text-sm"
            >
              End Class Session & Lock QR
            </button>
          )}
        </div>

        {/* Right Column: Live Attendee Counter & Realtime Feed */}
        <div className="w-full md:w-1/2 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-lg text-white">Live Attendance Feed</h3>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 font-bold text-sm rounded-lg border border-emerald-500/30">
              {attendees.length} Scanned
            </span>
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {attendees.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 text-center p-4">
                <Clock className="w-8 h-8 animate-pulse text-slate-600" />
                <p className="text-xs">Waiting for students in {session.branch} Sec-{session.section} to scan...</p>
              </div>
            ) : (
              attendees.map((att, idx) => (
                <div 
                  key={att.id || idx}
                  className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className="flex items-center space-x-3">
                    {att.livePhoto ? (
                      <img 
                        src={att.livePhoto} 
                        alt={att.studentName}
                        className="w-9 h-9 rounded-full object-cover border-2 border-emerald-400 shrink-0" 
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                        {idx + 1}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">{att.studentName}</h4>
                      <p className="text-xs text-slate-400 font-mono">Roll: {att.rollNo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <CheckCircle className="w-3.5 h-3.5" /> Present
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono">
                      {new Date(att.markedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
