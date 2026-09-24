import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Activity,
  User,
  Shield,
  ArrowLeft,
  AlertCircle,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function TeleconsultationRoomPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const statsTimerRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [quality, setQuality] = useState('Good');
  const [callEnded, setCallEnded] = useState(false);
  const [connError, setConnError] = useState('');
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Call timer
  useEffect(() => {
    if (!remoteJoined || callEnded) return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [remoteJoined, callEnded]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── WebRTC Setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomId) return;
    let cancelled = false;

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera/Microphone access error:', err);
        setConnError('Camera and microphone permission denied. Please allow access and reload.');
        return;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local tracks to RTCPeerConnection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Handle incoming remote track
      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0];
          setRemoteJoined(true);
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('ice-candidate', { roomId, candidate: e.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected'].includes(pc.connectionState)) {
          setConnError('Connection disrupted. Attempting to reconnect...');
        } else if (pc.connectionState === 'connected') {
          setConnError('');
          setRemoteJoined(true);
        }
      };

      // Join the signaling room
      socket.emit('join-room', {
        roomId,
        userId: user?.id || 'guest',
        role: user?.role || 'DOCTOR',
      });

      // When another participant joins
      const onJoined = async ({ socketId }) => {
        setRemoteJoined(true);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { roomId, offer });
        } catch (offerErr) {
          console.error('Error creating offer:', offerErr);
        }
      };

      // When receiving an offer from peer
      const onOffer = async ({ offer }) => {
        setRemoteJoined(true);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { roomId, answer });
        } catch (ansErr) {
          console.error('Error answering offer:', ansErr);
        }
      };

      // When receiving answer from peer
      const onAnswer = async ({ answer }) => {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (setAnsErr) {
          console.error('Error setting remote answer:', setAnsErr);
        }
      };

      // When receiving remote ICE candidate
      const onIce = async ({ candidate }) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (iceErr) {
          console.warn('ICE candidate handling warning:', iceErr);
        }
      };

      const onEnded = () => {
        setCallEnded(true);
        teardown();
      };

      const onLeft = () => {
        setRemoteJoined(false);
      };

      socket.on('user-joined', onJoined);
      socket.on('offer', onOffer);
      socket.on('answer', onAnswer);
      socket.on('ice-candidate', onIce);
      socket.on('call-ended', onEnded);
      socket.on('user-left', onLeft);

      // Network quality monitor
      statsTimerRef.current = setInterval(async () => {
        try {
          const stats = await pcRef.current?.getStats();
          let lost = 0;
          let recv = 0;
          stats?.forEach((r) => {
            if (r.type === 'inbound-rtp' && r.kind === 'audio') {
              lost += r.packetsLost || 0;
              recv += r.packetsReceived || 0;
            }
          });
          const ratio = lost + recv > 0 ? lost / (lost + recv) : 0;
          setQuality(ratio > 0.1 ? 'Poor' : 'Good');
        } catch {
          // stats error ignored
        }
      }, 4000);

      return () => {
        socket.off('user-joined', onJoined);
        socket.off('offer', onOffer);
        socket.off('answer', onAnswer);
        socket.off('ice-candidate', onIce);
        socket.off('call-ended', onEnded);
        socket.off('user-left', onLeft);
      };
    }

    let cleanupFn;
    setup().then((fn) => {
      cleanupFn = fn;
    });

    return () => {
      cancelled = true;
      cleanupFn?.();
      teardown();
    };
  }, [socket, roomId, user?.id, user?.role]);

  function teardown() {
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
  }

  function toggleMic() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  }

  function toggleCam() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  }

  function handleEndCall() {
    socket?.emit('end-call', { roomId });
    teardown();
    setCallEnded(true);
  }

  if (callEnded) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <PhoneOff className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">Teleconsultation Ended</h2>
            <p className="text-sm text-stone-500 mt-1">Room session has been terminated</p>
          </div>
          <div className="p-4 bg-stone-50 rounded-xl text-left text-xs space-y-2 border border-stone-200">
            <div className="flex justify-between">
              <span className="text-stone-500">Room Code:</span>
              <span className="font-mono font-bold text-stone-800">{roomId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Duration:</span>
              <span className="font-bold text-stone-800">{formatDuration(callDuration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Clinical Status:</span>
              <span className="text-emerald-600 font-bold">Encounter Logged</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/teleconsult')}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm"
          >
            Back to Teleconsultation Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white flex flex-col">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-stone-800 bg-stone-900/80 backdrop-blur px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleEndCall}
            className="p-2 hover:bg-stone-800 text-stone-400 hover:text-white rounded-lg transition"
            title="Leave Call"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-stone-100">
                ArogyaLink Teleconsultation
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 font-mono text-stone-300 border border-stone-700">
                {roomId}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span>{user?.name || 'Practitioner'}</span>
              <span>•</span>
              <span className="text-emerald-400">
                {remoteJoined ? `In Call (${formatDuration(callDuration)})` : 'Waiting for participant…'}
              </span>
            </div>
          </div>
        </div>

        {/* Quality Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              quality === 'Good'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{quality === 'Good' ? 'HD Quality' : 'Network Weak'}</span>
          </div>
        </div>
      </header>

      {/* Main Video View Area */}
      <main className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        {connError && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-red-900/90 text-red-200 border border-red-700 rounded-lg text-xs font-medium flex items-center gap-2 shadow-lg">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            {connError}
          </div>
        )}

        {/* Remote Video Tile */}
        <div className="w-full h-full max-w-5xl bg-stone-900 rounded-2xl overflow-hidden relative border border-stone-800 shadow-2xl flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${!remoteJoined ? 'hidden' : 'block'}`}
          />

          {!remoteJoined && (
            <div className="text-center space-y-4 p-8">
              <div className="w-20 h-20 rounded-full bg-stone-800 flex items-center justify-center mx-auto border border-stone-700">
                <User className="w-10 h-10 text-stone-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-200">Waiting for remote participant…</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  When the specialist or field worker joins this session, video will stream automatically via peer-to-peer WebRTC.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-800/80 border border-stone-700 text-xs text-stone-400 font-mono">
                Room: {roomId}
              </div>
            </div>
          )}

          {/* Remote Label */}
          {remoteJoined && (
            <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-stone-900/80 backdrop-blur rounded-lg border border-stone-700 text-xs font-medium text-stone-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Remote Participant
            </div>
          )}

          {/* Local Video PiP */}
          <div className="absolute top-4 right-4 w-44 sm:w-56 aspect-video bg-stone-950 rounded-xl overflow-hidden border-2 border-stone-700 shadow-2xl z-10">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!camOn ? 'hidden' : 'block'}`}
            />
            {!camOn && (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-500 text-xs gap-1 bg-stone-900">
                <VideoOff className="w-6 h-6" />
                <span>Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur rounded text-[10px] font-semibold text-stone-300">
              You ({user?.role || 'Doctor'})
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Call Controls Bar */}
      <footer className="h-20 bg-stone-900 border-t border-stone-800 flex items-center justify-center gap-4 px-6 z-10">
        <button
          onClick={toggleMic}
          className={`p-4 rounded-full transition flex items-center justify-center ${
            micOn
              ? 'bg-stone-800 hover:bg-stone-700 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
          }`}
          title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleCam}
          className={`p-4 rounded-full transition flex items-center justify-center ${
            camOn
              ? 'bg-stone-800 hover:bg-stone-700 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
          }`}
          title={camOn ? 'Turn Camera Off' : 'Turn Camera On'}
        >
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={handleEndCall}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition flex items-center justify-center ml-2"
          title="Disconnect & End Call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
}
