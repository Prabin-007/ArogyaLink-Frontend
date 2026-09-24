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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
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
  const offerTimeoutRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [quality, setQuality] = useState('Good');
  const [callEnded, setCallEnded] = useState(false);
  const [connError, setConnError] = useState('');
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [copied, setCopied] = useState(false);

  // Call duration counter
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

  const copyRoomCode = () => {
    navigator.clipboard?.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Drains queued ICE candidates once remoteDescription is set ──────────────
  const drainCandidates = async (pc) => {
    while (candidateQueueRef.current.length > 0) {
      const candidate = candidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC] Draining candidate warning:', err.message);
      }
    }
  };

  // ── Trigger ICE Restart on disruption ───────────────────────────────────────
  const triggerIceRestart = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || pc.signalingState === 'closed') return;
    try {
      console.log('[WebRTC] Initiating ICE restart...');
      setConnError('Re-negotiating connection...');
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socket?.emit('offer', { roomId, offer });
    } catch (err) {
      console.warn('[WebRTC] ICE restart failed:', err.message);
      setConnError('Reconnection failed. Please refresh or rejoin.');
    }
  }, [socket, roomId]);

  // ── Teardown Connection & Devices ──────────────────────────────────────────
  const teardown = useCallback(() => {
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (offerTimeoutRef.current) clearTimeout(offerTimeoutRef.current);

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  // ── WebRTC Setup & Signaling ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomId) return;
    let cancelled = false;

    async function initSession() {
      // 1. Acquire Local Media with Graceful Fallback
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
          console.warn('[WebRTC] Camera locked by other window, falling back to audio:', err2.message);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setCamOn(false);
          } catch (err3) {
            console.error('[WebRTC] Device permission error:', err3);
            setConnError('Microphone/Camera permission denied. Please allow access and reload.');
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

      // 2. Initialize RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local audio and video tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // 3. Handle incoming remote stream tracks
      pc.ontrack = (event) => {
        console.log('[WebRTC] Remote track received:', event.track.kind);
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
          remoteVideoRef.current.play().catch((e) => console.log('Autoplay play error:', e.message));
        }

        setRemoteJoined(true);
        setConnError('');
      };

      // 4. Send ICE Candidates to peer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { roomId, candidate: event.candidate });
        }
      };

      // 5. Monitor Connection State
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('[WebRTC] Connection state:', state);

        if (state === 'connected') {
          setConnError('');
          setRemoteJoined(true);
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        } else if (['disconnected', 'failed'].includes(state)) {
          setConnError('Connection disrupted. Attempting to reconnect...');
          // Schedule auto-reconnect after 1.5s if not restored
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (pcRef.current && ['disconnected', 'failed'].includes(pcRef.current.connectionState)) {
                triggerIceRestart();
              }
            }, 1500);
          }
        }
      };

      // 6. Join Signaling Room
      socket.emit('join-room', {
        roomId,
        userId: user?.id || 'guest',
        role: user?.role || 'DOCTOR',
      });

      // ── Socket Signaling Handlers ──────────────────────────────────────────

      // A. Another participant joined the room -> We initiate the offer
      const onUserJoined = async ({ socketId }) => {
        console.log('[WebRTC] Remote peer joined room:', socketId);
        setRemoteJoined(true);
        setConnError('');
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { roomId, offer });
        } catch (offerErr) {
          console.error('[WebRTC] Error creating offer:', offerErr);
        }
      };

      // B. We joined an occupied room -> Wait for offer, or create offer after 1.8s fallback
      const onPeerAlreadyInRoom = () => {
        console.log('[WebRTC] Peer is already in room, awaiting offer or initiating fallback...');
        setRemoteJoined(true);
        if (offerTimeoutRef.current) clearTimeout(offerTimeoutRef.current);

        offerTimeoutRef.current = setTimeout(async () => {
          if (pcRef.current && !pcRef.current.remoteDescription && pcRef.current.signalingState === 'stable') {
            console.log('[WebRTC] Fallback: initiating offer to existing peer...');
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('offer', { roomId, offer });
            } catch (e) {
              console.warn('[WebRTC] Fallback offer failed:', e);
            }
          }
        }, 1800);
      };

      // C. Received Offer from Peer
      const onOffer = async ({ offer }) => {
        console.log('[WebRTC] Received offer from peer');
        if (offerTimeoutRef.current) clearTimeout(offerTimeoutRef.current);
        setRemoteJoined(true);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          await drainCandidates(pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { roomId, answer });
        } catch (ansErr) {
          console.error('[WebRTC] Error handling offer:', ansErr);
        }
      };

      // D. Received Answer from Peer
      const onAnswer = async ({ answer }) => {
        console.log('[WebRTC] Received answer from peer');
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await drainCandidates(pc);
        } catch (setAnsErr) {
          console.error('[WebRTC] Error handling answer:', setAnsErr);
        }
      };

      // E. Received ICE Candidate
      const onIceCandidate = async ({ candidate }) => {
        if (!candidate) return;
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (iceErr) {
            console.warn('[WebRTC] Candidate error:', iceErr.message);
          }
        } else {
          // Buffer candidate until remoteDescription is set
          candidateQueueRef.current.push(candidate);
        }
      };

      // F. Call Ended
      const onCallEnded = () => {
        setCallEnded(true);
        teardown();
      };

      // G. Peer Left
      const onUserLeft = () => {
        console.log('[WebRTC] Remote peer left');
        setRemoteJoined(false);
        setConnError('Remote participant has left or disconnected.');
      };

      socket.on('user-joined', onUserJoined);
      socket.on('peer-already-in-room', onPeerAlreadyInRoom);
      socket.on('offer', onOffer);
      socket.on('answer', onAnswer);
      socket.on('ice-candidate', onIceCandidate);
      socket.on('call-ended', onCallEnded);
      socket.on('user-left', onUserLeft);

      // 7. Network Quality Polling
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
        socket.off('peer-already-in-room', onPeerAlreadyInRoom);
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
      teardown();
    };
  }, [socket, roomId, user?.id, user?.role, teardown, triggerIceRestart]);

  // Ensure remote video plays whenever remoteJoined changes
  useEffect(() => {
    if (remoteJoined && remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteJoined]);

  // ── Media Toggles ──────────────────────────────────────────────────────────
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

  // ── Call Ended Summary Screen ──────────────────────────────────────────────
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
              <span className="text-stone-500">Duration:</span>
              <span className="font-bold text-stone-800">{formatDuration(callDuration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Clinical Encounter:</span>
              <span className="text-emerald-600 font-bold">Logged to Medical Record</span>
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

  // ── Main Video Room Interface ──────────────────────────────────────────────
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
              <span className={remoteJoined ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                {remoteJoined ? `In Call (${formatDuration(callDuration)})` : 'Waiting for participant to join…'}
              </span>
            </div>
          </div>
        </div>

        {/* Quality Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              quality === 'Good'
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                : 'bg-amber-950/80 text-amber-400 border border-amber-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{quality === 'Good' ? 'HD Quality' : 'Network Weak'}</span>
          </div>
        </div>
      </header>

      {/* Main Video View Area */}
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

        {/* Remote Video Container Tile */}
        <div className="w-full h-full max-w-6xl rounded-2xl overflow-hidden relative border border-stone-800 bg-stone-900 shadow-2xl flex items-center justify-center">
          {/* Remote Video Stream Element */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              remoteJoined ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
            }`}
          />

          {/* Waiting Placeholder */}
          {!remoteJoined && (
            <div className="text-center space-y-4 p-8">
              <div className="w-20 h-20 rounded-full bg-stone-800/90 flex items-center justify-center mx-auto border border-stone-700 shadow-inner">
                <User className="w-10 h-10 text-stone-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-stone-200">Waiting for Remote Participant</h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
                  When the doctor or ASHA worker enters room <span className="font-mono text-emerald-400">{roomId}</span>, the encrypted WebRTC stream will connect automatically.
                </p>
              </div>
              <button
                onClick={copyRoomCode}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs text-stone-300 font-mono transition"
              >
                <span>Room Code: {roomId}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-stone-500" />}
              </button>
            </div>
          )}

          {/* Remote Status Badge */}
          {remoteJoined && (
            <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-stone-900/80 backdrop-blur rounded-lg border border-stone-700 text-xs font-medium text-stone-200 flex items-center gap-2 z-10 shadow">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Remote Participant Connected
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

      {/* Bottom Call Controls Bar */}
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
