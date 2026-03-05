import React, { useState, useEffect } from 'react';
import { 
  Trophy, Activity, TrendingUp, User, Settings, LogOut, Menu, X, 
  LayoutDashboard, CreditCard, History, HelpCircle, Home, Play, 
  Zap, BarChart3, Search, Bell, ChevronRight, Calendar, Heart 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db, isFirebaseConfigured } from './services/firebase';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  onAuthStateChanged, signOut, User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { View, Match, UserStats, Prediction, Transaction } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TeamLogo = ({ team, logo, size = 16, className }: { team: string, logo: string, size?: number, className?: string }) => {
  const [error, setError] = useState(false);
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(team)}&background=random&color=fff&bold=true&size=128`;
  return (
    <div className={cn(
      "rounded-[2rem] bg-white/5 p-3 relative z-10 border border-white/10 flex items-center justify-center overflow-hidden backdrop-blur-sm",
      size === 24 ? "w-24 h-24 rounded-3xl p-4" : "w-16 h-16",
      className
    )}>
      <img src={error ? fallbackUrl : logo} alt={team} className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={() => setError(true)} />
    </div>
  );
};

const Logo = ({ className, size = 24 }: { className?: string, size?: number }) => (
  <div className={cn("relative flex items-center justify-center group", className)}>
    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center shadow-2xl border border-white/10">
      <Trophy className="text-white fill-white/20" size={size} />
    </div>
  </div>
);
const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-white/5 rounded-2xl", className)} />
);

const LiveScore = ({ score, status }: { score: string, status: string }) => {
  const [prevScore, setPrevScore] = useState(score);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (score !== prevScore) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 3000);
      setPrevScore(score);
      return () => clearTimeout(timer);
    }
  }, [score, prevScore]);

  return (
    <div className="flex flex-col items-center gap-1 relative">
      <motion.div
        key={score}
        initial={{ scale: 1.5, filter: "brightness(2)" }}
        animate={{ 
          scale: [1.5, 0.9, 1.1, 1],
          filter: ["brightness(2)", "brightness(1)"],
        }}
        className={cn(
          "text-3xl font-black tracking-tighter transition-colors duration-700",
          isFlashing ? "text-emerald-400" : "text-white"
        )}
      >
        {score}
      </motion.div>
      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{status}</span>
    </div>
  );
};

const OddsButton = ({ label, value, active }: { label: string, value: number, active?: boolean }) => (
  <button className={cn(
    "flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-300",
    active 
      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
      : "bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10"
  )}>
    <span className="text-[8px] font-bold uppercase opacity-60 mb-0.5">{label}</span>
    <span className="text-xs font-mono font-bold tracking-tight">{value.toFixed(2)}</span>
  </button>
);

const MatchCard = ({ match, isFavorite, onToggleFavorite, onClick }: { match: Match, isFavorite: boolean, onToggleFavorite: (id: number) => void, onClick: (match: Match) => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={() => onClick(match)}
    className="glass p-6 rounded-[2.5rem] flex flex-col gap-6 relative overflow-hidden group border border-white/5 cursor-pointer"
  >
    <div className="absolute top-0 right-0 p-5 flex gap-2 items-center z-10">
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(match.id); }}
        className={cn("p-2.5 rounded-2xl transition-all", isFavorite ? "text-red-500 bg-red-500/10" : "text-slate-500 bg-white/5")}
      >
        <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
      </button>
      <div className={cn(
        "text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest",
        match.status === 'live' ? "bg-red-500/20 text-red-400" : "bg-white/10 text-slate-400"
      )}>
        {match.time}
      </div>
    </div>
    
    <div className="flex items-center justify-between mt-6">
      <div className="flex flex-col items-center gap-4 w-1/3">
        <TeamLogo team={match.homeTeam} logo={match.homeLogo} />
        <span className="text-xs font-black text-center truncate w-full uppercase text-slate-200">{match.homeTeam}</span>
      </div>
      <LiveScore score={match.score} status={match.league} />
      <div className="flex flex-col items-center gap-4 w-1/3">
        <TeamLogo team={match.awayTeam} logo={match.awayLogo} />
        <span className="text-xs font-black text-center truncate w-full uppercase text-slate-200">{match.awayTeam}</span>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2">
      <OddsButton label="Home" value={match.odds.home} />
      <OddsButton label="Draw" value={match.odds.draw} />
      <OddsButton label="Away" value={match.odds.away} />
    </div>
  </motion.div>
);

const Sidebar = ({ isOpen, onClose, userStats, setView, user }: { isOpen: boolean, onClose: () => void, userStats: UserStats | null, setView: (v: View) => void, user: FirebaseUser }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 bottom-0 w-80 glass border-l border-white/5 z-50 p-8 flex flex-col gap-10">
          <div className="flex items-center justify-between">
            <Logo size={18} />
            <button onClick={onClose} className="p-3 glass rounded-2xl"><X size={20} /></button>
          </div>
          <div className="flex items-center gap-4 p-6 glass rounded-[2.5rem] border-white/5">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-xl font-black">
              {user.email?.[0].toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-black truncate max-w-[140px]">{user.email?.split('@')[0]}</div>
              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Pro Member</div>
            </div>
          </div>
          <nav className="flex flex-col gap-3">
            <button onClick={() => { setView('home'); onClose(); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-sm font-medium">
              <Home size={18} /> Home
            </button>
            <button onClick={() => { setView('profile'); onClose(); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-sm font-medium">
              <User size={18} /> Profile
            </button>
            <button onClick={() => signOut(auth!)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-sm font-medium text-red-400">
              <LogOut size={18} /> Logout
            </button>
          </nav>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth!, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
        await setDoc(doc(db!, 'users', userCredential.user.uid), {
          balance: 1000, winRate: 0, rank: 0, predictions: 0, createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#05060f]">
      <div className="glass w-full max-w-md p-10 rounded-[3rem] border-white/10">
        <div className="flex flex-col items-center gap-6 mb-10">
          <Logo size={32} />
          <h2 className="text-3xl font-black tracking-tight">{isLogin ? 'Welcome Back' : 'Join the Elite'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm" placeholder="Email Address" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm" placeholder="Password" />
          {error && <div className="text-red-400 text-[10px] font-black uppercase text-center">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl">
            {loading ? 'PROCESSING...' : (isLogin ? 'LOGIN' : 'SIGN UP')}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
};
const SetupRequiredScreen = () => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-[#05060f] text-center">
    <div className="max-w-md space-y-8">
      <Logo size={48} className="mx-auto" />
      <h2 className="text-3xl font-black tracking-tight">Configuration Required</h2>
      <p className="text-slate-400 text-sm">Please set your Firebase API credentials in the environment variables.</p>
    </div>
  </div>
);

const BottomNav = ({ currentView, setView }: { currentView: View, setView: (v: View) => void }) => (
  <nav className="md:hidden fixed bottom-6 left-6 right-6 z-40">
    <div className="glass rounded-[2.5rem] p-3 flex items-center justify-around border-white/5 shadow-2xl backdrop-blur-2xl">
      <button onClick={() => setView('home')} className={cn("flex flex-col items-center gap-1", currentView === 'home' ? "text-blue-400" : "text-slate-500")}>
        <Home size={20} />
        <span className="text-[10px] font-bold uppercase">Home</span>
      </button>
      <button onClick={() => setView('live')} className={cn("flex flex-col items-center gap-1", currentView === 'live' ? "text-blue-400" : "text-slate-500")}>
        <Zap size={20} />
        <span className="text-[10px] font-bold uppercase">Live</span>
      </button>
      <button onClick={() => setView('favorites')} className={cn("flex flex-col items-center gap-1", currentView === 'favorites' ? "text-blue-400" : "text-slate-500")}>
        <Heart size={20} />
        <span className="text-[10px] font-bold uppercase">Saved</span>
      </button>
      <button onClick={() => setView('profile')} className={cn("flex flex-col items-center gap-1", currentView === 'profile' ? "text-blue-400" : "text-slate-500")}>
        <User size={20} />
        <span className="text-[10px] font-bold uppercase">Profile</span>
      </button>
    </div>
  </nav>
);

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [view, setView] = useState<View>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth!, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db!, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserStats(userDoc.data() as UserStats);
        } else {
          const initialStats = { balance: 1000, winRate: 0, rank: 0, predictions: 0 };
          await setDoc(doc(db!, 'users', currentUser.uid), initialStats);
          setUserStats(initialStats);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Mock Data for Demo
    const mockMatches: Match[] = [
      {
        id: 1, homeTeam: 'Real Madrid', awayTeam: 'Barcelona',
        homeLogo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
        awayLogo: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_(crest).svg',
        score: '2 - 1', time: '84\'', status: 'live', league: 'La Liga',
        odds: { home: 1.85, draw: 3.40, away: 4.20 },
        probability: { home: 62, draw: 20, away: 18 }
      },
      {
        id: 2, homeTeam: 'Arsenal', awayTeam: 'Chelsea',
        homeLogo: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
        awayLogo: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
        score: '0 - 0', time: '12\'', status: 'live', league: 'Premier League',
        odds: { home: 2.10, draw: 3.20, away: 3.50 },
        probability: { home: 45, draw: 30, away: 25 }
      }
    ];
    setMatches(mockMatches);
  }, []);

  const toggleFavorite = (id: number) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
  };

  if (!isFirebaseConfigured) return <SetupRequiredScreen />;
  if (isLoading) return <div className="min-h-screen bg-[#05060f] flex items-center justify-center"><Logo className="animate-bounce" /></div>;
  if (!user) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-[#05060f] text-white font-sans">
      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/5 px-6 py-4 flex items-center justify-between backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <Logo size={20} />
          <h1 className="text-lg font-black tracking-tighter uppercase">EliteSports</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 glass rounded-2xl border-white/5">
            <span className="text-xs font-black">🪙 {userStats?.balance}</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-3 glass rounded-2xl hover:bg-white/10 transition-colors">
            <Menu size={20} />
          </button>
        </div>
      </header>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userStats={userStats} setView={setView} user={user} />

      <main className="pt-32 pb-40 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <div className="text-center space-y-6 py-12">
                <h2 className="text-6xl font-black tracking-tighter uppercase leading-[0.85]">Precision <br /><span className="text-slate-500">Intelligence</span></h2>
                <p className="text-slate-500 max-w-2xl mx-auto">Experience the next generation of sports analytics. Neural engine processing millions of data points.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {matches.map(match => (
                  <MatchCard key={match.id} match={match} isFavorite={favorites.includes(match.id)} onToggleFavorite={toggleFavorite} onClick={setSelectedMatch} />
                ))}
              </div>
            </motion.div>
          )}

          {view === 'live' && (
            <motion.div key="live" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <h2 className="text-4xl font-black uppercase text-red-500">Live Transmission</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {matches.filter(m => m.status === 'live').map(match => (
                  <MatchCard key={match.id} match={match} isFavorite={favorites.includes(match.id)} onToggleFavorite={toggleFavorite} onClick={setSelectedMatch} />
                ))}
              </div>
            </motion.div>
          )}

          {view === 'favorites' && (
            <motion.div key="favorites" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <h2 className="text-4xl font-black uppercase text-red-400">Saved Signals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {matches.filter(m => favorites.includes(m.id)).map(match => (
                  <MatchCard key={match.id} match={match} isFavorite={true} onToggleFavorite={toggleFavorite} onClick={setSelectedMatch} />
                ))}
              </div>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto space-y-8">
              <div className="glass p-10 rounded-[3rem] text-center space-y-4">
                <div className="w-24 h-24 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black">
                  {user.email?.[0].toUpperCase()}
                </div>
                <h2 className="text-3xl font-black">{user.email?.split('@')[0]}</h2>
                <p className="text-slate-500">{user.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="glass p-6 rounded-3xl text-center">
                  <span className="text-[10px] font-black uppercase text-slate-500">Balance</span>
                  <div className="text-2xl font-black text-blue-400">🪙 {userStats?.balance}</div>
                </div>
                <div className="glass p-6 rounded-3xl text-center">
                  <span className="text-[10px] font-black uppercase text-slate-500">Win Rate</span>
                  <div className="text-2xl font-black text-emerald-400">{userStats?.winRate}%</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav currentView={view} setView={setView} />
    </div>
  );
    }


