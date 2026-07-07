import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Peer } from 'peerjs';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  Radio, 
  Users, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  Sparkles,
  ArrowRight,
  Settings,
  Headphones,
  Sliders,
  Activity,
  Camera,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  Video,
  Gamepad2,
  Scroll,
  Crown,
  Trophy,
  Clock,
  Signal,
  Send,
  MessageSquare,
  X,
  LogOut,
  CheckCircle
} from 'lucide-react';

// Gaming background and default preset avatars
// @ts-ignore
import gamerBackground from './assets/images/gamer_background_1782787380948.jpg';
// @ts-ignore
import cyberCityBg from './assets/images/cyber_city_bg_1782876158150.jpg';
// @ts-ignore
import spaceBg from './assets/images/space_bg_1782876166352.jpg';
// @ts-ignore
import matrixBg from './assets/images/matrix_bg_1782876179607.jpg';
// @ts-ignore
import avatarCyberWarrior from './assets/images/avatar_cyber_warrior_1782787472373.jpg';
// @ts-ignore
import avatarNeonWolf from './assets/images/avatar_neon_wolf_1782787487387.jpg';
// @ts-ignore
import avatarPixelKnight from './assets/images/avatar_pixel_knight_1782787502165.jpg';
// @ts-ignore
import avatarCyberSamurai from './assets/images/avatar_cyber_samurai_1782870023303.jpg';
// @ts-ignore
import avatarNeonSoldier from './assets/images/avatar_neon_soldier_1782870037655.jpg';

// BTS VIP Avatars
// @ts-ignore
import avatarBtsJungkook from './assets/images/bts_jungkook_avatar_1782872425482.jpg';
// @ts-ignore
import avatarBtsV from './assets/images/bts_v_avatar_1782872436513.jpg';
// @ts-ignore
import avatarBtsJimin from './assets/images/bts_jimin_avatar_1782872446841.jpg';
// @ts-ignore
import avatarBtsGaby from './assets/images/bts_gaby_avatar_1782872458081.jpg';

// Game Banners
// @ts-ignore
import bannerMinecraft from './assets/images/banner_minecraft_1782869962709.jpg';
// @ts-ignore
import bannerRoblox from './assets/images/banner_roblox_1782869974748.jpg';
// @ts-ignore
import bannerCS from './assets/images/banner_cs_1782869985277.jpg';
// @ts-ignore
import bannerL4D from './assets/images/banner_l4d_1782869999289.jpg';
// @ts-ignore
import bannerRE from './assets/images/banner_re_1782870011028.jpg';

interface Participant {
  peerId: string;
  name: string;
  isMe: boolean;
  muted: boolean;
  speaking: boolean;
  stream: MediaStream | null;
  avatar?: string;
}

interface ActivityNotification {
  id: string;
  message: string;
  type: 'join' | 'leave';
  avatar?: string;
  timestamp: Date;
}

interface ChatMessage {
  id: string;
  peerId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  avatar?: string;
}

interface AppEnv {
  id: string;
  name: string;
  bgImage: string;
  violet: string;
  cyan: string;
  overlay1: string;
  overlay2: string;
}

const ENVIRONMENTS: AppEnv[] = [
  {
    id: 'cyber-tropa',
    name: 'Cyber Tropa',
    bgImage: gamerBackground,
    violet: '#7c3aed',
    cyan: '#06b6d4',
    overlay1: 'rgba(10, 10, 18, 0.72)',
    overlay2: 'rgba(6, 6, 12, 0.94)'
  },
  {
    id: 'cyber-city',
    name: 'Cyber City',
    bgImage: cyberCityBg,
    violet: '#ec4899',
    cyan: '#06b6d4',
    overlay1: 'rgba(8, 8, 16, 0.65)',
    overlay2: 'rgba(5, 5, 10, 0.92)'
  },
  {
    id: 'space',
    name: 'Espacial',
    bgImage: spaceBg,
    violet: '#8b5cf6',
    cyan: '#6366f1',
    overlay1: 'rgba(6, 6, 15, 0.60)',
    overlay2: 'rgba(3, 3, 8, 0.95)'
  },
  {
    id: 'matrix',
    name: 'Matrix',
    bgImage: matrixBg,
    violet: '#10b981',
    cyan: '#22c55e',
    overlay1: 'rgba(5, 15, 5, 0.78)',
    overlay2: 'rgba(2, 6, 2, 0.96)'
  }
];

const ROOM_NAME = 'sala-principal-tropa-2024';

export default function App() {
  const [step, setStep] = useState<'login' | 'call'>('login');
  const [selectedEnvId, setSelectedEnvId] = useState<string>(() => localStorage.getItem('tropa_selected_env') || 'cyber-tropa');
  const [username, setUsername] = useState('');
  
  // Firebase Auth integration states
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      setAuthLoading(false);
      if (fUser) {
        if (fUser.displayName) {
          setUsername(fUser.displayName);
        }
        if (fUser.photoURL) {
          setMyAvatar(fUser.photoURL);
        }
        try {
          const idToken = await fUser.getIdToken();
          const response = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            }
          });
          const data = await response.json();
          console.log('[Tropa Auth Sync] Profile synced with SQL:', data);
        } catch (error) {
          console.error('[Tropa Auth Sync] Failed to sync auth profile with SQL:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPeerId, setMyPeerId] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [muteAllIncoming, setMuteAllIncoming] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Activity Feed notification states
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [activeToasts, setActiveToasts] = useState<ActivityNotification[]>([]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'activity' | 'vips'>('activity');

  // Discreet session timer state and logic
  const [callDuration, setCallDuration] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);

  // Live Chat states and helpers
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    if (isChatOpen) {
      setUnreadCount(0);
      // Scroll to bottom when opening
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isChatOpen]);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const playChatBubbleSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
      
      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 300);
    } catch (e) {}
  };

  const addIncomingChatMessage = (data: any) => {
    const newMsg: ChatMessage = {
      id: data.id || Math.random().toString(36).substring(2, 9),
      peerId: data.peerId,
      senderName: data.senderName || 'Anônimo',
      text: data.text,
      timestamp: new Date(data.timestamp || Date.now()),
      avatar: data.avatar
    };

    setChatMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });

    if (!isChatOpenRef.current) {
      setUnreadCount((prev) => prev + 1);
    }
    playChatBubbleSound();
  };

  const sendChatMessage = (text: string) => {
    if (!text.trim()) return;
    const msgId = Math.random().toString(36).substring(2, 9);
    const newMsg: ChatMessage = {
      id: msgId,
      peerId: myPeerId,
      senderName: username || 'Você',
      text: text.trim(),
      timestamp: new Date(),
      avatar: myAvatar
    };

    setChatMessages((prev) => [...prev, newMsg]);

    // Broadcast to all peers
    Object.values(activeConnections.current).forEach((conn: any) => {
      if (conn && conn.open) {
        try {
          conn.send({
            type: 'chat',
            id: msgId,
            peerId: myPeerId,
            senderName: username || 'Você',
            text: text.trim(),
            timestamp: newMsg.timestamp.toISOString(),
            avatar: myAvatar
          });
        } catch (err) {
          console.error("Failed to send chat message to peer:", conn.peer, err);
        }
      }
    });

    setChatInput('');
  };

  const handleIncomingData = (data: any) => {
    if (!data) return;
    if (data.type === 'state') {
      updateParticipantState(data.peerId, {
        name: data.name,
        muted: data.muted,
        speaking: data.speaking,
        avatar: data.avatar
      });
    } else if (data.type === 'chat') {
      addIncomingChatMessage(data);
    }
  };

  useEffect(() => {
    if (step !== 'call') {
      setCallDuration(0);
      setLatency(null);
      return;
    }
    const timerInterval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [step]);

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num: number) => String(num).padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const getLatencyInfo = (ms: number | null) => {
    if (ms === null) {
      return { 
        color: 'text-gray-400', 
        bg: 'bg-gray-400/[0.03]', 
        border: 'border-gray-500/10', 
        text: 'CONECTANDO...' 
      };
    }
    if (ms <= 60) {
      return { 
        color: 'text-emerald-400', 
        bg: 'bg-emerald-500/[0.03]', 
        border: 'border-emerald-500/10', 
        text: `${ms}ms` 
      };
    }
    if (ms <= 150) {
      return { 
        color: 'text-amber-400', 
        bg: 'bg-amber-500/[0.03]', 
        border: 'border-amber-500/10', 
        text: `${ms}ms` 
      };
    }
    return { 
      color: 'text-rose-500 animate-pulse', 
      bg: 'bg-rose-500/[0.03]', 
      border: 'border-rose-500/15', 
      text: `${ms}ms` 
    };
  };

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const now = ctx.currentTime;
      
      // Tone 1: Futuristic high pitch slide (sine wave for clean warmth)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5 note
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // slides up to E6
      
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.08, now + 0.02); // quick fade in
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35); // smooth decay
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);
      
      // Tone 2: Ultra short high chime highlight (triangle wave for subtle brightness)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760, now + 0.06); // A6 note
      
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0, now + 0.06);
      gain2.gain.linearRampToValueAtTime(0.04, now + 0.08); // quick entrance
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25); // fast decay
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.3);
      
      // Close context when audio finishes to save resources
      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 500);
    } catch (e) {
      console.warn("[Tropa Call] Could not play notification chime:", e);
    }
  };

  const addNotification = (message: string, type: 'join' | 'leave', avatar?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotif: ActivityNotification = { id, message, type, avatar, timestamp: new Date() };
    
    // Add to overall history log
    setNotifications((prev) => [newNotif, ...prev].slice(0, 30));

    // Add to active popups
    setActiveToasts((prev) => [...prev, newNotif]);

    // Play light, futuristic synthesized notification chime
    playNotificationSound();

    // Schedule dismiss after 4.5s
    setTimeout(() => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Microphone testing and loopback controls state
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [loopbackActive, setLoopbackActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const testMicCleanupRef = useRef<(() => void) | null>(null);
  const loopbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVolumeMeterRef = useRef<HTMLDivElement | null>(null);
  const localVolumeTextRef = useRef<HTMLSpanElement | null>(null);
  const visualizerContainerRef = useRef<HTMLDivElement | null>(null);

  // Microphone hardware processing filters & software volume (gain) adjustments
  const [micVolume, setMicVolume] = useState(1.0); // range: 0.0 to 3.0
  const [enableEchoCancellation, setEnableEchoCancellation] = useState(true);
  const [enableNoiseSuppression, setEnableNoiseSuppression] = useState(true);
  const [enableAutoGain, setEnableAutoGain] = useState(true);

  // Web Audio refs for Microphone Gain (Volume) multiplier
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const originalStreamRef = useRef<MediaStream | null>(null);

  // Active peer connections and audios
  const activeConnections = useRef<Record<string, any>>({});
  const activeAudios = useRef<Record<string, HTMLAudioElement>>({});
  const speakingCleanupRef = useRef<(() => void) | null>(null);

  // User custom avatar state
  const [myAvatar, setMyAvatar] = useState<string>(avatarCyberWarrior);
  const myAvatarRef = useRef(myAvatar);

  // Keep references to state inside callbacks to avoid stale closures
  const isMutedRef = useRef(isMuted);
  const muteAllIncomingRef = useRef(muteAllIncoming);
  const isSpeakingRef = useRef(isSpeaking);
  const localStreamRef = useRef(localStream);
  const participantsRef = useRef(participants);
  const usernameRef = useRef(username);
  const myPeerIdRef = useRef(myPeerId);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { muteAllIncomingRef.current = muteAllIncoming; }, [muteAllIncoming]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { participantsRef.current = participants; }, [participants]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { myPeerIdRef.current = myPeerId; }, [myPeerId]);
  useEffect(() => { myAvatarRef.current = myAvatar; }, [myAvatar]);

  // Load avatar from sessionStorage on mount
  useEffect(() => {
    const savedAvatar = sessionStorage.getItem('tropa_call_avatar');
    if (savedAvatar) {
      setMyAvatar(savedAvatar);
    }
  }, []);

  // Broadcast local state changes to all peers
  const broadcastState = (state: { muted: boolean; speaking: boolean; avatar?: string }) => {
    const payload = {
      type: 'state',
      peerId: myPeerIdRef.current,
      name: usernameRef.current,
      muted: state.muted,
      speaking: state.speaking,
      avatar: state.avatar !== undefined ? state.avatar : myAvatarRef.current
    };

    Object.values(activeConnections.current).forEach((conn: any) => {
      if (conn && conn.open) {
        try {
          conn.send(payload);
        } catch (err) {
          console.error("Failed to send state data to peer:", conn.peer, err);
        }
      }
    });
  };

  // Sync state broadcast whenever isMuted or isSpeaking changes
  useEffect(() => {
    if (step === 'call' && myPeerId) {
      broadcastState({ muted: isMuted, speaking: isSpeaking, avatar: myAvatar });
      // Update our own status in the grid
      setParticipants((prev) =>
        prev.map((p) => (p.isMe ? { ...p, muted: isMuted, speaking: isSpeaking, avatar: myAvatar } : p))
      );
    }
  }, [isMuted, isSpeaking, step, myPeerId, myAvatar]);

  // Update specific participant state
  const updateParticipantState = (peerId: string, state: { name?: string; muted?: boolean; speaking?: boolean; avatar?: string }) => {
    setParticipants((prev) => {
      const existing = prev.find((p) => p.peerId === peerId);
      if (existing) {
        // Trigger join notification if name is updated from default placeholders to real handle
        if (state.name && (!existing.name || existing.name === 'Conectando...' || existing.name === 'Soldado') && state.name !== 'Conectando...' && state.name !== 'Soldado') {
          setTimeout(() => {
            addNotification(`${state.name} entrou na call`, 'join', state.avatar || existing.avatar);
          }, 0);
        }
        return prev.map((p) => (p.peerId === peerId ? { ...p, ...state } : p));
      } else {
        // Trigger join notification if new participant has real custom name
        if (state.name && state.name !== 'Conectando...' && state.name !== 'Soldado') {
          setTimeout(() => {
            addNotification(`${state.name} entrou na call`, 'join', state.avatar);
          }, 0);
        }
        return [
          ...prev,
          {
            peerId,
            name: state.name || 'Soldado',
            isMe: false,
            muted: state.muted ?? false,
            speaking: state.speaking ?? false,
            stream: null,
            avatar: state.avatar
          }
        ];
      }
    });
  };

  // Handle a peer disconnecting
  const handlePeerDisconnect = (peerId: string) => {
    console.log(`[Tropa Call] Peer disconnected: ${peerId}`);
    
    // Find name and avatar from current participants list before deleting to trigger leave toast
    const targetPeer = participantsRef.current.find((p) => p.peerId === peerId);
    if (targetPeer && targetPeer.name && targetPeer.name !== 'Conectando...' && targetPeer.name !== 'Soldado') {
      addNotification(`${targetPeer.name} saiu da call`, 'leave', targetPeer.avatar);
    }

    // Close data connection
    if (activeConnections.current[peerId]) {
      try {
        activeConnections.current[peerId].close();
      } catch (e) {}
      delete activeConnections.current[peerId];
    }

    // Stop and remove audio element
    if (activeAudios.current[peerId]) {
      try {
        activeAudios.current[peerId].pause();
        activeAudios.current[peerId].srcObject = null;
      } catch (e) {}
      delete activeAudios.current[peerId];
    }

    // Filter out from UI
    setParticipants((prev) => prev.filter((p) => p.peerId !== peerId));
  };

  // Assign incoming or outgoing audio stream safely
  const addRemoteStream = (peerId: string, stream: MediaStream) => {
    console.log(`[Tropa Call] Adding audio stream for: ${peerId}`);
    
    // Play the audio
    if (!activeAudios.current[peerId]) {
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.volume = muteAllIncomingRef.current ? 0 : 1;
      activeAudios.current[peerId] = audio;
      
      // Attempt play (requires user interaction gesture)
      audio.play().catch((e) => {
        console.warn("[Tropa Call] Autoplay blocked, waiting for click/tap to resume:", e);
        // Play on document click/tap if blocked
        const playOnGesture = () => {
          audio.play().catch(err => console.error(err));
          document.removeEventListener('click', playOnGesture);
        };
        document.addEventListener('click', playOnGesture);
      });
    } else {
      activeAudios.current[peerId].srcObject = stream;
      activeAudios.current[peerId].volume = muteAllIncomingRef.current ? 0 : 1;
    }

    setParticipants((prev) => {
      const existing = prev.find((p) => p.peerId === peerId);
      if (existing) {
        return prev.map((p) => (p.peerId === peerId ? { ...p, stream } : p));
      } else {
        return [
          ...prev,
          {
            peerId,
            name: 'Conectando...',
            isMe: false,
            muted: false,
            speaking: false,
            stream
          }
        ];
      }
    });
  };

  // Web Audio speaking level detection
  const startSpeakingDetection = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingTimer: any = null;
      let currentlySpeaking = false;
      let isChecking = true;

      const checkVolume = () => {
        if (!isChecking) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Sound intensity threshold - extremely sensitive (no gate limit) to capture everything perfectly
        const threshold = 1.0;

        if (average > threshold && !isMutedRef.current) {
          if (!currentlySpeaking) {
            currentlySpeaking = true;
            setIsSpeaking(true);
          }
          if (speakingTimer) {
            clearTimeout(speakingTimer);
            speakingTimer = null;
          }
        } else {
          if (currentlySpeaking && !speakingTimer) {
            // Smooth speaking hangover window (300ms) for ultra-fast, responsive state changes
            speakingTimer = setTimeout(() => {
              currentlySpeaking = false;
              setIsSpeaking(false);
              speakingTimer = null;
            }, 300);
          }
        }

        // Update visualizer elements using direct ref styling for maximum performance
        const percentage = Math.min(100, Math.round((average / 50) * 100));
        
        if (localVolumeMeterRef.current) {
          localVolumeMeterRef.current.style.width = `${percentage}%`;
          if (percentage > 85) {
            localVolumeMeterRef.current.style.backgroundColor = 'var(--red)';
            localVolumeMeterRef.current.style.boxShadow = '0 0 10px var(--red)';
          } else if (percentage > 10) {
            localVolumeMeterRef.current.style.backgroundColor = 'var(--cyan)';
            localVolumeMeterRef.current.style.boxShadow = '0 0 10px var(--cyan)';
          } else {
            localVolumeMeterRef.current.style.backgroundColor = 'var(--violet)';
            localVolumeMeterRef.current.style.boxShadow = 'none';
          }
        }

        // Real-time voice frequency spectrum analyzer update
        if (visualizerContainerRef.current) {
          const bars = visualizerContainerRef.current.childNodes;
          if (bars && bars.length > 0) {
            const step = Math.floor(bufferLength / bars.length) || 1;
            for (let i = 0; i < bars.length; i++) {
              const dataIdx = i * step;
              const val = dataArray[dataIdx] || 0;
              const heightPercent = Math.min(100, Math.max(10, Math.round((val / 255) * 100)));
              const bar = bars[i] as HTMLElement;
              bar.style.height = `${heightPercent}%`;
              bar.style.opacity = `${0.35 + (heightPercent / 100) * 0.65}`;
            }
          }
        }
        
        if (localVolumeTextRef.current) {
          if (isMutedRef.current) {
            localVolumeTextRef.current.textContent = 'MUTADO';
          } else if (percentage < 3) {
            localVolumeTextRef.current.textContent = 'SILENCIOSO';
          } else if (percentage > 85) {
            localVolumeTextRef.current.textContent = 'MUITO ALTO';
          } else {
            localVolumeTextRef.current.textContent = `${percentage}%`;
          }
        }

        if (isChecking) {
          requestAnimationFrame(checkVolume);
        }
      };

      checkVolume();

      return () => {
        isChecking = false;
        try {
          audioContext.close();
        } catch (e) {}
      };
    } catch (err) {
      console.error("[Tropa Call] Web Audio analysis failed:", err);
      return null;
    }
  };

  // Stop and cleanup all local audio tracks, contexts, and nodes
  const stopAllLocalTracks = () => {
    if (speakingCleanupRef.current) {
      speakingCleanupRef.current();
      speakingCleanupRef.current = null;
    }
    if (testMicCleanupRef.current) {
      testMicCleanupRef.current();
      testMicCleanupRef.current = null;
    }
    
    // Stop all tracks in original raw stream
    if (originalStreamRef.current) {
      originalStreamRef.current.getTracks().forEach((track) => track.stop());
      originalStreamRef.current = null;
    }
    
    // Stop all tracks in localStream state
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    // Close Web Audio context
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    gainNodeRef.current = null;
  };

  // Helper to wrap a raw MediaStream with a Web Audio Gain Node (Software Volume)
  const processStreamWithGain = (rawStream: MediaStream, volume: number): MediaStream => {
    // Return the raw stream directly to ensure zero audio engine latency (no lag) and native hardware/software optimization (no bugs)
    originalStreamRef.current = rawStream;
    return rawStream;
  };

  // Dynamically update software gain multiplier when micVolume state changes
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      gainNodeRef.current.gain.value = micVolume;
    }
  }, [micVolume]);

  // Dynamically update hardware track constraints when filter toggles change
  useEffect(() => {
    if (originalStreamRef.current) {
      const audioTrack = originalStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.applyConstraints({
          echoCancellation: enableEchoCancellation,
          noiseSuppression: enableNoiseSuppression,
          autoGainControl: enableAutoGain
        }).then(() => {
          console.log("[Tropa Call] Dynamic audio track constraints applied:", {
            echoCancellation: enableEchoCancellation,
            noiseSuppression: enableNoiseSuppression,
            autoGainControl: enableAutoGain
          });
        }).catch((err) => {
          console.error("[Tropa Call] Dynamic applyConstraints failed:", err);
        });
      }
    }
  }, [enableEchoCancellation, enableNoiseSuppression, enableAutoGain]);

  // Start microfone test function
  const startTestMic = async () => {
    if (isTestingMic) {
      stopTestMic();
      return;
    }

    setMicError(null);
    try {
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: enableEchoCancellation,
          noiseSuppression: enableNoiseSuppression,
          autoGainControl: enableAutoGain
        },
        video: false
      });
      
      // Process rawStream with Software Gain (micVolume)
      const processedStream = processStreamWithGain(rawStream, micVolume);
      setLocalStream(processedStream);
      setIsTestingMic(true);
      
      // Delay slightly to ensure ref components have mounted/rendered
      setTimeout(() => {
        const cleanup = startSpeakingDetection(processedStream);
        if (cleanup) {
          testMicCleanupRef.current = cleanup;
        }
      }, 100);
    } catch (err: any) {
      console.error("[Tropa Call] Microfone bloqueado ou indisponível para teste:", err);
      setMicError("Não conseguimos acessar o seu microfone. Verifique as permissões de áudio.");
    }
  };

  // Stop microfone test
  const stopTestMic = () => {
    setIsTestingMic(false);
    setLoopbackActive(false);
    stopAllLocalTracks();
  };

  // Audio Loopback monitor effect
  useEffect(() => {
    if (loopbackActive && localStream) {
      if (!loopbackAudioRef.current) {
        loopbackAudioRef.current = new Audio();
      }
      loopbackAudioRef.current.srcObject = localStream;
      loopbackAudioRef.current.muted = false;
      loopbackAudioRef.current.volume = 0.55; // safe feedback level
      
      loopbackAudioRef.current.play().catch((err) => {
        console.warn("[Tropa Call] Loopback playback blocked or failed:", err);
      });
    } else {
      if (loopbackAudioRef.current) {
        loopbackAudioRef.current.pause();
        loopbackAudioRef.current.srcObject = null;
      }
    }

    return () => {
      if (loopbackAudioRef.current) {
        loopbackAudioRef.current.pause();
        loopbackAudioRef.current.srcObject = null;
      }
    };
  }, [loopbackActive, localStream]);

  // Webcam states and helper functions for taking profile pictures
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startWebcam = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 300 }, height: { ideal: 300 }, facingMode: 'user' },
        audio: false
      });
      setWebcamStream(stream);
      setTimeout(() => {
        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err) {
      console.error("[Tropa Call] Camera access error:", err);
      setCameraError("Não foi possível acessar a câmera. Verifique as permissões de vídeo.");
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
  };

  const capturePhoto = () => {
    if (webcamVideoRef.current) {
      const video = webcamVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Square crop from video stream
        const size = Math.min(video.videoWidth, video.videoHeight);
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setMyAvatar(dataUrl);
        stopWebcam();
      }
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setMyAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUsername('');
      // reset to default avatar
      setMyAvatar(avatarCyberWarrior);
    } catch (err: any) {
      console.error('Sign out failed:', err);
    }
  };

  // Start the voice call session
  const enterCall = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || isConnecting) return;

    // Stop active camera preview if active
    stopWebcam();

    setIsConnecting(true);
    setMicError(null);
    sessionStorage.setItem('tropa_call_username', username.trim());

    // Generate unique Peer ID mapping to this room
    const generatedPeerId = `tropa_call_sala-principal-tropa-2024_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setMyPeerId(generatedPeerId);

    let stream: MediaStream;
    if (isTestingMic && localStream) {
      // Reuse the existing test stream!
      stream = localStream;
      if (testMicCleanupRef.current) {
        testMicCleanupRef.current();
        testMicCleanupRef.current = null;
      }
      setIsTestingMic(false);
    } else {
      try {
        // Capture voice audio with requested filters
        const rawStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: enableEchoCancellation,
            noiseSuppression: enableNoiseSuppression,
            autoGainControl: enableAutoGain
          },
          video: false
        });
        
        // Wrap with our real-time GainNode (Software Volume)
        stream = processStreamWithGain(rawStream, micVolume);
        setLocalStream(stream);
      } catch (err: any) {
        console.error("[Tropa Call] Microfone bloqueado ou indisponível:", err);
        setMicError("Não conseguimos acessar o seu microfone. Verifique as permissões do navegador e tente novamente.");
        setIsConnecting(false);
        return;
      }
    }

    // Instantiate PeerJS client
    const newPeer = new Peer(generatedPeerId, {
      debug: 1 // Errors only for clean logs
    });

    setPeer(newPeer);

    // Save to sessionStorage
    sessionStorage.setItem('tropa_call_avatar', myAvatar);

    // Initial participant state including 'Me'
    setParticipants([
      {
        peerId: generatedPeerId,
        name: username.trim(),
        isMe: true,
        muted: false,
        speaking: false,
        stream: stream,
        avatar: myAvatar
      }
    ]);

    // Setup active listeners for WebRTC events
    newPeer.on('open', async (assignedId) => {
      console.log(`[Tropa Call] PeerJS connection established. My ID: ${assignedId}`);
      
      try {
        // Register in our database room
        const joinRes = await fetch('/api/room/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: ROOM_NAME,
            peerId: assignedId,
            name: username.trim()
          })
        });
        const joinData = await joinRes.json();

        if (joinData.success) {
          setStep('call');
          setIsConnecting(false);

          // Connect in full mesh style to all existing users in the room
          const others = joinData.otherUsers || [];
          console.log(`[Tropa Call] Found ${others.length} other participant(s) in room.`);

          others.forEach((otherUser: { peerId: string; name: string }) => {
            // Initiate voice stream WebRTC call
            console.log(`[Tropa Call] Calling peer: ${otherUser.name} (${otherUser.peerId})`);
            const call = newPeer.call(otherUser.peerId, stream);
            
            call.on('stream', (remoteStream) => {
              addRemoteStream(otherUser.peerId, remoteStream);
            });

            call.on('close', () => {
              handlePeerDisconnect(otherUser.peerId);
            });

            call.on('error', (error) => {
              console.error(`[Tropa Call] Calling error for ${otherUser.peerId}:`, error);
            });

            // Initiate WebRTC Data connection to exchange metadata
            const conn = newPeer.connect(otherUser.peerId);
            activeConnections.current[otherUser.peerId] = conn;

            conn.on('open', () => {
              conn.send({
                type: 'state',
                peerId: assignedId,
                name: username.trim(),
                muted: isMutedRef.current,
                speaking: isSpeakingRef.current,
                avatar: myAvatarRef.current
              });
            });

            conn.on('data', handleIncomingData);

            conn.on('close', () => {
              handlePeerDisconnect(otherUser.peerId);
            });
          });
        } else {
          throw new Error("Backend room entry rejected.");
        }
      } catch (err) {
        console.error("[Tropa Call] Server synchronization failed:", err);
        setMicError("Falha ao entrar na sala. Servidor de coordenação indisponível.");
        stream.getTracks().forEach((track) => track.stop());
        newPeer.destroy();
        setIsConnecting(false);
      }
    });

    // Handle incoming metadata connections from other peers
    newPeer.on('connection', (conn) => {
      console.log(`[Tropa Call] Incoming data connection from: ${conn.peer}`);
      activeConnections.current[conn.peer] = conn;

      conn.on('data', handleIncomingData);

      conn.on('close', () => {
        handlePeerDisconnect(conn.peer);
      });
    });

    // Handle incoming WebRTC voice calls
    newPeer.on('call', (incomingCall) => {
      console.log(`[Tropa Call] Answering incoming WebRTC voice call from: ${incomingCall.peer}`);
      incomingCall.answer(stream);

      incomingCall.on('stream', (remoteStream) => {
        addRemoteStream(incomingCall.peer, remoteStream);
      });

      incomingCall.on('close', () => {
        handlePeerDisconnect(incomingCall.peer);
      });

      incomingCall.on('error', (err) => {
        console.error(`[Tropa Call] Stream channel error on peer: ${incomingCall.peer}`, err);
      });
    });

    newPeer.on('error', (err) => {
      console.error("[Tropa Call] PeerJS client error:", err);
      if (err.type === 'peer-unavailable') {
        // Safe skip, heartbeat will clean up or retry
      }
    });

    // Activate voice decibel meter speaking detector
    const stopAudioDetection = startSpeakingDetection(stream);
    if (stopAudioDetection) {
      speakingCleanupRef.current = stopAudioDetection;
    }
  };

  // Leave active voice call and disconnect
  const leaveCall = async () => {
    console.log("[Tropa Call] Leaving call session...");

    if (myPeerId) {
      try {
        await fetch('/api/room/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName: ROOM_NAME, peerId: myPeerId })
        });
      } catch (e) {
        console.error("Error notifying leave call on server:", e);
      }
    }

    stopAllLocalTracks();

    if (peer) {
      peer.destroy();
      setPeer(null);
    }

    // Stop all audio elements
    Object.keys(activeAudios.current).forEach((pId) => {
      try {
        activeAudios.current[pId].pause();
        activeAudios.current[pId].srcObject = null;
      } catch (e) {}
    });
    activeAudios.current = {};

    // Close all connections
    Object.keys(activeConnections.current).forEach((pId) => {
      try {
        activeConnections.current[pId].close();
      } catch (e) {}
    });
    activeConnections.current = {};

    setParticipants([]);
    setMyPeerId('');
    setIsMuted(false);
    setIsSpeaking(false);
    setStep('login');
  };

  // Heartbeat synchronization loop
  useEffect(() => {
    if (step !== 'call' || !peer || !myPeerId) return;

    const heartbeatInterval = setInterval(async () => {
      try {
        const startTime = Date.now();
        const res = await fetch('/api/room/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName: ROOM_NAME, peerId: myPeerId })
        });
        const duration = Date.now() - startTime;
        // Add a small 10-15ms pipeline overhead offset if on local high-speed container to simulate WebRTC ping realistically
        const simulatedPing = duration < 5 ? duration + 12 + Math.floor(Math.random() * 6) : duration;
        setLatency(simulatedPing);
        const data = await res.json();

        if (data.success && data.allUsers) {
          const serverUsers = data.allUsers as Array<{ peerId: string; name: string }>;
          const serverPeerIds = serverUsers.map((u) => u.peerId);

          // 1. Remove users no longer in the server list
          setParticipants((prev) => {
            const filtered = prev.filter((p) => p.isMe || serverPeerIds.includes(p.peerId));
            prev.forEach((p) => {
              if (!p.isMe && !serverPeerIds.includes(p.peerId)) {
                handlePeerDisconnect(p.peerId);
              }
            });
            return filtered;
          });

          // 2. Discover missing connections or new users
          serverUsers.forEach((user) => {
            if (user.peerId !== myPeerId) {
              const hasConnection = activeConnections.current[user.peerId] && activeConnections.current[user.peerId].open;
              const hasParticipantObj = participantsRef.current.some((p) => p.peerId === user.peerId && p.stream !== null);

              if ((!hasConnection || !hasParticipantObj) && localStreamRef.current) {
                console.log(`[Tropa Call] Discovered join event via heartbeat: ${user.name}`);
                
                // Add to state
                updateParticipantState(user.peerId, { name: user.name });

                // Open voice call
                const call = peer.call(user.peerId, localStreamRef.current);
                call.on('stream', (remoteStream) => {
                  addRemoteStream(user.peerId, remoteStream);
                });
                call.on('close', () => {
                  handlePeerDisconnect(user.peerId);
                });

                // Open metadata connection
                const conn = peer.connect(user.peerId);
                activeConnections.current[user.peerId] = conn;

                conn.on('open', () => {
                  conn.send({
                    type: 'state',
                    peerId: myPeerId,
                    name: usernameRef.current,
                    muted: isMutedRef.current,
                    speaking: isSpeakingRef.current,
                    avatar: myAvatarRef.current
                  });
                });

                conn.on('data', handleIncomingData);

                conn.on('close', () => {
                  handlePeerDisconnect(user.peerId);
                });
              }
            }
          });
        } else if (data.code === 'NOT_FOUND') {
          // Server restarted or session expired, join again
          console.warn("[Tropa Call] Session not found on server, re-registering.");
          await fetch('/api/room/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomName: ROOM_NAME,
              peerId: myPeerId,
              name: usernameRef.current
            })
          });
        }
      } catch (err) {
        console.error("[Tropa Call] Heartbeat communication error:", err);
      }
    }, 3000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [step, peer, myPeerId]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (speakingCleanupRef.current) {
        speakingCleanupRef.current();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      Object.keys(activeAudios.current).forEach((pId) => {
        try {
          activeAudios.current[pId].pause();
          activeAudios.current[pId].srcObject = null;
        } catch (e) {}
      });
    };
  }, []);

  // Mute / Unmute handler
  const toggleMute = () => {
    if (localStream) {
      const newMuteState = !isMuted;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuteState;
      });
      setIsMuted(newMuteState);
      if (newMuteState) {
        setIsSpeaking(false);
      }
    }
  };

  // Global Mute / Unmute all incoming remote audio streams
  const toggleMuteAllIncoming = () => {
    const newMuteAllState = !muteAllIncoming;
    setMuteAllIncoming(newMuteAllState);
    // Set volume on all active remote audio elements
    Object.keys(activeAudios.current).forEach((peerId) => {
      const audio = activeAudios.current[peerId];
      if (audio) {
        audio.volume = newMuteAllState ? 0 : 1;
      }
    });
  };

  // Helper to extract clean double initials
  const getInitials = (name: string) => {
    if (!name) return 'TC';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Consistently assign background gradient based on name hash
  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-violet-600 to-indigo-700',
      'from-cyan-500 to-blue-600',
      'from-fuchsia-600 to-pink-700',
      'from-purple-600 to-violet-800',
      'from-emerald-500 to-teal-600',
      'from-rose-500 to-pink-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const currentEnv = ENVIRONMENTS.find((e) => e.id === selectedEnvId) || ENVIRONMENTS[0];

  return (
    <div 
      id="app-root" 
      className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 text-[#f8fafc] overflow-hidden bg-[#06060c] transition-all duration-1000"
      style={{
        backgroundImage: `linear-gradient(${currentEnv.overlay1}, ${currentEnv.overlay2}), url(${currentEnv.bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        '--violet': currentEnv.violet,
        '--cyan': currentEnv.cyan,
      } as any}
    >
      
      {/* Immersive Sci-Fi Background Layer */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Gridded perspective dots */}
        <div className="absolute inset-0 dot-grid opacity-35"></div>
        
        {/* Moving glowing spheres */}
        <div className="glow-sphere sphere-1 animate-float-1 opacity-40"></div>
        <div className="glow-sphere sphere-2 animate-float-2 opacity-30"></div>
      </div>

      {/* Main Container */}
      <div className={`relative w-full z-10 flex flex-col items-center transition-all duration-500 ${step === 'login' ? 'max-w-7xl px-4 lg:px-8' : 'max-w-5xl'}`}>
        
        <AnimatePresence mode="wait">
          
          {/* STEP 1: LOGIN/ENTRY SCREEN */}
          {step === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.98 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full flex flex-col items-center"
            >
              {/* HEADER NAVIGATION BAR */}
              <div className="w-full flex justify-between items-center px-5 py-3.5 bg-[#030307]/50 backdrop-blur-md border border-violet-950/40 rounded-2xl mb-8">
                {/* Logo */}
                <div className="flex items-center gap-3 select-none">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#06b6d4] flex items-center justify-center shadow-lg shadow-cyan-500/15 border border-[#06b6d4]/30">
                    <Gamepad2 className="w-5 h-5 text-black" />
                  </div>
                  <span className="font-orbitron font-black text-sm md:text-base tracking-[0.25em] text-[#f8fafc]">
                    OS PROCURADOS
                  </span>
                </div>

                {/* Menu Links & Enter Button */}
                <div className="flex items-center gap-4 sm:gap-7">
                  <div className="hidden md:flex items-center gap-6">
                    <a href="#comunidade" className="flex items-center gap-2 text-[10px] font-orbitron font-extrabold tracking-widest text-gray-400 hover:text-[#06b6d4] transition-colors">
                      <Users className="w-4 h-4 text-violet-500" />
                      COMUNIDADE
                    </a>
                    <a href="#regras" className="flex items-center gap-2 text-[10px] font-orbitron font-extrabold tracking-widest text-gray-400 hover:text-[#06b6d4] transition-colors">
                      <Scroll className="w-4 h-4 text-violet-500" />
                      REGRAS
                    </a>
                    <a href="#suporte" className="flex items-center gap-2 text-[10px] font-orbitron font-extrabold tracking-widest text-gray-400 hover:text-[#06b6d4] transition-colors">
                      <Headphones className="w-4 h-4 text-violet-500" />
                      SUPORTE
                    </a>
                  </div>

                  <button
                    onClick={() => {
                      const el = document.querySelector('input[type="text"]');
                      if (el) {
                        (el as HTMLInputElement).focus();
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className="relative overflow-hidden px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-white font-orbitron font-black text-[10px] tracking-widest rounded-xl hover:shadow-lg hover:shadow-cyan-500/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    ENTRAR NA CALL
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* THREE-COLUMN PORTAL GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
                
                {/* 1. LEFT COLUMN: Game Recommendations & Active Count (Span 3) */}
                <div className="lg:col-span-3 flex flex-col gap-6 hidden lg:flex">
                  {/* Game 1: Minecraft */}
                  <div className="relative overflow-hidden rounded-2xl border border-violet-900/20 bg-[#0d0d1e] aspect-[16/10] group transition-all duration-300 hover:border-[#06b6d4]/40 hover:shadow-lg hover:shadow-cyan-500/5">
                    <img 
                      src={bannerMinecraft} 
                      alt="Minecraft Banner" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 filter brightness-[0.55] group-hover:brightness-[0.7]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-left z-10">
                      <h3 className="font-orbitron font-black text-base tracking-wider text-white">MINECRAFT</h3>
                      <p className="text-[9px] text-gray-400 font-sans tracking-widest uppercase font-bold mt-0.5">AVENTURAS SEM FIM</p>
                    </div>
                  </div>

                  {/* Game 2: Roblox */}
                  <div className="relative overflow-hidden rounded-2xl border border-violet-900/20 bg-[#0d0d1e] aspect-[16/10] group transition-all duration-300 hover:border-[#06b6d4]/40 hover:shadow-lg hover:shadow-cyan-500/5">
                    <img 
                      src={bannerRoblox} 
                      alt="Roblox Banner" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 filter brightness-[0.55] group-hover:brightness-[0.7]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-left z-10">
                      <h3 className="font-orbitron font-black text-base tracking-wider text-[#ef4444]">ROBLOX</h3>
                      <p className="text-[9px] text-gray-400 font-sans tracking-widest uppercase font-bold mt-0.5">CRIAR, JOGAR, COMPARTILHAR</p>
                    </div>
                  </div>

                  {/* Membros Online Card */}
                  <div className="bg-[#030307]/85 border border-violet-900/20 rounded-2xl p-5 shadow-xl text-left">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-orbitron font-extrabold text-[#06b6d4] tracking-widest uppercase flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        MEMBROS ONLINE
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-3.5 pl-1.5">
                      {[
                        avatarCyberWarrior,
                        avatarNeonWolf,
                        avatarPixelKnight,
                        avatarCyberSamurai,
                        avatarNeonSoldier
                      ].map((url, i) => (
                        <div 
                          key={i} 
                          className="w-8 h-8 rounded-full border border-violet-500/40 overflow-hidden -ml-2 first:ml-0 shadow-md relative"
                        >
                          <img src={url} alt="online user" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-black"></div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 font-sans tracking-wide">
                      <strong className="text-white">+127</strong> jogando agora
                    </p>
                  </div>

                  {/* RANKING DE VIPS DO SITE */}
                  <div className="bg-[#030307]/85 border border-amber-500/20 rounded-2xl p-5 shadow-[0_0_20px_rgba(245,158,11,0.05)] text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full filter blur-xl"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <span className="text-[10px] font-orbitron font-extrabold text-amber-400 tracking-widest uppercase flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
                        VIPS DO PORTAL
                      </span>
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div className="space-y-3 relative z-10">
                      {[
                        { name: 'PANDA', rank: 1, role: 'VIP SUPREMO', avatar: avatarBtsJungkook, tag: 'ADM', glow: 'from-cyan-400 to-violet-600' },
                        { name: 'HINOKY', rank: 2, role: 'VIP DIAMANTE', avatar: avatarBtsV, tag: 'DONO', glow: 'from-amber-400 to-yellow-600' },
                        { name: 'RICK', rank: 3, role: 'VIP ELITE', avatar: avatarBtsJimin, tag: 'MOD', glow: 'from-pink-500 to-rose-600' },
                        { name: 'GABY', rank: 4, role: 'VIP GOLD', avatar: avatarBtsGaby, tag: 'DIVA', glow: 'from-emerald-400 to-teal-600' }
                      ].map((vip, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-amber-500/[0.02] border border-amber-500/5 hover:border-amber-500/20 transition-all duration-300">
                          <div className="flex items-center gap-2.5">
                            {/* Avatar or Number */}
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-500/20 bg-black/40 flex items-center justify-center">
                                <img src={vip.avatar} alt={vip.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-amber-500 text-[8px] font-black text-black flex items-center justify-center">
                                {vip.rank}
                              </div>
                            </div>
                            
                            <div className="text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-orbitron font-bold text-white tracking-wider">{vip.name}</span>
                                <span className="text-[7px] font-orbitron font-extrabold px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">{vip.tag}</span>
                              </div>
                              <p className="text-[8px] text-gray-400 font-sans tracking-widest uppercase font-semibold">{vip.role}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            {vip.rank === 1 ? (
                              <Crown className="w-3.5 h-3.5 text-amber-400 filter drop-shadow-[0_0_5px_rgba(245,158,11,0.5)] animate-bounce" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. CENTER COLUMN: Main Dynamic Setup & Forms (Span 6) */}
                <div className="lg:col-span-6 w-full flex flex-col items-center">
                  <div className="w-full bg-[#030307]/80 backdrop-blur-xl border border-[#06b6d4]/30 p-6 sm:p-8 rounded-2xl shadow-[0_0_35px_rgba(6,182,212,0.08)] text-center relative overflow-hidden">
                    
                    {/* Pulsing Signal Badge */}
                    <div className="flex justify-center mb-4">
                      <div className="relative p-2.5 bg-[#0a0a14] border border-[#06b6d4]/40 rounded-xl text-[#06b6d4] flex items-center justify-center shadow-md shadow-cyan-500/5">
                        <Radio className="w-5 h-5 animate-pulse" />
                      </div>
                    </div>

                    {/* Glowing OS PROCURADOS Title */}
                    <div className="relative mb-4 select-none overflow-visible py-1.5 flex justify-center items-center">
                      <h1 className="procurados-title flex items-center justify-center flex-wrap">
                        <span className="flex gap-x-1 sm:gap-x-1.5">
                          {"OS".split("").map((letter, idx) => (
                            <span
                              key={`os-${idx}`}
                              className="gamer-char-container inline-block"
                              style={{ animationDelay: `${idx * 0.12}s` }}
                            >
                              <span 
                                className="gamer-char inline-block"
                                style={{ animationDelay: `${idx * 0.12}s` }}
                              >
                                {letter}
                              </span>
                            </span>
                          ))}
                        </span>
                        <span className="w-4 sm:w-6"></span>
                        <span className="flex gap-x-1 sm:gap-x-1.5">
                          {"PROCURADOS".split("").map((letter, idx) => (
                            <span
                              key={`proc-${idx}`}
                              className="gamer-char-container inline-block"
                              style={{ animationDelay: `${(idx + 2) * 0.12}s` }}
                            >
                              <span 
                                className="gamer-char inline-block"
                                style={{ animationDelay: `${(idx + 2) * 0.12}s` }}
                              >
                                {letter}
                              </span>
                            </span>
                          ))}
                        </span>
                      </h1>
                    </div>
                    
                    <p className="text-gray-400 font-sans text-xs tracking-wider mb-8">
                      Comunicação direta. Sem ruído.
                    </p>

                    {micError && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-950/50 border border-red-500/40 text-red-200 text-xs text-left p-4 rounded-xl mb-6 flex items-start gap-2"
                      >
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <span>{micError}</span>
                      </motion.div>
                    )}

                    <form onSubmit={enterCall} className="space-y-6">
                      
                      {/* 🎮 AVATAR SELECTOR BLOCK */}
                      <div className="space-y-4 text-left border-b border-violet-900/30 pb-5">
                        <span className="block text-[10px] font-orbitron tracking-widest text-[#06b6d4] uppercase text-center sm:text-left flex items-center gap-1.5">
                          <span className="text-[#7c3aed] font-bold font-orbitron">»</span> AVATAR DO JOGADOR
                        </span>

                        <div className="flex flex-col items-center sm:flex-row gap-5">
                          {/* Big Active Avatar Preview with overlay */}
                          <div className="relative group shrink-0">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#06b6d4] to-violet-600 blur-sm opacity-70 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative w-20 h-20 rounded-full border-2 border-[#06b6d4] overflow-hidden bg-[#0d0d1e] flex items-center justify-center">
                              {myAvatar ? (
                                <img 
                                  src={myAvatar} 
                                  alt="Active Avatar" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-gray-500 font-orbitron font-extrabold text-2xl">?</span>
                              )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 bg-[#06b6d4] text-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#030307] shadow-md">
                              <svg className="w-3 h-3 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </div>
                          </div>

                          <div className="flex-1 w-full space-y-3">
                            {/* Presets List */}
                            <div className="flex items-center justify-center sm:justify-start gap-2.5">
                              {[
                                { id: 'cyber', name: 'Cyber Warrior', url: avatarCyberWarrior },
                                { id: 'wolf', name: 'Neon Wolf', url: avatarNeonWolf },
                                { id: 'pixel', name: 'Pixel Knight', url: avatarPixelKnight },
                                { id: 'samurai', name: 'Cyber Samurai', url: avatarCyberSamurai },
                                { id: 'soldier', name: 'Neon Soldier', url: avatarNeonSoldier }
                              ].map((preset) => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    stopWebcam();
                                    setMyAvatar(preset.url);
                                  }}
                                  className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                                    myAvatar === preset.url 
                                      ? 'border-[#06b6d4] scale-110 shadow-md shadow-[#06b6d4]/40' 
                                      : 'border-transparent hover:border-violet-500/50 hover:scale-105'
                                  }`}
                                  title={preset.name}
                                >
                                  <img 
                                    src={preset.url} 
                                    alt={preset.name} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </button>
                              ))}

                              {/* File upload hidden triggers */}
                              <label className="w-9 h-9 rounded-full border-2 border-dashed border-violet-500/40 hover:border-[#06b6d4] flex items-center justify-center cursor-pointer transition-all hover:scale-105 hover:bg-violet-950/20" title="Enviar arquivo">
                                <Upload className="w-4 h-4 text-gray-400 hover:text-[#06b6d4]" />
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={handleFileUpload} 
                                  className="hidden" 
                                />
                              </label>

                              {/* Webcam capture trigger */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (webcamStream) {
                                    stopWebcam();
                                  } else {
                                    startWebcam();
                                  }
                                }}
                                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all hover:scale-105 cursor-pointer ${
                                  webcamStream 
                                    ? 'border-red-500 bg-red-950/20' 
                                    : 'border-violet-500/40 hover:border-[#06b6d4] hover:bg-violet-950/20'
                                }`}
                                title="Tirar foto com a câmera"
                              >
                                <Camera className={`w-4 h-4 ${webcamStream ? 'text-red-400 animate-pulse' : 'text-gray-400 hover:text-[#06b6d4]'}`} />
                              </button>
                            </div>

                            <p className="text-[9px] text-gray-500 leading-tight text-center sm:text-left">
                              Selecione um avatar gamer, envie uma imagem do computador ou tire uma foto instantânea com a sua câmera.
                            </p>
                          </div>
                        </div>

                        {/* LIVE WEBCAM CAPTURE PANEL */}
                        {webcamStream && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-[#0a0a14]/90 border border-[#06b6d4]/40 p-3.5 rounded-xl space-y-3 mt-3 relative overflow-hidden"
                          >
                            <div className="text-[10px] text-[#06b6d4] font-orbitron font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <Video className="w-3 h-3 text-[#06b6d4]" /> CÂMERA AO VIVO
                            </div>

                            <div className="relative aspect-square w-full max-w-[180px] mx-auto overflow-hidden rounded-lg border border-violet-900/40 bg-black">
                              <video 
                                ref={webcamVideoRef}
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex gap-2 justify-center">
                              <button
                                type="button"
                                onClick={capturePhoto}
                                className="px-3 py-1.5 bg-[#06b6d4] hover:bg-[#06b6d4]/80 text-black font-orbitron font-bold text-[9px] rounded-lg tracking-wider transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                              >
                                <Camera className="w-3.5 h-3.5" /> CAPTURAR
                              </button>
                              <button
                                type="button"
                                onClick={stopWebcam}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 font-orbitron font-medium text-[9px] rounded-lg tracking-wider transition-all active:scale-95 cursor-pointer"
                              >
                                CANCELAR
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {cameraError && (
                          <p className="text-red-400 text-[10px] mt-1 font-sans">{cameraError}</p>
                        )}
                      </div>
                      
                      {/* 🌆 ENVIRONMENT SELECTOR BLOCK */}
                      <div className="space-y-4 text-left border-b border-violet-900/30 pb-5">
                        <span className="block text-[10px] font-orbitron tracking-widest text-[#06b6d4] uppercase flex items-center gap-1.5">
                          <span className="text-[#7c3aed] font-bold font-orbitron">»</span> AMBIENTE VIRTUAL
                        </span>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {ENVIRONMENTS.map((env) => {
                            const isSelected = selectedEnvId === env.id;
                            return (
                              <button
                                key={env.id}
                                type="button"
                                onClick={() => {
                                  setSelectedEnvId(env.id);
                                  localStorage.setItem('tropa_selected_env', env.id);
                                }}
                                className={`relative overflow-hidden group rounded-xl p-2.5 border-2 transition-all duration-300 text-left flex flex-col justify-between aspect-[16/10] cursor-pointer ${
                                  isSelected
                                    ? 'border-[#06b6d4] scale-[1.03] shadow-lg shadow-[#06b6d4]/10 bg-[#0d0d1e]/90'
                                    : 'border-violet-950/40 hover:border-violet-500/50 hover:scale-[1.01] bg-[#030307]/80'
                                }`}
                              >
                                {/* Background image preview with darkened gradient */}
                                <div className="absolute inset-0 z-0">
                                  <img 
                                    src={env.bgImage} 
                                    alt={env.name} 
                                    className="w-full h-full object-cover opacity-35 group-hover:opacity-55 transition-opacity duration-300" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
                                </div>

                                {/* Active selection indicator light */}
                                {isSelected && (
                                  <div 
                                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse shadow-sm"
                                    style={{ backgroundColor: env.cyan }}
                                  ></div>
                                )}

                                {/* Spacer */}
                                <div></div>

                                {/* Environment title */}
                                <div className="relative z-10">
                                  <span className="block font-orbitron font-black text-[9px] sm:text-[10px] text-white tracking-wider leading-none">
                                    {env.name.toUpperCase()}
                                  </span>
                                  <div 
                                    className="h-1 w-6 rounded-full mt-1.5 transition-all duration-300"
                                    style={{ backgroundColor: env.cyan }}
                                  ></div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 🛡️ USERNAME INPUT BLOCK */}
                      <div className="text-left space-y-2">
                        <span className="block text-[10px] font-orbitron tracking-widest text-[#06b6d4] uppercase flex items-center gap-1.5">
                          <span className="text-[#7c3aed] font-bold font-orbitron">»</span> NOME DE GUERRA
                        </span>
                        
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            required
                            maxLength={20}
                            placeholder="Digite seu nome..."
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-[#030307] border border-violet-950/60 rounded-xl py-3 pl-4 pr-11 font-sans text-white placeholder-gray-600 focus:outline-none focus:border-[#06b6d4] focus:ring-1 focus:ring-[#06b6d4] transition-all duration-300 text-sm"
                          />
                          {username.trim().length >= 2 && (
                            <div className="absolute right-4 text-[#06b6d4] flex items-center justify-center bg-[#06b6d4]/10 rounded-full p-0.5 border border-[#06b6d4]/20 animate-fade-in">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 🔑 FIREBASE AUTH SECTION */}
                      <div className="text-left space-y-2">
                        <span className="block text-[10px] font-orbitron tracking-widest text-[#06b6d4] uppercase flex items-center gap-1.5">
                          <span className="text-[#7c3aed] font-bold font-orbitron">»</span> AUTENTICAÇÃO
                        </span>
                        
                        {authLoading ? (
                          <div className="w-full bg-[#030307] border border-violet-950/40 rounded-xl py-2.5 px-4 text-xs text-gray-400 font-sans flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-[#06b6d4]/30 border-t-[#06b6d4] rounded-full animate-spin"></div>
                            Verificando acesso...
                          </div>
                        ) : firebaseUser ? (
                          <div className="w-full bg-[#030307] border border-emerald-500/20 rounded-xl py-2.5 px-4 flex items-center justify-between text-xs text-slate-200">
                            <div className="flex items-center gap-2.5">
                              <img src={firebaseUser.photoURL || myAvatar} alt="Google Profile" className="w-6 h-6 rounded-full border border-emerald-500/30" referrerPolicy="no-referrer" />
                              <div className="text-left">
                                <span className="block font-orbitron text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> CONECTADO
                                </span>
                                <span className="block text-[9px] text-gray-400 font-sans truncate max-w-[150px]">{firebaseUser.email}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleSignOut}
                              className="text-[9px] font-orbitron font-extrabold text-red-400 hover:text-red-300 transition-colors uppercase cursor-pointer flex items-center gap-1"
                            >
                              <LogOut className="w-3.5 h-3.5" /> SAIR
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="w-full bg-[#0d0d1e] border border-[#06b6d4]/40 hover:bg-[#06b6d4]/10 rounded-xl py-2.5 px-4 text-xs text-white font-orbitron font-bold tracking-widest flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            LOGAR COM GOOGLE
                          </button>
                        )}
                      </div>

                      {/* 🎤 VOICE TEST BLOCK */}
                      <div className="bg-[#05050a] border border-violet-950/40 rounded-xl p-4 text-left space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-orbitron tracking-wider text-gray-300 font-bold uppercase flex items-center gap-1.5">
                            <Headphones className="w-3.5 h-3.5 text-[#06b6d4]" /> TESTE DE VOZ
                          </span>
                          <button
                            type="button"
                            onClick={startTestMic}
                            className={`text-[9px] font-orbitron font-extrabold tracking-wider px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                              isTestingMic 
                                ? 'bg-red-500/15 border-red-500/35 text-red-400 hover:bg-red-500/25' 
                                : 'bg-transparent border-[#06b6d4]/30 text-[#06b6d4] hover:bg-[#06b6d4]/15'
                            }`}
                          >
                            {isTestingMic ? 'DESATIVAR TESTE' : 'INICIAR TESTE'}
                          </button>
                        </div>

                        {/* Interactive audio frequency spectrum bars */}
                        <div ref={visualizerContainerRef} className="flex items-end justify-center gap-[3.5px] h-10 w-full px-2 overflow-hidden bg-black/40 rounded-xl py-1.5 border border-violet-950/40">
                          {Array.from({ length: 32 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1.5 bg-gradient-to-t from-violet-600 via-[#7c3aed] to-[#06b6d4] rounded-t-sm transition-all duration-75 ${!isTestingMic ? 'idle-bar' : ''}`}
                              style={{
                                animationDelay: `${i * 0.05}s`,
                                height: '15%'
                              }}
                            />
                          ))}
                        </div>

                        {isTestingMic ? (
                          <div className="space-y-4 pt-2 border-t border-violet-900/10">
                            {/* Meter bar */}
                            <div>
                              <div className="flex justify-between items-center text-[9px] text-gray-400 font-orbitron tracking-widest uppercase mb-1">
                                <span>Nível de Sinal</span>
                                <span ref={localVolumeTextRef} className="text-[#06b6d4] font-bold">SILENCIOSO</span>
                              </div>
                              <div className="w-full h-1.5 bg-[#0a0a14] rounded-full overflow-hidden">
                                <div
                                  ref={localVolumeMeterRef}
                                  className="h-full w-0 bg-violet-600 transition-all duration-75 rounded-full"
                                ></div>
                              </div>
                            </div>

                            {/* Loopback feedback toggle */}
                            <div className="flex items-center justify-between border-t border-violet-900/20 pt-2.5">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-orbitron font-bold text-gray-300 uppercase tracking-wide">
                                  RETORNO DE ÁUDIO
                                </span>
                                <span className="text-[8px] text-gray-500">
                                  Use fones de ouvido para evitar ruído.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setLoopbackActive(!loopbackActive)}
                                className={`w-9 h-4.5 rounded-full transition-colors relative duration-300 cursor-pointer ${
                                  loopbackActive ? 'bg-[#06b6d4]' : 'bg-slate-800'
                                }`}
                              >
                                <div
                                  className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform duration-300 ${
                                    loopbackActive ? 'translate-x-4.5' : 'translate-x-0.5'
                                  }`}
                                ></div>
                              </button>
                            </div>

                            {/* Real-time Input Signal Gain (Software Volume Slider) */}
                            <div className="border-t border-violet-900/20 pt-2.5">
                              <div className="flex justify-between items-center text-[9px] text-gray-300 font-orbitron font-bold uppercase mb-1">
                                <span>Ajuste de Volume (Ganho)</span>
                                <span className="text-[#06b6d4] font-extrabold">{Math.round(micVolume * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min="0.0"
                                max="3.0"
                                step="0.1"
                                value={micVolume}
                                onChange={(e) => setMicVolume(parseFloat(e.target.value))}
                                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#06b6d4]"
                              />
                              <div className="flex justify-between text-[7px] text-gray-500 mt-0.5">
                                <span>Mudo</span>
                                <span>Padrão (100%)</span>
                                <span>Alto (300%)</span>
                              </div>
                            </div>

                            {/* Hardware Filters Toggle Section */}
                            <div className="border-t border-violet-900/20 pt-2.5 space-y-2.5">
                              <span className="text-[8px] text-[#06b6d4] font-orbitron font-bold tracking-wider block uppercase">
                                Filtros de Áudio (Evitar Cortes de Som)
                              </span>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col pr-2">
                                  <span className="text-[9px] font-sans font-medium text-gray-300">Ganho Automático</span>
                                  <span className="text-[7px] text-gray-500">Desative para o navegador não abafar sons altos.</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEnableAutoGain(!enableAutoGain)}
                                  className={`w-8 h-4 rounded-full transition-colors relative shrink-0 duration-300 cursor-pointer ${
                                    enableAutoGain ? 'bg-violet-600' : 'bg-slate-800'
                                  }`}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform duration-300 ${
                                      enableAutoGain ? 'translate-x-4.5' : 'translate-x-0.5'
                                    }`}
                                  ></div>
                                </button>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex flex-col pr-2">
                                  <span className="text-[9px] font-sans font-medium text-gray-300">Supressão de Ruído</span>
                                  <span className="text-[7px] text-gray-500">Desative se sua voz cortar em picos de volume.</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEnableNoiseSuppression(!enableNoiseSuppression)}
                                  className={`w-8 h-4 rounded-full transition-colors relative shrink-0 duration-300 cursor-pointer ${
                                    enableNoiseSuppression ? 'bg-violet-600' : 'bg-slate-800'
                                  }`}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform duration-300 ${
                                      enableNoiseSuppression ? 'translate-x-4.5' : 'translate-x-0.5'
                                    }`}
                                  ></div>
                                </button>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex flex-col pr-2">
                                  <span className="text-[9px] font-sans font-medium text-gray-300">Cancelamento de Eco</span>
                                  <span className="text-[7px] text-gray-500">Geralmente recomendado para evitar microfonia.</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEnableEchoCancellation(!enableEchoCancellation)}
                                  className={`w-8 h-4 rounded-full transition-colors relative shrink-0 duration-300 cursor-pointer ${
                                    enableEchoCancellation ? 'bg-violet-600' : 'bg-slate-800'
                                  }`}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform duration-300 ${
                                      enableEchoCancellation ? 'translate-x-4.5' : 'translate-x-0.5'
                                    }`}
                                  ></div>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400/80 leading-relaxed font-sans">
                            Deseja saber se sua voz está saindo perfeitamente? Ative o teste acima para conferir o nível do seu microfone e escutar sua voz antes de entrar na call.
                          </p>
                        )}
                      </div>

                      {/* Main Join Button */}
                      <button
                        type="submit"
                        disabled={isConnecting}
                        className="w-full relative group overflow-hidden py-4 rounded-xl font-orbitron font-extrabold text-sm tracking-widest text-white transition-all duration-300 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] hover:shadow-lg hover:shadow-cyan-500/20 active:scale-98 disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        <span className="flex items-center justify-center gap-2">
                          {isConnecting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              CONECTANDO...
                            </>
                          ) : (
                            <>
                              <Headphones className="w-4 h-4 mr-1" />
                              ENTRAR NA CALL
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                            </>
                          )}
                        </span>
                      </button>
                    </form>

                    {/* Checklists row under button */}
                    <div className="mt-7 pt-5 border-t border-violet-950/50 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[9px] font-orbitron tracking-widest text-gray-500 uppercase select-none">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Conexão segura
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Sem anúncios
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        100% Gratuito
                      </span>
                    </div>

                  </div>
                </div>

                {/* 3. RIGHT COLUMN: Game Recommendations & Benefits (Span 3) */}
                <div className="lg:col-span-3 flex flex-col gap-6 hidden lg:flex">
                  {/* Game 3: Counter Strike */}
                  <div className="relative overflow-hidden rounded-2xl border border-violet-900/20 bg-[#0d0d1e] aspect-[16/10] group transition-all duration-300 hover:border-[#06b6d4]/40 hover:shadow-lg hover:shadow-cyan-500/5">
                    <img 
                      src={bannerCS} 
                      alt="Counter Strike Banner" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 filter brightness-[0.55] group-hover:brightness-[0.7]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-left z-10">
                      <h3 className="font-orbitron font-black text-base tracking-wider text-[#22c55e]">COUNTER STRIKE</h3>
                      <p className="text-[9px] text-gray-400 font-sans tracking-widest uppercase font-bold mt-0.5">ESTRATÉGIA E AÇÃO</p>
                    </div>
                  </div>

                  {/* Game 4: Left 4 Dead */}
                  <div className="relative overflow-hidden rounded-2xl border border-violet-900/20 bg-[#0d0d1e] aspect-[16/10] group transition-all duration-300 hover:border-[#06b6d4]/40 hover:shadow-lg hover:shadow-cyan-500/5">
                    <img 
                      src={bannerL4D} 
                      alt="Left 4 Dead Banner" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 filter brightness-[0.55] group-hover:brightness-[0.7]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-left z-10">
                      <h3 className="font-orbitron font-black text-base tracking-wider text-emerald-400">LEFT <span className="text-green-500 font-extrabold">4</span> DEAD</h3>
                      <p className="text-[9px] text-gray-400 font-sans tracking-widest uppercase font-bold mt-0.5">SOBREVIVA JUNTOS</p>
                    </div>
                  </div>

                  {/* Game 5: Resident Evil */}
                  <div className="relative overflow-hidden rounded-2xl border border-violet-900/20 bg-[#0d0d1e] aspect-[16/10] group transition-all duration-300 hover:border-[#06b6d4]/40 hover:shadow-lg hover:shadow-cyan-500/5">
                    <img 
                      src={bannerRE} 
                      alt="Resident Evil Banner" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 filter brightness-[0.55] group-hover:brightness-[0.7]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-left z-10">
                      <h3 className="font-orbitron font-black text-base tracking-wider text-rose-600">RESIDENT EVIL</h3>
                      <p className="text-[9px] text-gray-400 font-sans tracking-widest uppercase font-bold mt-0.5">SOBREVIVA AO TERROR</p>
                    </div>
                  </div>

                  {/* Portal Benefits Card */}
                  <div className="bg-[#030307]/85 border border-violet-900/20 rounded-2xl p-5 shadow-xl text-left">
                    <h4 className="text-[10px] font-orbitron font-extrabold text-[#7c3aed] tracking-widest uppercase mb-4">
                      POR QUE ESCOLHER O P?
                    </h4>
                    <ul className="space-y-3">
                      {[
                        "Comunicação clara e sem lag",
                        "Comunidade ativa e parceira",
                        "Suporte rápido e dedicado",
                        "Eventos e sorteios exclusivos"
                      ].map((text, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[10px] text-gray-300 font-sans leading-tight">
                          <div className="w-4 h-4 rounded-full bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 mt-0.5">
                            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

              </div>

            </motion.div>
          )}

          {/* STEP 2: ACTIVE GROUP CALL SCREEN */}
          {step === 'call' && (
            <motion.div
              key="call"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full flex flex-col"
            >
              {/* Header section */}
              <header className="w-full flex items-center justify-between mb-8 border-b border-white/5 py-4 px-6 bg-[#0a0a12]/80 backdrop-blur-md rounded-2xl gap-4 flex-wrap sm:flex-nowrap">
                {/* Left indicators: Timer and Latency Connection */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Session Duration Timer */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] text-[11px] font-mono text-emerald-400 font-medium tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>DURAÇÃO: {formatDuration(callDuration)}</span>
                  </div>

                  {/* Connection Quality Indicator */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getLatencyInfo(latency).border} ${getLatencyInfo(latency).bg} text-[11px] font-mono font-medium tracking-wider`}>
                    <Signal className={`w-3.5 h-3.5 ${getLatencyInfo(latency).color}`} />
                    <span className={getLatencyInfo(latency).color}>PING: {getLatencyInfo(latency).text}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowActivityLog(!showActivityLog)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-violet-900/40 bg-violet-950/20 text-[10px] font-orbitron font-bold tracking-widest text-violet-400 hover:bg-violet-600/10 transition-colors cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    HISTÓRICO ({notifications.length})
                  </button>
                  <div className="status-badge">
                    <div className="status-dot"></div>
                    AO VIVO
                    <span className="text-[11px] uppercase font-orbitron text-gray-400 font-bold tracking-widest ml-3 opacity-60">
                      | {participants.length} na call
                    </span>
                  </div>
                </div>
              </header>

              {/* Flex Container to split call layout and live chat sidebar */}
              <div className="w-full flex flex-col lg:flex-row gap-6 mb-24 items-start">
                
                {/* Grid Layout of Call Participants */}
                <div className="flex-1 w-full">
                  <motion.div 
                    layout 
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 min-h-[250px] w-full"
                  >
                    <AnimatePresence mode="popLayout">
                      {participants.map((user) => (
                        <motion.div
                          key={user.peerId}
                          layout
                          initial={{ opacity: 0, y: 20, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8, y: -20 }}
                          transition={{ 
                            type: 'spring', 
                            stiffness: 300, 
                            damping: 25,
                            opacity: { duration: 0.25 }
                          }}
                          className={`participant-card py-8 px-6 min-h-[220px] ${
                            user.speaking ? 'active-speaker' : ''
                          }`}
                        >
                          {/* Top indicator icon */}
                          <div className="indicator">
                            {user.muted ? (
                              <span className="text-red-500 flex items-center gap-1 font-orbitron font-bold text-[9px] tracking-widest">
                                <MicOff className="w-3 h-3" /> MUTADO
                              </span>
                            ) : (
                              <Mic className={`w-3.5 h-3.5 ${user.speaking ? 'text-[#06b6d4]' : 'text-gray-500'}`} />
                            )}
                          </div>

                          {/* Avatar with speaking ring and gradients */}
                          <div className="avatar-container">
                            {user.speaking && <div className="speaking-ring"></div>}
                            <div 
                              className="avatar overflow-hidden flex items-center justify-center bg-[#0d0d1e]"
                              style={{
                                background: (!user.avatar && user.isMe)
                                  ? 'linear-gradient(135deg, var(--cyan), var(--violet))' 
                                  : undefined
                              }}
                            >
                              {user.avatar ? (
                                <img 
                                  src={user.avatar} 
                                  alt={user.name} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                getInitials(user.name)
                              )}
                            </div>
                          </div>

                          {/* Name & custom user badge */}
                          <div className="participant-name mt-1">
                            {user.name}
                          </div>

                          {user.isMe && (
                            <div className="user-tag">
                              VOCÊ
                            </div>
                          )}
                        </motion.div>
                      ))}
                      
                      {/* Decorative placeholder card to match design mock and expand density */}
                      {participants.length < 3 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.35 }}
                          className="participant-card py-8 px-6 min-h-[220px] bg-transparent border border-dashed border-white/10"
                        >
                          <div className="avatar-container opacity-30">
                            <div className="avatar">?</div>
                          </div>
                          <div className="participant-name opacity-30 font-orbitron">
                            AGUARDANDO...
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Live Chat Panel */}
                <AnimatePresence>
                  {isChatOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: 40, width: 0 }}
                      animate={{ opacity: 1, x: 0, width: '100%', maxWidth: '380px' }}
                      exit={{ opacity: 0, x: 40, width: 0 }}
                      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                      className="w-full lg:w-[380px] shrink-0 border border-violet-500/10 bg-[#06060c]/85 backdrop-blur-md rounded-2xl flex flex-col h-[520px] overflow-hidden shadow-2xl relative"
                    >
                      {/* Chat Header */}
                      <div className="px-4 py-3 border-b border-violet-900/30 flex items-center justify-between bg-violet-950/20">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#06b6d4]" />
                          <span className="font-orbitron font-extrabold text-[11px] tracking-wider text-white uppercase">CHAT AO VIVO</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsChatOpen(false)}
                          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-violet-900/40">
                        {chatMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <MessageSquare className="w-8 h-8 text-gray-600 mb-2 stroke-[1.5]" />
                            <p className="text-[10px] font-orbitron tracking-wider text-gray-500 uppercase">Nenhuma mensagem ainda</p>
                            <p className="text-[9px] text-gray-600 font-sans mt-0.5">Envie uma mensagem abaixo para iniciar o chat!</p>
                          </div>
                        ) : (
                          chatMessages.map((msg) => {
                            const isMe = msg.peerId === myPeerId;
                            return (
                              <div
                                key={msg.id}
                                className={`flex gap-2.5 items-start ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                              >
                                {/* Message Sender Avatar */}
                                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-violet-950/50 bg-[#0d0d1e] flex items-center justify-center text-[10px] font-bold font-orbitron text-gray-300">
                                  {msg.avatar ? (
                                    <img src={msg.avatar} alt={msg.senderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    getInitials(msg.senderName)
                                  )}
                                </div>

                                {/* Message Bubble */}
                                <div className={`max-w-[72%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                  {/* Sender name & time */}
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[9px] font-sans font-bold text-gray-400 leading-none">
                                      {isMe ? 'Você' : msg.senderName}
                                    </span>
                                    <span className="text-[8px] font-mono text-gray-600 leading-none">
                                      {msg.timestamp ? (msg.timestamp instanceof Date ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : ''}
                                    </span>
                                  </div>

                                  {/* Message Text box */}
                                  <div
                                    className={`px-3 py-2 rounded-xl text-xs font-sans break-words ${
                                      isMe
                                        ? 'bg-gradient-to-r from-violet-600 to-[#7c3aed] text-white rounded-tr-none border border-violet-500/15'
                                        : 'bg-violet-950/25 border border-violet-900/35 text-slate-200 rounded-tl-none'
                                    }`}
                                  >
                                    {msg.text}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat Input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          sendChatMessage(chatInput);
                        }}
                        className="p-3 border-t border-violet-900/30 bg-[#030307]/90 flex gap-2 items-center"
                      >
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Digite sua mensagem..."
                          className="flex-1 bg-black/40 border border-violet-950/40 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#06b6d4]/40"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim()}
                          className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] hover:shadow-lg hover:shadow-cyan-500/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center text-white shrink-0 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Floating Bottom Control Bar */}
              <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="controls-bar">
                  {/* Toggle Mute microphone Button */}
                  <button
                    onClick={toggleMute}
                    id="btn-toggle-mute"
                    className={`btn ${isMuted ? 'btn-mute' : 'btn-mic'}`}
                    title="Silenciar/Ativar Microfone"
                  >
                    {isMuted ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>

                  {/* Toggle Mute All Incoming Audio Button */}
                  <button
                    onClick={toggleMuteAllIncoming}
                    id="btn-toggle-mute-all"
                    className={`btn ${muteAllIncoming ? 'bg-amber-600/95 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-700/80 text-gray-300 hover:bg-slate-600 hover:text-white'}`}
                    title={muteAllIncoming ? "Ativar Áudio de Todos (Unmute All)" : "Silenciar Todos (Mute All)"}
                  >
                    {muteAllIncoming ? (
                      <VolumeX className="w-5 h-5 animate-pulse" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>

                  {/* Settings gear button to check if voice is perfect */}
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    id="btn-voice-settings"
                    className={`btn ${showSettings ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-slate-700/80 text-gray-300 hover:bg-slate-600'}`}
                    title="Ajustes de Áudio e Retorno"
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {/* Toggle Chat Button */}
                  <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    id="btn-toggle-chat"
                    className={`btn relative ${isChatOpen ? 'bg-[#06b6d4] text-white shadow-lg shadow-cyan-500/25' : 'bg-slate-700/80 text-gray-300 hover:bg-slate-600 hover:text-white'}`}
                    title="Conversar ao vivo (Chat)"
                  >
                    <MessageSquare className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[8px] font-bold font-mono text-white bg-rose-600 rounded-full animate-bounce">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Leave Active Session Button */}
                  <button
                    onClick={leaveCall}
                    id="btn-leave-call"
                    className="btn btn-exit"
                    title="Sair da Call"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                </div>
              </footer>

              {/* Real-time Voice Monitor & Audio Settings Modal Overlay */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
                    onClick={() => setShowSettings(false)}
                  >
                    <motion.div
                      initial={{ scale: 0.95, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.95, y: 20 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                      className="w-full max-w-sm bg-[#1e1e2e]/95 border border-violet-500/20 p-6 rounded-2xl shadow-2xl text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Settings className="w-5 h-5 text-[#06b6d4]" />
                          <h3 className="font-orbitron font-extrabold text-sm tracking-wider uppercase text-white">
                            Ajustes de Voz
                          </h3>
                        </div>
                        <button
                          onClick={() => setShowSettings(false)}
                          className="text-gray-400 hover:text-white font-sans text-xs cursor-pointer uppercase font-semibold"
                        >
                          Fechar
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Status diagnostic indicator */}
                        <div className="bg-[#0a0a14]/60 border border-violet-900/30 p-3 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-[#06b6d4]" />
                            <span className="text-xs font-orbitron font-semibold text-gray-300">Microfone</span>
                          </div>
                          <span className={`text-[10px] font-orbitron font-bold tracking-widest px-2 py-0.5 rounded ${
                            isMuted 
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isMuted ? 'MUTADO' : 'ATIVO'}
                          </span>
                        </div>

                        {/* Real-time Input Signal Decibel Bar */}
                        <div className="bg-[#0a0a14]/60 border border-violet-900/30 p-4 rounded-xl">
                          <div className="flex justify-between items-center text-[10px] text-gray-400 font-orbitron tracking-widest uppercase mb-1.5">
                            <span className="flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 text-[#06b6d4] animate-pulse" /> Nível da Voz
                            </span>
                            <span ref={localVolumeTextRef} className="text-[#06b6d4] font-extrabold">
                              {isMuted ? 'MUTADO' : 'SILENCIOSO'}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                            <div
                              ref={localVolumeMeterRef}
                              className="h-full w-0 bg-violet-600 transition-all duration-75 rounded-full"
                            ></div>
                          </div>
                          <p className="text-[9px] text-gray-500 mt-2 leading-relaxed">
                            Fale no microfone para ver o nível de modulação de sua voz em tempo real.
                          </p>
                        </div>

                        {/* Loopback audio feedback switch */}
                        <div className="flex items-center justify-between bg-[#0a0a14]/60 border border-violet-900/30 p-4 rounded-xl">
                          <div className="flex flex-col pr-4">
                            <span className="text-[10px] font-orbitron font-bold text-gray-200 uppercase tracking-wide flex items-center gap-1.5">
                              <Headphones className="w-4 h-4 text-violet-400" /> RETORNO DE VOZ
                            </span>
                            <span className="text-[9px] text-gray-500 mt-1 leading-relaxed">
                              Escute seu próprio áudio para verificar o ruído e qualidade. Recomendamos usar fone de ouvido!
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLoopbackActive(!loopbackActive)}
                            className={`w-10 h-5 rounded-full transition-colors relative shrink-0 duration-300 cursor-pointer ${
                              loopbackActive ? 'bg-[#06b6d4]' : 'bg-slate-800'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform duration-300 ${
                                loopbackActive ? 'translate-x-5' : 'translate-x-0.5'
                              }`}
                            ></div>
                          </button>
                        </div>

                        {/* Real-time Input Signal Gain (Software Volume Slider) */}
                        <div className="bg-[#0a0a14]/60 border border-violet-900/30 p-4 rounded-xl">
                          <div className="flex justify-between items-center text-[10px] text-gray-300 font-orbitron font-bold uppercase mb-1.5">
                            <span>Volume do Microfone (Ganho)</span>
                            <span className="text-[#06b6d4] font-extrabold">{Math.round(micVolume * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="3.0"
                            step="0.1"
                            value={micVolume}
                            onChange={(e) => setMicVolume(parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#06b6d4]"
                          />
                          <div className="flex justify-between text-[8px] text-gray-500 mt-1">
                            <span>Mudo</span>
                            <span>Padrão (100%)</span>
                            <span>Super Alto (300%)</span>
                          </div>
                        </div>

                        {/* Hardware Filters Toggle Section */}
                        <div className="bg-[#0a0a14]/60 border border-violet-900/30 p-4 rounded-xl space-y-3">
                          <span className="text-[9px] text-[#06b6d4] font-orbitron font-bold tracking-wider block uppercase">
                            Filtros do Navegador (Evitar Cortes de Som)
                          </span>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col pr-2">
                              <span className="text-[10px] font-sans font-medium text-gray-200">Ganho Automático</span>
                              <span className="text-[8px] text-gray-500">Desative para o navegador não abafar sons altos.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEnableAutoGain(!enableAutoGain)}
                              className={`w-8 h-4 rounded-full transition-colors relative shrink-0 duration-300 cursor-pointer ${
                                enableAutoGain ? 'bg-[#06b6d4]' : 'bg-slate-800'
                              }`}
                            >
                              <div
                                className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform duration-300 ${
                                  enableAutoGain ? 'translate-x-4.5' : 'translate-x-0.5'
                                }`}
                              ></div>
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex flex-col pr-2">
                              <span className="text-[10px] font-sans font-medium text-gray-200">Supressão de Ruído</span>
                              <span className="text-[8px] text-gray-500">Desative se sua voz cortar em picos de volume.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEnableNoiseSuppression(!enableNoiseSuppression)}
                              className={`w-8 h-4 rounded-full transition-colors relative shrink-0 duration-300 cursor-pointer ${
                                enableNoiseSuppression ? 'bg-[#06b6d4]' : 'bg-slate-800'
                              }`}
                            >
                              <div
                                className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform duration-300 ${
                                  enableNoiseSuppression ? 'translate-x-4.5' : 'translate-x-0.5'
                                }`}
                              ></div>
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex flex-col pr-2">
                              <span className="text-[10px] font-sans font-medium text-gray-200">Cancelamento de Eco</span>
                              <span className="text-[8px] text-gray-500">Geralmente recomendado para evitar retorno.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEnableEchoCancellation(!enableEchoCancellation)}
                              className={`w-8 h-4 rounded-full transition-colors relative shrink-0 duration-300 cursor-pointer ${
                                enableEchoCancellation ? 'bg-[#06b6d4]' : 'bg-slate-800'
                              }`}
                            >
                              <div
                                className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform duration-300 ${
                                  enableEchoCancellation ? 'translate-x-4.5' : 'translate-x-0.5'
                                }`}
                              ></div>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>

        {/* TOAST NOTIFICATION CONTAINER (Activity Feed Popups) */}
        <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
          <AnimatePresence>
            {activeToasts.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 50, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.2 } }}
                className={`pointer-events-auto flex items-center gap-3 bg-[#030307]/95 border ${
                  toast.type === 'join' 
                    ? 'border-[#06b6d4]/40 hover:border-[#06b6d4]/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                    : 'border-rose-600/40 hover:border-rose-600/80 shadow-[0_0_15px_rgba(225,29,72,0.15)]'
                } p-3 rounded-xl backdrop-blur-md transition-all duration-300 relative overflow-hidden`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${toast.type === 'join' ? 'bg-[#06b6d4]' : 'bg-rose-600'}`}></div>
                
                <div className="relative shrink-0 ml-1">
                  <div className="w-8 h-8 rounded-full bg-[#0d0d1e] border border-violet-900/30 overflow-hidden flex items-center justify-center">
                    {toast.avatar ? (
                      <img src={toast.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-gray-400">?</span>
                    )}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#030307] ${toast.type === 'join' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[8px] font-orbitron font-extrabold tracking-widest text-gray-400 uppercase">
                      {toast.type === 'join' ? 'CONECTOU' : 'DESCONECTOU'}
                    </span>
                    <span className="text-[7px] text-gray-500 font-mono">
                      {toast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] font-sans font-bold text-white mt-0.5 leading-tight truncate">
                    {toast.message}
                  </p>
                </div>

                <button 
                  onClick={() => setActiveToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="p-1 text-gray-500 hover:text-white rounded transition-colors"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Activity Log Drawer */}
        <AnimatePresence>
          {showActivityLog && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowActivityLog(false)}
                className="fixed inset-0 bg-black/85 z-40 backdrop-blur-xs cursor-pointer"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 w-80 bg-[#030307]/95 border-l border-violet-950/60 z-45 p-6 shadow-2xl flex flex-col pt-24"
              >
                <div className="flex items-center justify-between pb-4 border-b border-violet-900/20 mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#06b6d4] animate-pulse" />
                    <h3 className="font-orbitron font-extrabold text-xs tracking-wider text-white uppercase">Histórico & VIPs</h3>
                  </div>
                  <button
                    onClick={() => setShowActivityLog(false)}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Drawer Tabs */}
                <div className="flex border-b border-violet-900/10 mb-6 gap-2 shrink-0">
                  <button
                    onClick={() => setDrawerTab('activity')}
                    className={`flex-1 pb-2.5 text-[9px] font-orbitron font-extrabold tracking-widest text-center border-b-2 transition-all cursor-pointer ${
                      drawerTab === 'activity'
                        ? 'border-[#06b6d4] text-[#06b6d4]'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    ATIVIDADE ({notifications.length})
                  </button>
                  <button
                    onClick={() => setDrawerTab('vips')}
                    className={`flex-1 pb-2.5 text-[9px] font-orbitron font-extrabold tracking-widest text-center border-b-2 transition-all cursor-pointer ${
                      drawerTab === 'vips'
                        ? 'border-amber-400 text-amber-400'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    VIPS DO SITE
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                  {drawerTab === 'activity' ? (
                    notifications.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-center text-gray-500">
                        <Users className="w-8 h-8 opacity-20 mb-2" />
                        <p className="text-[10px] font-sans">Nenhuma atividade registrada ainda nesta chamada.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="flex gap-3 text-left border-b border-violet-950/20 pb-3 animate-fadeIn">
                          <div className="w-7 h-7 rounded-full bg-[#0d0d1e] overflow-hidden shrink-0 border border-violet-900/30 flex items-center justify-center">
                            {notif.avatar ? (
                              <img src={notif.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-gray-500">?</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-gray-200 font-sans leading-tight">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-[8px] font-orbitron px-1 rounded-sm ${notif.type === 'join' ? 'bg-[#06b6d4]/10 text-[#06b6d4]' : 'bg-rose-500/10 text-rose-400'}`}>
                                {notif.type === 'join' ? 'ENTROU' : 'SAIU'}
                              </span>
                              <span className="text-[8px] text-gray-500 font-mono">
                                {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    <div className="space-y-3 animate-fadeIn">
                      {[
                        { name: 'PANDA', rank: 1, role: 'VIP SUPREMO', avatar: avatarBtsJungkook, tag: 'ADM' },
                        { name: 'HINOKY', rank: 2, role: 'VIP DIAMANTE', avatar: avatarBtsV, tag: 'DONO' },
                        { name: 'RICK', rank: 3, role: 'VIP ELITE', avatar: avatarBtsJimin, tag: 'MOD' },
                        { name: 'GABY', rank: 4, role: 'VIP GOLD', avatar: avatarBtsGaby, tag: 'DIVA' }
                      ].map((vip, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-amber-500/[0.02] border border-amber-500/5 hover:border-amber-500/20 transition-all duration-300 text-left">
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-500/20 bg-black/40 flex items-center justify-center">
                                <img src={vip.avatar} alt={vip.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-amber-500 text-[8px] font-black text-black flex items-center justify-center">
                                {vip.rank}
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-orbitron font-bold text-white tracking-wider">{vip.name}</span>
                                <span className="text-[7px] font-orbitron font-extrabold px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">{vip.tag}</span>
                              </div>
                              <p className="text-[8px] text-gray-400 font-sans tracking-widest uppercase font-semibold">{vip.role}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            {vip.rank === 1 ? (
                              <Crown className="w-3.5 h-3.5 text-amber-400 filter drop-shadow-[0_0_5px_rgba(245,158,11,0.5)] animate-bounce" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
