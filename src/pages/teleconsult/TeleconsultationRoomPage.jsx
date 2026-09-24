import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Activity,
  User,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Radio,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

// Comprehensive STUN + Free OpenRelay TURN servers for 100% NAT/CGNAT Traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
  iceCandidatePoolSize: 10,
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
  const remoteStreamRef = useRef(new MediaStream());
  const candidateQueueRef = useRef([]);
  const statsTimerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [quality, setQuality] = useState('Good');
  const [callEnded, setCallEnded] = useState(false);
  const [connError, setConnError] = useState('');
  const [copied, setCopied] = useState(false);

  // Connection Lifecycle States
  const [peerInRoom, setPeerInRoom] = useState(false);
  const [peerInfo, setPeerInfo] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  const [connStatus, setConnStatus] = useState('waiting'); // 'waiting' | 'connecting' | 'connected' | 'disconnected'
  const [callDuration, setCallDuration] = useState(0);

  // Call duration increments ONLY when the remote video/audio stream is active
  useEffect(() => {
    if (!streamActive || callEnded) return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [streamActive, callEnded]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyRoomCode = () => {
    navigator.clipboard?.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Drains buffered ICE candidates once remoteDescription is set ───────────
  const drainCandidates = async (pc) => {
    while (candidateQueueRef.current.length > 0) {
      const candidate = candidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC] Buffered candidate warning:', err.message);
      }
    }
  };

  // ── Teardown only the peer connection (keeps local camera alive) ────────────
  const teardownPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    candidateQueueRef.current = [];
    remoteStreamRef.current = new MediaStream();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  // ── Trigger ICE Restart on network disruption ──────────────────────────────
  const triggerIceRestart = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || pc.signalingState === 'closed') return;
    try {
      console.log('[WebRTC] Initiating ICE restart with TURN...');
      setConnError('Re-negotiating connection...');
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socket?.emit('offer', { roomId, offer });
    } catch (err) {
      console.warn('[WebRTC] ICE restart failed:', err.message);
      setConnError('Reconnection failed. Click Reconnect or refresh.');
    }
  }, [socket, roomId]);

  // ── Complete Teardown when leaving room ─────────────────────────────────────
  const fullTeardown = useCallback(() => {
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    teardownPeerConnection();
  }, [teardownPeerConnection]);

  // ── WebRTC Setup & Socket Signaling ────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomId) return;
    let cancelled = false;

    // Helper to create a fresh RTCPeerConnection configured with local tracks
    function createPeerConnection() {
      teardownPeerConnection();

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Handle incoming remote media tracks
      pc.ontrack = (event) => {
        console.log('[WebRTC] ontrack received:', event.track.kind);
        const remoteStream = remoteStreamRef.current;

        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
              remoteStream.addTrack(track);
            }
          });
        } else if (event.track) {
          if (!remoteStream.getTracks().some((t) => t.id === event.track.id)) {
            remoteStream.addTrack(event.track);
          }
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch((e) => console.log('Autoplay hint:', e.message));
        }

        setStreamActive(true);
        setConnStatus('connected');
        setConnError('');
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { roomId, candidate: event.candidate });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('[WebRTC] Connection state:', state);

        if (state === 'connected') {
          setConnStatus('connected');
          setConnError('');
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        } else if (['disconnected', 'failed'].includes(state)) {
          setConnStatus('disconnected');
          setConnError('Connection disrupted. Attempting to reconnect...');
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (pcRef.current && ['disconnected', 'failed'].includes(pcRef.current.connectionState)) {
                triggerIceRestart();
              }
            }, 2000);
          }
        }
      };

      return pc;
    }

    async function initSession() {
      // 1. Acquire Local Camera & Microphone with Graceful Fallback
      if (!localStreamRef.current) {
        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true,
          });
        } catch (err) {
          console.warn('[WebRTC] High-res camera busy, trying standard:', err.message);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } catch (err2) {
            console.warn('[WebRTC] Camera locked by other tab, falling back to audio-only:', err2.message);
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
              setCamOn(false);
            } catch (err3) {
              console.error('[WebRTC] Permission error:', err3);
              setConnError('Camera/Microphone permission denied. Please allow access and reload.');
              return;
            }
          }
        }

        if (cancelled) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current && stream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = stream;
        }
      }

      // Initialize initial RTCPeerConnection
      const pc = createPeerConnection();

      // 2. Join the Signaling Room
      socket.emit('join-room', {
        roomId,
        userId: user?.id || 'guest',
        role: user?.role || 'DOCTOR',
      });

      // ── Socket Event Listeners ─────────────────────────────────────────────

      // When another participant joins the room -> WE initiate the offer
      const onUserJoined = async ({ userId, role, socketId }) => {
        console.log('[WebRTC] Participant joined:', role, socketId);
        setPeerInRoom(true);
        setPeerInfo({ userId, role });
        setConnStatus('connecting');
        setConnError('');

        try {
          const currentPc = pcRef.current || createPeerConnection();
          const offer = await currentPc.createOffer();
          await currentPc.setLocalDescription(offer);
          socket.emit('offer', { roomId, offer });
        } catch (offerErr) {
          console.error('[WebRTC] Error creating offer:', offerErr);
        }
      };

      // When we receive an offer from the remote peer -> We answer
      const onOffer = async ({ offer }) => {
        console.log('[WebRTC] Received offer from peer');
        setPeerInRoom(true);
        setConnStatus('connecting');

        try {
          const currentPc = pcRef.current || createPeerConnection();
          await currentPc.setRemoteDescription(new RTCSessionDescription(offer));
          await drainCandidates(currentPc);

          const answer = await currentPc.createAnswer();
          await currentPc.setLocalDescription(answer);
          socket.emit('answer', { roomId, answer });
        } catch (ansErr) {
          console.error('[WebRTC] Error handling offer:', ansErr);
        }
      };

      // When we receive an answer back
      const onAnswer = async ({ answer }) => {
        console.log('[WebRTC] Received answer from peer');
        try {
          const currentPc = pcRef.current;
          if (currentPc && currentPc.signalingState !== 'closed') {
            await currentPc.setRemoteDescription(new RTCSessionDescription(answer));
            await drainCandidates(currentPc);
          }
        } catch (setAnsErr) {
          console.error('[WebRTC] Error handling answer:', setAnsErr);
        }
      };

      // When we receive an ICE candidate
      const onIceCandidate = async ({ candidate }) => {
        if (!candidate) return;
        const currentPc = pcRef.current;
        if (currentPc && currentPc.remoteDescription && currentPc.remoteDescription.type) {
          try {
            await currentPc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (iceErr) {
            console.warn('[WebRTC] Candidate warning:', iceErr.message);
          }
        } else {
          candidateQueueRef.current.push(candidate);
        }
      };

      // When call is ended
      const onCallEnded = () => {
        setCallEnded(true);
        fullTeardown();
      };

      // When remote participant leaves the room
      const onUserLeft = () => {
        console.log('[WebRTC] Remote peer left room');
        setPeerInRoom(false);
        setPeerInfo(null);
        setStreamActive(false);
        setConnStatus('waiting');
        setConnError('');
        teardownPeerConnection();
      };

      socket.on('user-joined', onUserJoined);
      socket.on('offer', onOffer);
      socket.on('answer', onAnswer);
      socket.on('ice-candidate', onIceCandidate);
      socket.on('call-ended', onCallEnded);
      socket.on('user-left', onUserLeft);

      // 3. Network Quality Poller
      statsTimerRef.current = setInterval(async () => {
        try {
          const stats = await pcRef.current?.getStats();
          let lost = 0;
          let recv = 0;
          stats?.forEach((report) => {
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
              lost += report.packetsLost || 0;
              recv += report.packetsReceived || 0;
            }
          });
          const ratio = lost + recv > 0 ? lost / (lost + recv) : 0;
          setQuality(ratio > 0.08 ? 'Poor' : 'Good');
        } catch {
          // stats error safe to ignore
        }
      }, 3500);

      return () => {
        socket.off('user-joined', onUserJoined);
        socket.off('offer', onOffer);
        socket.off('answer', onAnswer);
        socket.off('ice-candidate', onIceCandidate);
        socket.off('call-ended', onCallEnded);
        socket.off('user-left', onUserLeft);
      };
    }

    let cleanupFn;
    initSession().then((fn) => {
      cleanupFn = fn;
    });

    return () => {
      cancelled = true;
      cleanupFn?.();
      fullTeardown();
    };
  }, [socket, roomId, user?.id, user?.role, fullTeardown, teardownPeerConnection, triggerIceRestart]);

  // Ensure remote video element plays whenever streamActive changes
  useEffect(() => {
    if (streamActive && remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [streamActive]);

  // ── Media Controls ─────────────────────────────────────────────────────────
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
    fullTeardown();
    setCallEnded(true);
  }

  // ── Call Ended Summary View ────────────────────────────────────────────────
  if (callEnded) {
    return (
      <div className="h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <PhoneOff className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">Teleconsultation Ended</h2>
            <p className="text-sm text-stone-500 mt-1">Room session has been completed</p>
          </div>
          <div className="p-4 bg-stone-50 rounded-xl text-left text-xs space-y-2 border border-stone-200">
            <div className="flex justify-between">
              <span className="text-stone-500">Room Code:</span>
              <span className="font-mono font-bold text-stone-800">{roomId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Total Call Time:</span>
              <span className="font-bold text-stone-800">{formatDuration(callDuration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Clinical Record:</span>
              <span className="text-emerald-600 font-bold">Encounter Saved</span>
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

  // ── Main Video Room View ───────────────────────────────────────────────────
  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-stone-950 text-white select-none">
      {/* Top Header Bar */}
      <header className="h-16 shrink-0 border-b border-stone-800 bg-stone-900/90 backdrop-blur px-4 sm:px-6 flex items-center justify-between z-20">
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
              <button
                onClick={copyRoomCode}
                className="group text-xs px-2.5 py-0.5 rounded-full bg-stone-800 hover:bg-stone-700 font-mono text-stone-300 border border-stone-700 flex items-center gap-1.5 transition"
                title="Click to copy room code"
              >
                <span>{roomId}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-stone-500 group-hover:text-stone-300" />}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
              <span>{user?.name || 'Practitioner'}</span>
              <span>•</span>
              {connStatus === 'connected' && streamActive ? (
                <span className="text-emerald-400 font-medium">
                  In Call ({formatDuration(callDuration)})
                </span>
              ) : connStatus === 'connecting' ? (
                <span className="text-cyan-400 font-medium animate-pulse">
                  Connecting video…
                </span>
              ) : (
                <span className="text-amber-400">
                  Waiting for participant to join…
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quality / Status Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              connStatus === 'connected' && streamActive
                ? quality === 'Good'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                : 'bg-stone-800 text-stone-400 border border-stone-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>
              {connStatus === 'connected' && streamActive
                ? quality === 'Good'
                  ? 'HD Quality'
                  : 'Network Weak'
                : connStatus === 'connecting'
                ? 'Negotiating...'
                : 'Waiting for Peer'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Video Area */}
      <main className="flex-1 relative flex items-center justify-center p-3 sm:p-5 min-h-0 overflow-hidden">
        {/* Connection Error Banner with 1-Click Reconnect */}
        {connError && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-red-950/95 text-red-200 border border-red-700/80 rounded-xl text-xs font-medium flex items-center gap-3 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{connError}</span>
            <button
              onClick={triggerIceRestart}
              className="ml-1 px-2.5 py-1 bg-red-800/90 hover:bg-red-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reconnect</span>
            </button>
          </div>
        )}

        {/* Video Canvas Container */}
        <div className="w-full h-full max-w-6xl rounded-2xl overflow-hidden relative border border-stone-800 bg-stone-900 shadow-2xl flex items-center justify-center">
          {/* Remote Video Stream Element */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              streamActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
            }`}
          />

          {/* Clean Waiting View when Peer has not yet joined */}
          {!streamActive && (
            <div className="text-center space-y-4 p-8 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-stone-800/90 flex items-center justify-center mx-auto border border-stone-700 shadow-inner">
                {connStatus === 'connecting' ? (
                  <Radio className="w-10 h-10 text-cyan-400 animate-pulse" />
                ) : (
                  <User className="w-10 h-10 text-stone-400 animate-pulse" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-stone-200">
                  {connStatus === 'connecting'
                    ? 'Connecting Video Stream…'
                    : 'Waiting for Other Participant'}
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  {connStatus === 'connecting'
                    ? 'Participant is in the room. Establishing encrypted peer-to-peer connection...'
                    : 'You are currently the only person in this consultation room. Share the room code below or wait for the consultant to enter.'}
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={copyRoomCode}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs text-stone-200 font-mono transition shadow-sm"
                >
                  <span>Room: {roomId}</span>
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                </button>
              </div>
            </div>
          )}

          {/* Remote Connected Badge */}
          {streamActive && (
            <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-stone-900/80 backdrop-blur rounded-lg border border-stone-700 text-xs font-medium text-stone-200 flex items-center gap-2 z-10 shadow">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{peerInfo?.role || 'Remote'} Connected</span>
            </div>
          )}

          {/* Local User PiP Window */}
          <div className="absolute top-4 right-4 w-40 sm:w-56 aspect-video bg-stone-950 rounded-xl overflow-hidden border-2 border-stone-700 shadow-2xl z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!camOn ? 'hidden' : 'block'}`}
            />
            {!camOn && (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-500 text-xs gap-1 bg-stone-900">
                <VideoOff className="w-5 h-5 text-stone-600" />
                <span className="text-[11px]">Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/75 backdrop-blur rounded text-[10px] font-semibold text-stone-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>You ({user?.role || 'User'})</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Controls Bar */}
      <footer className="h-20 shrink-0 bg-stone-900 border-t border-stone-800 flex items-center justify-center gap-4 px-6 z-20">
        <button
          onClick={toggleMic}
          className={`p-4 rounded-full transition flex items-center justify-center ${
            micOn
              ? 'bg-stone-800 hover:bg-stone-700 text-white shadow'
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
              ? 'bg-stone-800 hover:bg-stone-700 text-white shadow'
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
