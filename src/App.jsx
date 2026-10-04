import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  
  const [showSplash, setShowSplash] = useState(true);
  const [currentTab, setCurrentTab] = useState('home'); 
  
  // User Profile & Onboarding State
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardCategory, setOnboardCategory] = useState('Class 10 Board');
  const [onboardGoalHours, setOnboardGoalHours] = useState(6);
  const [onboardSubjects, setOnboardSubjects] = useState(['Physics', 'Chemistry', 'Mathematics']);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  
  // Timer & Mode State
  const [timerMode, setTimerMode] = useState('stopwatch'); // 'stopwatch' or 'pomodoro'
  const [selectedSubject, setSelectedSubject] = useState('General');
  const [isStudying, setIsStudying] = useState(false);
  const [time, setTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [pomodoroTarget, setPomodoroTarget] = useState(25 * 60); // 25 mins in seconds
  
  // User Data
  const [streak, setStreak] = useState(0);
  const [todayProgress, setTodayProgress] = useState(0);
  const [username, setUsername] = useState('Aspirant');
  const [userCategory, setUserCategory] = useState('Class 10 Board');
  const [dailyGoalHours, setDailyGoalHours] = useState(4);
  const [userSubjects, setUserSubjects] = useState(['General']); 
  const [isPro, setIsPro] = useState(false);

  // Profile Dashboard, Edit Name & Settings State
  const [totalLifetimeProgress, setTotalLifetimeProgress] = useState(0); 
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false); 
  const [showSubscription, setShowSubscription] = useState(false); 
  const [isEditingName, setIsEditingName] = useState(false); 
  const [editNameInput, setEditNameInput] = useState('');
  const [offerTimeLeft, setOfferTimeLeft] = useState(0); 

  // Payment Gateway State (Razorpay Integrated)
  const [showPaymentUI, setShowPaymentUI] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const currentPrice = offerTimeLeft > 0 ? 99 : 329; // Calculates dynamic price

  // Groups & Arenas Data
  const [myGroups, setMyGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupLeaderboard, setGroupLeaderboard] = useState([]);
  const [groupLeaderboardSubTab, setGroupLeaderboardSubTab] = useState('leaderboard'); 
  const [liveFocusUsers, setLiveFocusUsers] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Delete/Leave Group State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Multi-step Create Group Wizard State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Class 10');
  const [newGroupPrivacy, setNewGroupPrivacy] = useState('public');
  const [justCreatedGroup, setJustCreatedGroup] = useState(null);

  // Blocks Tab State
  const [blocksState, setBlocksState] = useState({ youtubeShorts: true, igReels: false, fbReels: false });
  const [blockedWebsites, setBlockedWebsites] = useState(['instagram.com', 'discord.com']);
  const [newWebsiteBlocksInput, setNewWebsiteBlocksInput] = useState('');

  const availableCategories = ['IIT JEE', 'NEET', 'Chartered Accountant (CA)', 'UPSC Civil Services', 'Class 12 Board', 'Class 10 Board', 'General Studies'];

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
    });
  }, []);

  useEffect(() => {
    if (session && !isStudying) {
      fetchUserData();
      fetchMyGroups();
    }
  }, [session, isStudying]);

  useEffect(() => {
    if (!session?.user?.created_at) return;
    const createdAt = new Date(session.user.created_at).getTime();
    const expiryTime = createdAt + 24 * 60 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setOfferTimeLeft(remaining);
    };

    updateTimer(); 
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session, showSubscription]);

  const checkProfile = async (userId) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile || !profile.target_category || !profile.custom_subjects || profile.custom_subjects.length === 0) {
      setNeedsOnboarding(true);
    } else {
      setUsername(profile.username || 'Aspirant');
      setUserCategory(profile.target_category || 'Class 10 Board');
      setDailyGoalHours(profile.daily_goal_hours || 4);
      setUserSubjects(profile.custom_subjects);
      setIsPro(profile.is_pro || false); 
      if (profile.custom_subjects.length > 0) {
        setSelectedSubject(profile.custom_subjects[0]);
      }
      setStreak(profile.current_streak || 0);
      fetchUserData(userId);
      fetchMyGroups(userId);
    }
  };

  const saveOnboardingDetails = async (e) => {
    e.preventDefault();
    if (onboardSubjects.length === 0) {
      alert("Please add at least one subject!");
      return;
    }

    const userId = session.user.id;
    const defaultUsername = email ? email.split('@')[0] : 'Aspirant';
    
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      username: defaultUsername,
      target_category: onboardCategory,
      daily_goal_hours: onboardGoalHours,
      custom_subjects: onboardSubjects,
      current_streak: 0,
      is_pro: false
    });

    if (error) {
      alert("Error saving profile: " + error.message);
      return;
    }

    setUserCategory(onboardCategory);
    setDailyGoalHours(onboardGoalHours);
    setUserSubjects(onboardSubjects);
    setSelectedSubject(onboardSubjects[0]);
    setUsername(defaultUsername);
    setNeedsOnboarding(false);
    fetchUserData(userId);
    fetchMyGroups(userId);
  };

  const saveName = async () => {
    if (!editNameInput.trim()) return;
    const { error } = await supabase.from('profiles').update({ username: editNameInput.trim() }).eq('id', session.user.id);
    if (!error) {
      setUsername(editNameInput.trim());
      setIsEditingName(false);
    } else {
      alert("Error updating name: " + error.message);
    }
  };

  // Subscription Cancellation & Refund Handler
  const handleCancelSubscription = async () => {
    const confirmCancel = window.confirm("Are you sure you want to cancel your subscription and request a refund within 2 days?");
    if (!confirmCancel) return;

    const { error } = await supabase.from('profiles').update({ is_pro: false }).eq('id', session.user.id);
    if (!error) {
      setIsPro(false);
      alert("Subscription cancelled successfully. Your refund request has been logged and will be processed within 48 hours.");
    } else {
      alert("Error cancelling subscription: " + error.message);
    }
  };

  // Razorpay Checkout Integration
  const handlePaymentSubmit = () => {
    if (!window.Razorpay) {
      alert("Razorpay SDK failed to load. Please check your internet connection.");
      return;
    }

    setIsProcessingPayment(true);

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TjlgHj0Mll46st",
      amount: currentPrice * 100, // Amount in currency subunits (paise)
      currency: "INR",
      name: "Zenith",
      description: "Zenith PRO Yearly Subscription",
      handler: async function (response) {
        const { error } = await supabase.from('profiles').update({ is_pro: true }).eq('id', session.user.id);
        setIsProcessingPayment(false);

        if (!error) {
          setIsPro(true);
          alert("Payment Successful! Payment ID: " + response.razorpay_payment_id);
          setShowPaymentUI(false);
          setShowSubscription(false);
        } else {
          alert("Payment verified, but error updating profile: " + error.message);
        }
      },
      prefill: {
        name: username,
        email: session?.user?.email || '',
      },
      theme: {
        color: "#7c5cff",
      },
      modal: {
        ondismiss: function() {
          setIsProcessingPayment(false);
        }
      }
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setIsProcessingPayment(false);
      alert("Could not open Razorpay checkout modal: " + err.message);
    }
  };

  const fetchUserData = async (userId) => {
    const targetId = userId || session?.user?.id;
    if (!targetId) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data: sessionData } = await supabase.from('study_sessions').select('duration').eq('user_id', targetId).gte('created_at', startOfDay.toISOString());
    if (sessionData) {
      const totalSeconds = sessionData.reduce((sum, record) => sum + record.duration, 0);
      setTodayProgress(totalSeconds);
    }

    const { data: lifetimeSessionData } = await supabase.from('study_sessions').select('duration').eq('user_id', targetId);
    if (lifetimeSessionData) {
      const lifetimeSec = lifetimeSessionData.reduce((sum, record) => sum + record.duration, 0);
      setTotalLifetimeProgress(lifetimeSec);
    }
  };

  const fetchMyGroups = async (userId) => {
    const targetId = userId || session?.user?.id;
    if (!targetId) return;

    const { data: memberData } = await supabase.from('group_members').select('group_id').eq('user_id', targetId);
    if (memberData && memberData.length > 0) {
      const groupIds = memberData.map(m => m.group_id);
      const { data: groupsData } = await supabase.from('study_groups').select('*').in('id', groupIds);
      if (groupsData) setMyGroups(groupsData);
    } else {
      setMyGroups([]);
    }
  };

  const handleCreateGroupSubmit = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: newGroup, error } = await supabase.from('study_groups').insert([{ 
      name: newGroupName, 
      join_code: code, 
      category: newGroupCategory, 
      privacy: newGroupPrivacy,
      created_by: session.user.id 
    }]).select().single();
    
    if (error) { alert("Error: " + error.message); return; }
    await supabase.from('group_members').insert([{ group_id: newGroup.id, user_id: session.user.id }]);
    fetchMyGroups();
    setJustCreatedGroup({ name: newGroupName, code: code });
    setCreateStep(4); 
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setTimeout(() => { setCreateStep(1); setNewGroupName(''); setJustCreatedGroup(null); }, 300);
  };

  const joinGroup = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const { data: groupData, error: findError } = await supabase.from('study_groups').select('id, name').eq('join_code', joinCode.toUpperCase()).single();
    if (findError || !groupData) { alert("Invalid invite code."); return; }

    const { error } = await supabase.from('group_members').insert([{ group_id: groupData.id, user_id: session.user.id }]);
    if (error) alert("You are already in this arena!");
    else { alert(`Successfully joined ${groupData.name}!`); setJoinCode(''); fetchMyGroups(); }
  };

  const confirmDeleteGroup = async () => {
    if (!activeGroup) return;
    await supabase.from('group_members').delete().eq('group_id', activeGroup.id);
    const { error } = await supabase.from('study_groups').delete().eq('id', activeGroup.id);
    
    if (error) {
      alert("Could not delete group. Error: " + error.message);
    } else {
      setShowDeleteConfirm(false);
      setActiveGroup(null);
      fetchMyGroups();
    }
  };

  const confirmLeaveGroup = async () => {
    if (!activeGroup) return;
    const { error } = await supabase.from('group_members').delete().eq('group_id', activeGroup.id).eq('user_id', session.user.id);
    
    if (error) {
      alert("Could not leave group. Error: " + error.message);
    } else {
      setShowLeaveConfirm(false);
      setActiveGroup(null);
      fetchMyGroups();
    }
  };

  const openGroupLeaderboard = async (group) => {
    setActiveGroup(group);
    setCurrentTab('groups'); 
    setIsRefreshing(true);
    
    const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', group.id);
    if (!members) { setIsRefreshing(false); return; }
    const memberIds = members.map(m => m.user_id);
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', memberIds);
    const { data: sessions } = await supabase.from('study_sessions').select('user_id, duration').in('user_id', memberIds);

    let leaderboard = profiles.map(profile => {
      const userSessions = sessions.filter(s => s.user_id === profile.id);
      const totalSeconds = userSessions.reduce((sum, s) => sum + s.duration, 0);
      return {
        id: profile.id, name: profile.username || 'Anonymous', totalSeconds,
        timeString: formatDashboardTime(totalSeconds), isMe: profile.id === session.user.id
      };
    });

    leaderboard.sort((a, b) => b.totalSeconds - a.totalSeconds);
    leaderboard = leaderboard.map((user, index) => ({ ...user, rank: index + 1, isGold: index < 3 && user.totalSeconds > 0 }));
    setGroupLeaderboard(leaderboard);

    const { data: activeData } = await supabase.from('active_focus').select('user_id').eq('is_active', true).in('user_id', memberIds);
    if (activeData) {
      const activeIds = activeData.map(a => a.user_id);
      const activeProfiles = profiles.filter(p => activeIds.includes(p.id));
      setLiveFocusUsers(activeProfiles);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    let interval;
    if (isStudying && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (timerMode === 'pomodoro') {
          const remaining = Math.max(pomodoroTarget - elapsed, 0);
          setTime(remaining);
          if (remaining === 0) {
            handleEndStudy();
            alert("Pomodoro session completed! Take a break.");
          }
        } else {
          setTime(elapsed);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStudying, startTime, timerMode]);

  const startStudySession = async () => {
    setIsStudying(true);
    setStartTime(Date.now());
    setTime(timerMode === 'pomodoro' ? pomodoroTarget : 0);
    await supabase.from('active_focus').upsert({ user_id: session.user.id, is_active: true });
  };

  const handleEndStudy = async () => {
    setIsStudying(false);
    await supabase.from('active_focus').delete().eq('user_id', session.user.id);

    const durationLogged = timerMode === 'pomodoro' ? (pomodoroTarget - time) : time;
    if (durationLogged > 0) {
      await supabase.from('study_sessions').insert([{ user_id: session.user.id, subject: selectedSubject, duration: durationLogged }]);
      fetchUserData(); 
    }
    setTime(0); 
    setStartTime(null);
  };

  const formatStopwatch = (seconds) => {
    const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDashboardTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600); const m = Math.floor((totalSeconds % 3600) / 60);
    if (h === 0 && m === 0) return '0m'; if (h === 0) return `${m}m`; return `${h}h ${m}m`;
  };

  const formatOfferTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const targetSeconds = dailyGoalHours * 3600;
  const progressPercent = Math.min(Math.max(todayProgress / targetSeconds, 0), 1);
  const circleRadius = 85;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - progressPercent * circleCircumference;

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else if (data.session) checkProfile(data.session.user.id);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else if (data.user) {
        setSession(data.session);
        setNeedsOnboarding(true);
      }
    }
  };

  const SettingsRow = ({ icon, title, badge, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 bg-[#11151d] hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-none text-left">
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-lg w-6 text-center">{icon}</span>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && <span className="bg-indigo-900/30 text-[#7c5cff] border border-[#7c5cff]/20 text-[10px] font-bold px-2 py-0.5 rounded flex items-center">{badge}</span>}
        <span className="text-gray-500 text-lg">›</span>
      </div>
    </button>
  );

  if (showSplash) {
    return (
      <div className="min-h-screen bg-[#090b10] bg-[radial-gradient(circle_at_50%_50%,rgba(124,92,255,0.16),transparent_35%)] flex items-center justify-center">
        <h1 className="text-3xl font-bold tracking-[0.25em] text-white">ZENITH</h1>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#090b10] bg-[radial-gradient(circle_at_50%_35%,rgba(124,92,255,0.14),transparent_40%)] flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black tracking-[0.2em] text-white mb-2">ZENITH</h1>
            <p className="text-xs text-gray-400">Master your focus discipline.</p>
          </div>
          <form onSubmit={handleAuth} className="bg-[#11151d] p-6 rounded-3xl border border-white/[0.07] shadow-2xl space-y-4">
            <h2 className="text-sm font-bold text-gray-200 mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full zenith-input bg-[#090b10] text-white px-4 py-3.5 rounded-2xl border border-white/[0.07] focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/10 outline-none text-xs" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full zenith-input bg-[#090b10] text-white px-4 py-3.5 rounded-2xl border border-white/[0.07] focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/10 outline-none text-xs" />
            <button type="submit" className="w-full zenith-primary bg-[#7c5cff] hover:bg-[#6847f5] shadow-[0_10px_30px_rgba(124,92,255,0.22)] text-white font-bold py-3.5 rounded-2xl transition-all text-xs cursor-pointer">{isLogin ? 'Sign In' : 'Sign Up'}</button>
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full mt-2 text-xs text-gray-400 hover:text-white">{isLogin ? "Need an account? Sign up" : "Have an account? Log in"}</button>
          </form>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-[#090b10] text-white p-6 flex flex-col justify-center items-center font-sans overflow-y-auto">
        <div className="w-full max-w-md zenith-card bg-[#11151d] border border-white/[0.07] p-8 rounded-3xl shadow-2xl my-8">
          <h2 className="text-xl font-bold mb-1 text-white">Welcome to Zenith</h2>
          <p className="text-xs text-gray-400 mb-6">Let's tailor your preparation experience.</p>
          
          <form onSubmit={saveOnboardingDetails} className="space-y-6">
            <div>
              <label className="text-xs font-medium text-gray-300 block mb-2">What is your target examination or profession?</label>
              <select 
                value={onboardCategory} 
                onChange={(e) => setOnboardCategory(e.target.value)}
                className="w-full zenith-input bg-[#090b10] text-white p-3.5 rounded-2xl border border-white/[0.07] outline-none text-xs focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/10"
              >
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-300 block mb-2">How many hours do you want to study per day?</label>
              <div className="flex items-center gap-3">
                <input 
                  type="range" min="1" max="14" value={onboardGoalHours} 
                  onChange={(e) => setOnboardGoalHours(parseInt(e.target.value))}
                  className="flex-1 accent-[#7c5cff] bg-gray-700 h-2 rounded-lg cursor-pointer"
                />
                <span className="text-sm font-mono font-bold text-[#7c5cff] w-12 text-right">{onboardGoalHours} Hours</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-300 block mb-2">Add your study subjects</label>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  placeholder="e.g. Mathematics" 
                  value={newSubjectInput} 
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  className="flex-1 zenith-input bg-[#090b10] text-white px-3 py-2.5 rounded-xl border border-white/[0.07] text-xs outline-none focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/10"
                />
                <button 
                  type="button"
                  onClick={() => {
                    if (newSubjectInput.trim() && !onboardSubjects.includes(newSubjectInput.trim())) {
                      setOnboardSubjects([...onboardSubjects, newSubjectInput.trim()]);
                      setNewSubjectInput('');
                    }
                  }}
                  className="zenith-primary bg-[#7c5cff] text-white font-bold px-4 rounded-xl text-xs cursor-pointer hover:bg-[#6847f5]"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {onboardSubjects.map((subj, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-[#090b10] px-3 py-1.5 rounded-full border border-white/[0.07]">
                    <span className="text-[10px] font-semibold text-gray-300">{subj}</span>
                    <button type="button" onClick={() => setOnboardSubjects(onboardSubjects.filter((_, i) => i !== idx))} className="text-red-400 text-xs cursor-pointer hover:text-red-300">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full zenith-primary bg-[#7c5cff] hover:bg-[#6847f5] shadow-[0_10px_30px_rgba(124,92,255,0.22)] text-white font-extrabold py-4 rounded-2xl transition-all text-xs cursor-pointer shadow-lg shadow-indigo-500/20 mt-4">
              Start Preparing
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isStudying) {
    return (
      <div className="min-h-screen bg-[#090b10] bg-[radial-gradient(circle_at_50%_35%,rgba(124,92,255,0.14),transparent_40%)] flex flex-col items-center justify-center p-6 pb-24 text-white font-sans">
        <div className="text-xs font-semibold tracking-widest text-[#7c5cff] uppercase mb-2 bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">Focus: {selectedSubject} ({timerMode.toUpperCase()})</div>
        <div className="text-7xl font-mono font-light tracking-tighter mb-16 text-white">{formatStopwatch(time)}</div>
        <button onClick={handleEndStudy} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold py-4 px-10 rounded-2xl border border-red-500/20 transition-all text-xs tracking-wide cursor-pointer">
          End Session & Save
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-white pb-32 bg-[radial-gradient(circle_at_50%_-10%,rgba(124,92,255,0.22),transparent_38%),radial-gradient(circle_at_100%_45%,rgba(45,212,191,0.07),transparent_28%),radial-gradient(circle_at_0%_100%,rgba(59,130,246,0.07),transparent_30%)] font-sans relative selection:bg-[#7c5cff] selection:text-white">
      <style>{`
      * { scrollbar-width: thin; scrollbar-color: rgba(124,92,255,.45) transparent; }
      ::selection { background: rgba(124,92,255,.35); }
      .zenith-card { background: linear-gradient(145deg, rgba(22,26,38,.92), rgba(12,15,23,.88)); border: 1px solid rgba(255,255,255,.075); box-shadow: 0 18px 50px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.035); }
      .zenith-card:hover { border-color: rgba(124,92,255,.22); box-shadow: 0 22px 60px rgba(0,0,0,.30), 0 0 0 1px rgba(124,92,255,.04); }
      .zenith-primary { box-shadow: 0 14px 34px rgba(124,92,255,.24), inset 0 1px 0 rgba(255,255,255,.16); }
      .zenith-input { background: rgba(7,9,14,.78) !important; border-color: rgba(255,255,255,.09) !important; box-shadow: inset 0 1px 10px rgba(0,0,0,.18); }
      .zenith-input:focus { border-color: rgba(124,92,255,.65) !important; box-shadow: 0 0 0 4px rgba(124,92,255,.10), inset 0 1px 10px rgba(0,0,0,.18); }
      .zenith-pill { box-shadow: inset 0 1px 0 rgba(255,255,255,.06); }
      .zenith-nav { background: linear-gradient(145deg, rgba(25,29,42,.88), rgba(10,13,20,.88)); box-shadow: 0 25px 70px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08); }
      .zenith-glow { position: relative; overflow: hidden; }
      .zenith-glow:before { content: ''; position:absolute; width:180px; height:180px; border-radius:999px; background:rgba(124,92,255,.13); filter:blur(45px); top:-80px; right:-55px; pointer-events:none; }
      .zenith-modal { background: linear-gradient(155deg, rgba(21,25,37,.98), rgba(9,12,18,.98)); box-shadow: 0 30px 100px rgba(0,0,0,.55); }
    `}</style>
      
      <AnimatePresence mode="wait">
        {currentTab === 'home' && (
          <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            
            <div className="flex justify-between items-end px-6 pt-9 mb-7 max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowProfile(true)}
                  className="w-10 h-10 rounded-full bg-[#7c5cff] border-2 border-[#11151d] flex items-center justify-center overflow-hidden shadow-lg cursor-pointer transform hover:scale-105 transition-transform"
                >
                  <span className="text-xl mt-1">👨‍💻</span>
                </button>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.28em] text-[#8f88aa] font-bold mb-1">ZENITH / FOCUS</p>
                  <span className="text-[10px] font-bold text-[#c1b8ff] tracking-wider uppercase bg-[#7c5cff]/10 px-2.5 py-1 rounded-full border border-[#7c5cff]/20">{userCategory}</span>
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto px-6 mb-6">
              <div className="flex zenith-card bg-[#11151d] p-1.5 rounded-[22px] border border-white/[0.07] mb-4">
                <button onClick={() => setTimerMode('stopwatch')} className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${timerMode === 'stopwatch' ? 'bg-[#7c5cff]/12 text-[#a99cff] shadow-inner shadow-[#7c5cff]/10' : 'text-gray-400'}`}>Stopwatch</button>
                <button onClick={() => setTimerMode('pomodoro')} className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${timerMode === 'pomodoro' ? 'bg-[#7c5cff]/12 text-[#a99cff] shadow-inner shadow-[#7c5cff]/10' : 'text-gray-400'}`}>Pomodoro (25m)</button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {userSubjects.map(subj => (
                  <button key={subj} onClick={() => setSelectedSubject(subj)} className={`px-3.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${selectedSubject === subj ? 'zenith-primary bg-[#7c5cff] text-white shadow-md' : 'bg-[#11151d] text-gray-400 border border-white/[0.07]'}`}>
                    {subj}
                  </button>
                ))}
              </div>
            </div>

            <div className="zenith-glow zenith-card rounded-[34px] mx-auto max-w-md px-5 py-7 mb-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] uppercase tracking-[0.25em] text-gray-500 font-bold">Daily focus</span>
                <span className="text-[9px] text-[#a99cff] font-bold">{Math.round(progressPercent * 100)}% COMPLETE</span>
              </div>
              <div className="flex flex-col items-center justify-center relative">
              <div className="relative w-60 h-60 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="120" cy="120" r={circleRadius} stroke="#11151d" strokeWidth="16" fill="transparent" />
                  <circle 
                    cx="120" cy="120" r={circleRadius} stroke="#7c5cff" strokeWidth="16" fill="transparent" 
                    strokeDasharray={circleCircumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center text-center">
                  <span className="text-3xl font-black tracking-tight text-white mb-1">{formatDashboardTime(todayProgress)}</span>
                  <span className="text-[11px] font-medium text-gray-400">Goal: {dailyGoalHours}h ({selectedSubject})</span>
                </div>
              </div>
              </div>
            </div>

            <div className="mx-6 zenith-card bg-[#11151d]/90 backdrop-blur-xl border border-white/[0.07] rounded-[22px] p-4 flex items-center justify-between mb-28 max-w-md mx-auto">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Current Streak</p>
                <h2 className="text-base font-bold text-white">{streak} Days Active {streak > 0 ? '🔥' : '🌱'}</h2>
              </div>
            </div>

            <div className="fixed bottom-24 left-6 right-6 z-40 max-w-md mx-auto">
              <button onClick={startStudySession} className="w-full bg-gradient-to-r from-white via-white to-[#d9d4ff] hover:to-white text-black font-extrabold py-4.5 px-6 rounded-[22px] shadow-[0_18px_45px_rgba(124,92,255,.22)] transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer group border border-white/60">
                <span className="text-sm font-bold tracking-tight">Start {selectedSubject} Timer</span>
                <div className="w-8 h-8 rounded-full bg-[#7c5cff] flex items-center justify-center text-white font-bold">→</div>
              </button>
            </div>
          </motion.div>
        )}

        {currentTab === 'groups' && !activeGroup && (
          <motion.div key="groups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="pt-8 px-5 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-xl font-bold text-white">Focus Groups</h1>
              <button onClick={() => setShowCreateModal(true)} className="text-[#7c5cff] text-xs font-semibold cursor-pointer">+ Create Group</button>
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Your groups</h3>
            <div className="flex flex-col gap-3 mb-8">
              {myGroups.length === 0 ? (
                <div className="zenith-card bg-[#11151d]/90 backdrop-blur-xl border border-white/[0.07] rounded-[22px] p-5 text-center"><p className="text-gray-400 text-xs font-medium">You haven't joined any arenas yet.</p></div>
              ) : (
                myGroups.map(group => (
                  <div key={group.id} onClick={() => openGroupLeaderboard(group)} className="zenith-card bg-[#11151d] border border-white/[0.07] hover:border-[#7c5cff]/40 rounded-2xl p-4 flex justify-between items-center cursor-pointer transition-all shadow-lg">
                    <div><h4 className="font-bold text-sm text-white">{group.name}</h4><p className="text-[11px] text-gray-400 mt-0.5">{group.category || 'Public'} • Code: <span className="text-white font-mono">{group.join_code}</span></p></div>
                    <span className="text-gray-500">→</span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={joinGroup} className="zenith-card bg-[#11151d] border border-white/[0.07] p-4 rounded-2xl shadow-xl">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Join With Code</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="Enter 6-digit code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required className="flex-1 zenith-input bg-[#090b10] text-white px-4 py-3 rounded-xl border border-white/[0.07] focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/10 outline-none text-xs uppercase font-mono" maxLength={6} />
                <button type="submit" className="bg-white text-black px-5 rounded-xl font-bold text-xs hover:bg-gray-100 cursor-pointer">Join</button>
              </div>
            </form>
          </motion.div>
        )}

        {currentTab === 'groups' && activeGroup && (
          <motion.div key="arena_detail" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="pt-10 max-w-md mx-auto">
            <div className="px-6 mb-6 flex justify-between items-start">
              <div>
                <button onClick={() => setActiveGroup(null)} className="text-gray-400 mb-3 text-xs font-medium hover:text-white flex items-center gap-1 cursor-pointer">← Back</button>
                <h1 className="text-xl font-bold text-white">{activeGroup.name}</h1>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{activeGroup.category || 'General'} • Code: <span className="text-white font-mono">{activeGroup.join_code}</span></p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => openGroupLeaderboard(activeGroup)} disabled={isRefreshing} className="zenith-card bg-[#11151d] border border-white/[0.07] text-gray-300 px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer hover:bg-white/5 transition-colors">
                  <span className={`${isRefreshing ? 'animate-spin' : ''}`}>🔄</span> Retry
                </button>
                
                {activeGroup.created_by === session?.user?.id ? (
                  <button onClick={() => setShowDeleteConfirm(true)} className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer hover:bg-red-500/20 transition-colors">
                    Delete
                  </button>
                ) : (
                  <button onClick={() => setShowLeaveConfirm(true)} className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer hover:bg-red-500/20 transition-colors">
                    Leave
                  </button>
                )}
              </div>
            </div>

            {/* ONE-CLICK INVITE SHARE & COPY CODE BANNER */}
            <div className="mx-6 mb-6 zenith-card bg-[#11151d]/90 backdrop-blur-xl border border-white/[0.07] rounded-[22px] p-4 flex items-center justify-between shadow-lg">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Invite Friends</p>
                <p className="text-xs font-mono font-bold text-[#7c5cff]">Code: {activeGroup.join_code}</p>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`Join my Zenith study arena "${activeGroup.name}" with code: ${activeGroup.join_code}`);
                  alert("Invite code copied to clipboard!");
                }}
                className="zenith-primary bg-[#7c5cff] hover:bg-[#6847f5] shadow-[0_10px_30px_rgba(124,92,255,0.22)] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-md"
              >
                📋 Copy Invite
              </button>
            </div>

            <div className="flex border-b border-white/5 mb-4 px-6">
              <button onClick={() => setGroupLeaderboardSubTab('leaderboard')} className={`w-1/2 text-center pb-3 text-xs font-semibold cursor-pointer ${groupLeaderboardSubTab === 'leaderboard' ? 'border-b-2 border-[#7c5cff] text-[#7c5cff]' : 'text-gray-500'}`}>Leaderboard</button>
              <button onClick={() => setGroupLeaderboardSubTab('live')} className={`w-1/2 text-center pb-3 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${groupLeaderboardSubTab === 'live' ? 'border-b-2 border-[#7c5cff] text-[#7c5cff]' : 'text-gray-500'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#7c5cff] animate-pulse"></span> Live 🟢
              </button>
            </div>
            <div className="px-6 pb-28">
              {groupLeaderboardSubTab === 'leaderboard' ? (
                groupLeaderboard.length === 0 ? <p className="text-center text-gray-500 text-xs mt-10">No sessions logged yet.</p> : (
                  groupLeaderboard.map((user) => (
                    <div key={user.id} className={`flex items-center justify-between py-3 border-b border-white/5 px-2 rounded-xl ${user.isMe ? 'bg-indigo-950/20' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-mono font-bold w-5 text-center text-xs">{user.rank}</span>
                        <div className="w-8 h-8 rounded-full zenith-card bg-[#11151d] border border-white/[0.07] flex items-center justify-center font-bold text-xs relative">
                          {user.name.charAt(0).toUpperCase()}
                          {user.isGold && <span className="absolute -bottom-1 -right-1 text-[10px]">👑</span>}
                        </div>
                        <div><p className={`font-semibold text-xs ${user.isMe ? 'text-[#7c5cff]' : 'text-white'}`}>{user.name}</p>{user.isMe && <p className="text-[9px] text-gray-400">You</p>}</div>
                      </div>
                      <div className="font-mono font-semibold text-xs text-gray-200">{user.timeString}</div>
                    </div>
                  ))
                )
              ) : (
                <div className="flex flex-col gap-3 mt-4">
                  {liveFocusUsers.length === 0 ? <p className="text-center text-gray-500 text-xs mt-10">Nobody is focusing right now.</p> : (
                    liveFocusUsers.map(user => (
                      <div key={user.id} className="zenith-card bg-[#11151d] border border-white/[0.07] p-3.5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#7c5cff]/20 text-[#7c5cff] flex items-center justify-center font-bold text-xs">{user.username.charAt(0).toUpperCase()}</div>
                          <div><p className="font-semibold text-xs text-white">{user.username}</p><p className="text-[10px] text-[#7c5cff] font-medium">● Focusing right now</p></div>
                        </div>
                        <span className="text-[10px] bg-indigo-500/10 text-[#7c5cff] px-2.5 py-0.5 rounded-full font-semibold">Active</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {currentTab === 'blocks' && (
          <motion.div key="blocks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="pt-8 px-5 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-xl font-bold text-white">Blocks & Distractions</h1>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2.5 py-1 rounded-full border border-amber-500/20">PRO SHIELD</span>
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Block Distracting Feeds</h3>
            <div className="flex flex-col gap-3 mb-6">
              <div className="zenith-card bg-[#11151d]/90 backdrop-blur-xl border border-white/[0.07] rounded-[22px] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3"><span className="text-lg">▶</span><div><h4 className="font-bold text-xs text-white">YouTube Shorts</h4><p className="text-[10px] text-gray-400">Blocking active</p></div></div>
                <button onClick={() => setBlocksState(s => ({ ...s, youtubeShorts: !s.youtubeShorts }))} className={`w-12 h-6 rounded-full relative p-1 cursor-pointer ${blocksState.youtubeShorts ? 'bg-[#7c5cff]' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${blocksState.youtubeShorts ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Block Websites</h3>
            <div className="zenith-card bg-[#11151d]/90 backdrop-blur-xl border border-white/[0.07] rounded-[22px] p-4 shadow-xl mb-6">
              <div className="flex gap-2 mb-4">
                <input type="text" placeholder="e.g. reddit.com" value={newWebsiteBlocksInput} onChange={(e) => setNewWebsiteBlocksInput(e.target.value)} className="flex-1 zenith-input bg-[#090b10] text-white px-3 py-2.5 rounded-xl border border-white/[0.07] text-xs outline-none" />
                <button onClick={() => { if(newWebsiteBlocksInput.trim()) { setBlockedWebsites([...blockedWebsites, newWebsiteBlocksInput.trim()]); setNewWebsiteBlocksInput(''); } }} className="zenith-primary bg-[#7c5cff] text-white font-bold px-4 rounded-xl text-xs cursor-pointer">Add</button>
              </div>
              <div className="flex flex-col gap-2">
                {blockedWebsites.map((site, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#090b10] px-3 py-2.5 rounded-xl border border-white/[0.07]">
                    <span className="text-xs font-mono text-gray-300">{site}</span>
                    <button onClick={() => setBlockedWebsites(blockedWebsites.filter((_, i) => i !== idx))} className="text-red-400 text-xs cursor-pointer">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE GROUP MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 220 }} className="fixed inset-0 bg-[#090b10] z-[60] flex flex-col p-6 pt-10">
            <div className="flex justify-between items-center mb-6 max-w-md mx-auto w-full">
              <h2 className="text-base font-bold text-white">Create Group</h2>
              <button onClick={closeCreateModal} className="text-gray-400 text-lg cursor-pointer">×</button>
            </div>
            <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
              {createStep === 1 && (
                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-medium text-gray-400 mb-2">Group name</label>
                  <input type="text" placeholder="e.g. ICSE Victory 2027" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full bg-[#11151d] text-white p-4 rounded-2xl border border-white/[0.07] text-xs outline-none" autoFocus />
                  <div className="mt-auto mb-6"><button onClick={() => newGroupName.trim() && setCreateStep(2)} className="w-full bg-white text-black py-3.5 rounded-2xl font-bold text-xs cursor-pointer">Next</button></div>
                </div>
              )}
              {createStep === 2 && (
                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-medium text-gray-400 mb-3">Select category</label>
                  <div className="flex flex-col gap-2 overflow-y-auto max-h-[50vh]">
                    {availableCategories.map(cat => (
                      <div key={cat} onClick={() => setNewGroupCategory(cat)} className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer text-xs font-semibold ${newGroupCategory === cat ? 'bg-indigo-950/20 border-[#7c5cff]/50 text-white' : 'bg-[#11151d] border-white/5 text-gray-300'}`}>
                        <span>{cat}</span>
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${newGroupCategory === cat ? 'border-[#7c5cff]' : 'border-gray-600'}`}>{newGroupCategory === cat && <div className="w-1.5 h-1.5 rounded-full bg-[#7c5cff]"></div>}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto mb-6 pt-4"><button onClick={() => setCreateStep(3)} className="w-full bg-white text-black py-3.5 rounded-2xl font-bold text-xs cursor-pointer">Next</button></div>
                </div>
              )}
              {createStep === 3 && (
                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-medium text-gray-400 mb-3">Who can join?</label>
                  <div className="flex flex-col gap-3">
                    <div onClick={() => setNewGroupPrivacy('public')} className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center text-xs ${newGroupPrivacy === 'public' ? 'bg-indigo-950/20 border-[#7c5cff]/50 text-white' : 'bg-[#11151d] border-white/5 text-gray-300'}`}>
                      <div><p className="font-semibold">Public</p><p className="text-[10px] text-gray-400">Anyone can join</p></div>
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${newGroupPrivacy === 'public' ? 'border-[#7c5cff]' : 'border-gray-600'}`}>{newGroupPrivacy === 'public' && <div className="w-1.5 h-1.5 rounded-full bg-[#7c5cff]"></div>}</div>
                    </div>
                    <div onClick={() => setNewGroupPrivacy('private')} className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center text-xs ${newGroupPrivacy === 'private' ? 'bg-indigo-950/20 border-[#7c5cff]/50 text-white' : 'bg-[#11151d] border-white/5 text-gray-300'}`}>
                      <div><p className="font-semibold">Private</p><p className="text-[10px] text-gray-400">Invite only</p></div>
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${newGroupPrivacy === 'private' ? 'border-[#7c5cff]' : 'border-gray-600'}`}>{newGroupPrivacy === 'private' && <div className="w-1.5 h-1.5 rounded-full bg-[#7c5cff]"></div>}</div>
                    </div>
                  </div>
                  <div className="mt-auto mb-6 pt-4"><button onClick={handleCreateGroupSubmit} className="w-full zenith-primary bg-[#7c5cff] text-white py-3.5 rounded-2xl font-bold text-xs cursor-pointer">Create Group</button></div>
                </div>
              )}
              {createStep === 4 && justCreatedGroup && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <h3 className="text-lg font-bold mb-2">Invite your friends</h3>
                  <p className="text-xs text-gray-400 mb-6 font-mono bg-[#11151d] px-4 py-2 rounded-xl text-[#7c5cff] border border-white/[0.07]">Code: {justCreatedGroup.code}</p>
                  <button onClick={() => { navigator.clipboard.writeText(justCreatedGroup.code); alert('Copied!'); }} className="w-full bg-[#11151d] text-white py-3.5 rounded-2xl font-semibold text-xs mb-3 cursor-pointer">Copy Code</button>
                  <button onClick={closeCreateModal} className="w-full bg-white text-black py-3.5 rounded-2xl font-bold text-xs cursor-pointer">Done</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#090b10]/80 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="zenith-modal bg-[#11151d] border border-white/[0.09] p-6 rounded-[28px] w-full max-w-sm shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">Delete Arena?</h3>
              <p className="text-xs text-gray-400 mb-6">Are you sure you want to completely delete "{activeGroup?.name}"? This action cannot be undone and will remove all members from the arena.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer">Cancel</button>
                <button onClick={confirmDeleteGroup} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-red-500/20 cursor-pointer">Yes, Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEAVE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#090b10]/80 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="zenith-modal bg-[#11151d] border border-white/[0.09] p-6 rounded-[28px] w-full max-w-sm shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">Leave Arena?</h3>
              <p className="text-xs text-gray-400 mb-6">Are you sure you want to leave "{activeGroup?.name}"? You will need the invite code to join again.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer">Cancel</button>
                <button onClick={confirmLeaveGroup} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-red-500/20 cursor-pointer">Yes, Leave</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROFILE DASHBOARD MODAL */}
      <AnimatePresence>
        {showProfile && (
          <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 220 }} className="fixed inset-0 bg-[#090b10] z-[80] overflow-y-auto font-sans pb-20">
            <div className="bg-gradient-to-br from-[#7c5cff] via-[#6749e8] to-[#30236f] pt-8 pb-4 px-4 relative flex flex-col items-center justify-end h-52 shadow-[0_25px_70px_rgba(124,92,255,.25)]">
              <button onClick={() => setShowProfile(false)} className="absolute top-6 left-4 text-white text-xl cursor-pointer">←</button>
              <button onClick={() => setShowSettings(true)} className="absolute top-6 right-4 text-white text-lg cursor-pointer">⚙️</button>
              
              <div className="w-24 h-24 bg-white/20 rounded-t-full border-b-0 border-4 border-black relative overflow-hidden flex items-end justify-center -mb-4">
                 <span className="text-6xl mt-4">👨‍💻</span>
              </div>
            </div>

            <div className="px-6 pt-8 max-w-md mx-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  {isEditingName ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        value={editNameInput}
                        onChange={(e) => setEditNameInput(e.target.value)}
                        className="bg-[#11151d] text-white px-2 py-1 rounded border border-white/20 text-xl font-bold outline-none focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/10 w-48"
                        autoFocus
                      />
                      <button onClick={saveName} className="text-[#7c5cff] text-sm font-bold bg-indigo-500/10 px-2 py-1 rounded cursor-pointer hover:bg-indigo-500/20">Save</button>
                      <button onClick={() => setIsEditingName(false)} className="text-gray-400 text-sm bg-white/5 px-2 py-1 rounded cursor-pointer hover:bg-white/10">Cancel</button>
                    </div>
                  ) : (
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                      {username} 
                      <span onClick={() => { setEditNameInput(username); setIsEditingName(true); }} className="text-gray-400 text-sm cursor-pointer hover:text-white">✎</span>
                    </h2>
                  )}

                  <p className="text-xs text-gray-400">{session?.user?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Focusing since Sept, 2026</p>
                </div>
                
                {isPro && <span className="bg-[#eab308] text-black text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider">PRO</span>}
              </div>

              <h3 className="text-sm font-bold text-white mb-3">Overview</h3>
              <div className="zenith-card bg-[#11151d]/90 backdrop-blur-xl border border-white/[0.07] rounded-[22px] p-4 flex items-center gap-4 mb-8 shadow-lg">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-[#7c5cff]">⏳</div>
                <div>
                  <p className="text-[10px] text-gray-400">Total Time Focused</p>
                  <p className="text-lg font-bold text-white">{formatDashboardTime(totalLifetimeProgress)}</p>
                </div>
              </div>

              <div className="flex justify-between items-end mb-4">
                 <h3 className="text-sm font-bold text-white">Your Achievements</h3>
                 <button className="text-[#7c5cff] text-xs font-semibold cursor-pointer">View all</button>
              </div>
              <div className="flex gap-4 mb-8">
                 <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg shadow-indigo-500/20 mb-3 border border-white/[0.09]">
                       <span className="text-white font-black text-[10px] -rotate-12 italic tracking-tighter">
                         {Math.floor(totalLifetimeProgress / 3600) > 0 ? `${Math.floor(totalLifetimeProgress / 3600)}H FOCUS` : 'STARTER'}
                       </span>
                    </div>
                 </div>
              </div>

              <h3 className="text-sm font-bold text-white mb-3">Weekly Reports</h3>
              <div className="zenith-card bg-[#11151d]/90 backdrop-blur-xl border border-white/[0.07] rounded-[22px] p-8 flex items-center justify-center text-center shadow-lg">
                 <p className="text-xs text-gray-400 leading-relaxed">Your first weekly report will be available on<br/><span className="font-semibold text-white">Oct 05</span></p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACCOUNT SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 bg-[#090b10] z-[90] overflow-y-auto font-sans">
            <div className="flex justify-between items-center px-4 py-6 sticky top-0 bg-[#090b10] z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowSettings(false)} className="text-white text-xl cursor-pointer">←</button>
                <h2 className="text-lg font-bold text-white">Account Settings</h2>
              </div>
              <button className="bg-white/10 text-xs font-semibold px-3 py-1.5 rounded-full text-white flex items-center gap-1 border border-white/[0.07]">💬 Help</button>
            </div>

            <div className="px-4 pb-12 space-y-4 max-w-md mx-auto">
              <div className="zenith-card bg-[#11151d] rounded-2xl overflow-hidden flex flex-col border border-white/[0.07]">
                <SettingsRow icon="👑" title={isPro ? "Manage Subscription" : "Subscription"} onClick={() => setShowSubscription(true)} />
                <SettingsRow icon="✨" title="Add Widgets" badge="NEW" />
                <SettingsRow icon="🔊" title="Notification sound" />
                <SettingsRow icon="文" title="Language" />
              </div>
              
              <div className="zenith-card bg-[#11151d] rounded-2xl overflow-hidden flex flex-col border border-white/[0.07]">
                <SettingsRow icon="🚀" title="Our Mission" />
                <SettingsRow icon="🔒" title="Privacy Corner" />
                <SettingsRow icon="❤️" title="Wall of Love" />
              </div>

              <div className="zenith-card bg-[#11151d] rounded-2xl overflow-hidden flex flex-col border border-white/[0.07]">
                <SettingsRow icon="💬" title="Send Feedback" />
                <SettingsRow icon="📞" title="Talk to the Team" />
                <SettingsRow icon="🔗" title="Share Zenith with a friend" />
                <SettingsRow icon="⭐" title="Rate us on play store" />
              </div>

              <div className="zenith-card bg-[#11151d] rounded-2xl overflow-hidden flex flex-col border border-white/[0.07]">
                <SettingsRow icon="ℹ️" title="Legal" />
              </div>

              <div className="zenith-card bg-[#11151d] rounded-2xl overflow-hidden flex flex-col mt-4 border border-white/[0.07]">
                <button onClick={() => { supabase.auth.signOut(); setShowSettings(false); setShowProfile(false); }} className="w-full flex items-center justify-between p-4 bg-[#11151d] hover:bg-white/5 transition-colors cursor-pointer text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-lg w-6 text-center">🚪</span>
                    <span className="text-sm font-semibold text-white">Logout</span>
                  </div>
                  <span className="text-gray-500 text-lg">›</span>
                </button>
              </div>
              
              <p className="text-center text-[10px] text-gray-500 mt-6 pb-6 tracking-widest">VERSION 1.0.0</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUBSCRIPTION / PRO OFFER MODAL */}
      <AnimatePresence>
        {showSubscription && (
          <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 bg-[#090b10] z-[100] overflow-y-auto font-sans pb-10">
            
            <div className="flex justify-between items-center px-4 py-6 sticky top-0 bg-[#090b10] z-10 border-b border-white/5">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowSubscription(false)} className="text-white text-xl cursor-pointer">←</button>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">Zenith <span className="bg-[#eab308] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wider">PRO</span></h2>
              </div>
            </div>

            <div className="px-4 pt-6 max-w-md mx-auto space-y-6">
              
              {isPro ? (
                <div className="bg-[#eab308]/10 border border-[#eab308]/20 rounded-2xl p-5 text-center relative overflow-hidden">
                  <h3 className="text-[#eab308] font-black text-lg mb-2">You are a PRO Member</h3>
                  <p className="text-gray-300 text-xs mb-4">You have unlocked all premium features for a full year.</p>
                  <button className="w-full bg-[#11151d] border border-white/[0.09] text-white font-extrabold py-3.5 rounded-xl text-sm opacity-50 cursor-not-allowed mb-3">
                    Subscription Active
                  </button>
                  <button 
                    onClick={handleCancelSubscription}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer border border-red-500/20"
                  >
                    Cancel Subscription & Request Refund
                  </button>
                </div>
              ) : offerTimeLeft > 0 ? (
                <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-[#7c5cff]/30 rounded-2xl p-5 text-center relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#7c5cff]/20 rounded-full blur-xl"></div>
                  <h3 className="text-[#7c5cff] font-black text-lg mb-1">🔥 Founder's Offer Active</h3>
                  <p className="text-white font-mono text-xl mb-3">{formatOfferTime(offerTimeLeft)}</p>
                  <p className="text-gray-300 text-xs mb-4">Upgrade now and lock in the founder's price forever.</p>
                  <button onClick={() => setShowPaymentUI(true)} className="w-full zenith-primary bg-[#7c5cff] hover:bg-[#6847f5] shadow-[0_10px_30px_rgba(124,92,255,0.22)] transition-colors cursor-pointer text-white font-extrabold py-3.5 rounded-xl text-sm shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                    Get PRO for ₹99 / year
                  </button>
                  <p className="text-[10px] text-gray-500 mt-3 line-through">Regular price: ₹329 / year</p>
                </div>
              ) : (
                <div className="bg-[#11151d] border border-white/[0.09] rounded-2xl p-5 text-center relative overflow-hidden">
                  <h3 className="text-white font-black text-lg mb-2">Zenith PRO</h3>
                  <p className="text-gray-300 text-xs mb-4">Unlock all premium features to maximize your focus and block all distractions.</p>
                  <button onClick={() => setShowPaymentUI(true)} className="w-full bg-gradient-to-r from-white to-slate-200 hover:from-slate-100 hover:to-white transition-colors cursor-pointer text-black font-extrabold py-3.5 rounded-xl text-sm">
                    Get PRO for ₹329 / year
                  </button>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-white mb-4 px-2">Pro Features</h3>
                <div className="zenith-card bg-[#11151d] rounded-2xl border border-white/[0.07] overflow-hidden flex flex-col">
                  {[
                    { i: '⏳', t: 'Pomodoro Timer' },
                    { i: '🔒', t: 'Strict mode' },
                    { i: '📱', t: 'Block Shorts & Reels' },
                    { i: '📺', t: 'Block Distracting Channels' },
                    { i: '🌐', t: 'Block Distracting Sites' },
                    { i: '🔞', t: 'Block Adult Content' },
                    { i: '🛑', t: 'Strict block for Apps' },
                    { i: '🔕', t: 'Block Notifications' },
                    { i: '📅', t: 'Add Unlimited Schedules' },
                    { i: '🛡️', t: 'Uninstall Protection' },
                    { i: '🎵', t: 'Science-backed focus music' },
                    { i: '🎨', t: 'Premium themes' },
                    { i: '◨', t: 'Block Split Screen' },
                    { i: '🚫', t: 'Block Floating Window' }
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 border-b border-white/5 last:border-none">
                      <span className="text-xl w-6 text-center">{feat.i}</span>
                      <span className="text-sm font-semibold text-white">{feat.t}</span>
                      <span className="ml-auto text-gray-600">›</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RAZORPAY CHECKOUT UI OVERLAY */}
      <AnimatePresence>
        {showPaymentUI && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="zenith-modal w-full max-w-md bg-[#11151d] border-t sm:border border-white/[0.09] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Zenith Checkout</h3>
                <button onClick={() => !isProcessingPayment && setShowPaymentUI(false)} className="text-gray-400 text-xl cursor-pointer">×</button>
              </div>

              <div className="bg-[#090b10] border border-white/[0.07] rounded-2xl p-4 mb-6 text-center">
                <p className="text-xs text-gray-400 mb-1">Total Payable Amount</p>
                <p className="text-3xl font-black text-white">₹{currentPrice}</p>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Yearly Subscription (Razorpay Test Mode)</p>
              </div>

              {isProcessingPayment ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-white/10 border-t-[#7c5cff] rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-bold text-white animate-pulse">Opening Razorpay Checkout...</p>
                  <p className="text-xs text-gray-500 mt-2">Please complete payment in the popup window</p>
                </div>
              ) : (
                <>
                  <button onClick={handlePaymentSubmit} className="w-full zenith-primary bg-[#7c5cff] hover:bg-[#6847f5] shadow-[0_10px_30px_rgba(124,92,255,0.22)] transition-colors cursor-pointer text-white font-extrabold py-4 rounded-xl text-sm shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2">
                    🔒 Pay ₹{currentPrice} via Razorpay
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-4 left-6 right-6 z-50">
        <div className="zenith-nav bg-[#11151d]/80 backdrop-blur-2xl border border-white/[0.10] rounded-[28px] p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] flex justify-around items-center shadow-2xl max-w-sm mx-auto">
          <button onClick={() => { setCurrentTab('home'); setActiveGroup(null); }} className={`flex flex-col items-center py-2 px-5 rounded-2xl transition-all cursor-pointer ${currentTab === 'home' && !activeGroup ? 'bg-[#7c5cff]/12 text-[#a99cff] shadow-inner shadow-[#7c5cff]/10' : 'text-gray-400'}`}>
            <span className="text-base mb-0.5">⏳</span><span className="text-[10px] font-semibold">Focus</span>
          </button>
          <button onClick={() => { setCurrentTab('groups'); setActiveGroup(null); }} className={`flex flex-col items-center py-2 px-5 rounded-2xl transition-all cursor-pointer ${currentTab === 'groups' ? 'bg-[#7c5cff]/12 text-[#a99cff] shadow-inner shadow-[#7c5cff]/10' : 'text-gray-400'}`}>
            <span className="text-base mb-0.5">👥</span><span className="text-[10px] font-semibold">Groups</span>
          </button>
          <button onClick={() => { setCurrentTab('blocks'); setActiveGroup(null); }} className={`flex flex-col items-center py-2 px-5 rounded-2xl transition-all cursor-pointer ${currentTab === 'blocks' ? 'bg-[#7c5cff]/12 text-[#a99cff] shadow-inner shadow-[#7c5cff]/10' : 'text-gray-400'}`}>
            <span className="text-base mb-0.5">🛡️</span><span className="text-[10px] font-semibold">Blocks</span>
          </button>
        </div>
      </div>
    </div>
  );
}