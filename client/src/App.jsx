import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Eye, Play, Square, Trash2, Send, Clock, ShieldCheck, AlertCircle, RefreshCw, Plus, X, Terminal, Settings as SettingsIcon, Bell, Search, MapPin, DownloadCloud } from 'lucide-react';

const CourseCard = React.memo(({ course, onAdd, isWatched }) => {
  return (
    <div className={`p-4 rounded-xl border transition-all ${
        isWatched ? 'bg-feu-green/5 border-feu-green/30 opacity-80' : 
        course.remaining === 0 ? 'bg-red-50 border-red-200 shadow-sm' : 
        'bg-white border-neutral-200 shadow-sm hover:shadow-md'
      }`}>
      <div className="flex justify-between items-start mb-2">
         <div>
           <h3 className={`font-bold text-sm ${course.remaining === 0 ? 'text-red-700' : 'text-neutral-800'}`}>
             {course.course}
           </h3>
           <span className="inline-block px-2 py-0.5 bg-neutral-100 text-neutral-600 text-[10px] rounded font-bold mt-1 uppercase">
             {course.section}
           </span>
         </div>
         <div className="text-right">
            <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${course.remaining === 0 ? 'bg-red-200 text-red-800' : 'bg-green-100 text-green-700'}`}>
              {course.remaining} Left
            </span>
         </div>
      </div>

      <div className="flex justify-between items-end mt-4">
         <div className="grid grid-cols-1 gap-1 text-[10px] text-neutral-500 font-bold uppercase tracking-wide flex-1">
           <div className="flex items-center gap-1.5"><Clock size={12} /> {course.day} {course.time}</div>
           <div className="flex items-center gap-1.5"><MapPin size={12} /> {course.room}</div>
         </div>

         {!isWatched && (
           <button 
             onClick={() => onAdd(course.course, course.section)}
             className="ml-3 p-2 bg-feu-green/10 hover:bg-feu-green/20 text-feu-green rounded-lg transition-colors border border-feu-green/20"
             title="Add to Watchlist"
           >
             <Eye size={16} />
           </button>
         )}
      </div>
    </div>
  );
});

export default function App() {
  const [status, setStatus] = useState({ running: false, lastChecked: null, telegramConnected: false, watchList: [] });
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('slot_watcher_logs');
    return saved ? JSON.parse(saved).slice(0, 200) : [];
  });
  
  const [allCourses, setAllCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncingAuth, setIsSyncingAuth] = useState(false);
  const [isSyncingCourses, setIsSyncingCourses] = useState(false);
  
  // Settings (persisted to localStorage)
  const [activeTerm, setActiveTerm] = useState(() => localStorage.getItem('sw_term') || '3');
  const [activeYear, setActiveYear] = useState(() => localStorage.getItem('sw_year') || '20242025');
  const [intervalMin, setIntervalMin] = useState(() => localStorage.getItem('sw_interval') || '5');
  const [cooldown, setCooldown] = useState(() => localStorage.getItem('sw_cooldown') || '60');
  const [token, setToken] = useState(() => localStorage.getItem('sw_token') || '');
  const [chatId, setChatId] = useState(() => localStorage.getItem('sw_chatId') || '');

  const logsEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('sw_term', activeTerm);
    localStorage.setItem('sw_year', activeYear);
    localStorage.setItem('sw_interval', intervalMin);
    localStorage.setItem('sw_cooldown', cooldown);
    localStorage.setItem('sw_token', token);
    localStorage.setItem('sw_chatId', chatId);
    
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term: activeTerm, year: activeYear })
    }).catch(console.error);

  }, [activeTerm, activeYear, intervalMin, cooldown, token, chatId]);

  useEffect(() => {
    localStorage.setItem('slot_watcher_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    fetchStatus();
    fetchCourses();
  }, [activeTerm, activeYear]); // Refetch if term/year changes locally

  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      const newLog = JSON.parse(event.data);
      setLogs(prev => [newLog, ...prev].slice(0, 200));
      fetchStatus(); 
    };
    return () => eventSource.close();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      setStatus(await res.json());
    } catch (err) {}
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      setAllCourses(await res.json());
    } catch (err) {}
  };

  const toggleWatcher = async () => {
    try {
      await fetch(status.running ? '/api/stop' : '/api/start', { method: 'POST' });
      fetchStatus();
    } catch (err) {}
  };

  const handleAddWatch = async (course, section) => {
    try {
      await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course, section })
      });
      fetchStatus();
    } catch (err) {
      alert('Failed to add watch');
    }
  };

  const handleRemoveWatch = async (course, section) => {
    try {
      await fetch('/api/watch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course, section })
      });
      fetchStatus();
    } catch (err) {}
  };

  const handleSyncAuth = async () => {
    setIsSyncingAuth(true);
    try {
      const res = await fetch('/api/sync-auth', { method: 'POST' });
      if (res.ok) alert('Authentication Sync Started! Approve on your phone.');
      else alert('Failed to trigger sync');
    } catch (err) {
      alert('Sync error');
    } finally {
      setIsSyncingAuth(false);
    }
  };

  const handleSyncCourses = async () => {
    setIsSyncingCourses(true);
    try {
      const res = await fetch('/api/sync-courses', { method: 'POST' });
      if (res.ok) {
        alert('Course sync complete!');
        fetchCourses(); // Reload local list
      } else {
        alert('Failed to sync courses. Are you authenticated?');
      }
    } catch (err) {
      alert('Sync error');
    } finally {
      setIsSyncingCourses(false);
    }
  };

  const filteredCourses = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return allCourses
      .filter(c => c.term === activeTerm && c.schoolYear === activeYear)
      .filter(c => c.course.toLowerCase().includes(query) || c.section.toLowerCase().includes(query));
  }, [searchQuery, allCourses, activeTerm, activeYear]);

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc]">
      <header className="bg-feu-green text-white px-8 py-4 flex justify-between items-center shadow-lg z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl">
             <Eye size={24} className="text-feu-gold" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Slot Watcher</h1>
            <div className="flex items-center gap-2 text-[10px] font-bold opacity-80 uppercase tracking-widest">
               {status.running ? (
                 <><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Running</>
               ) : (
                 <><span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span> Stopped</>
               )}
               <span className="mx-1">•</span>
               Last checked: {status.lastChecked || 'Never'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border ${status.telegramConnected ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
              <Bell size={14} />
              Telegram: {status.telegramConnected ? 'Active' : 'Missing Config'}
           </div>
           <button 
             onClick={toggleWatcher}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-md active:scale-95 ${
               status.running ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
             }`}
           >
             {status.running ? <><Square size={16} fill="white" /> Stop Watcher</> : <><Play size={16} fill="white" /> Start Watcher</>}
           </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-6 flex gap-6 overflow-hidden">
        
        {/* Col 1: Available Courses (Sidebar) */}
        <div className="w-[300px] flex flex-col bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden shrink-0">
           <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
              <h2 className="font-black text-neutral-800 uppercase tracking-tight text-sm flex items-center gap-2">
                <Search size={18} className="text-feu-green" />
                Browse Courses
              </h2>
           </div>
           <div className="p-4 border-b border-neutral-100">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
               <input 
                 type="text" 
                 placeholder="Search by code or section..."
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-feu-green"
               />
             </div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredCourses.length === 0 ? (
                <div className="text-center py-10">
                   <p className="text-neutral-400 italic text-xs mb-4">No courses loaded for this term.</p>
                   <button 
                     onClick={handleSyncCourses}
                     disabled={isSyncingCourses}
                     className="px-4 py-2 bg-neutral-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2"
                   >
                     {isSyncingCourses ? <RefreshCw size={12} className="animate-spin" /> : <DownloadCloud size={12} />}
                     Fetch Records
                   </button>
                </div>
              ) : (
                filteredCourses.map(course => (
                  <CourseCard 
                    key={course.id} 
                    course={course} 
                    onAdd={handleAddWatch}
                    isWatched={status.watchList.some(w => w.course === course.course && w.section === course.section)}
                  />
                ))
              )}
           </div>
        </div>

        {/* Col 2: Watchlist */}
        <div className="w-[280px] flex flex-col bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden shrink-0">
           <div className="p-5 border-b border-neutral-100 flex justify-between items-center">
              <h2 className="font-black text-neutral-800 uppercase tracking-tight text-sm flex items-center gap-2">
                <Clock size={18} className="text-feu-green" />
                Watching ({status.watchList.length})
              </h2>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-neutral-50/50">
              {status.watchList.length === 0 ? (
                <div className="text-center py-10 text-neutral-400 italic text-sm">No sections being watched.</div>
              ) : (
                status.watchList.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm group relative">
                    <button 
                      onClick={() => handleRemoveWatch(item.course, item.section)}
                      className="absolute -top-2 -right-2 p-1.5 bg-white border border-neutral-100 text-red-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:border-red-200"
                    >
                       <X size={14} />
                    </button>
                    <div className="flex justify-between items-start mb-2">
                       <div className="font-black text-sm text-neutral-800">{item.course}</div>
                       <div className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-600 text-[10px] font-bold rounded uppercase">{item.section}</div>
                    </div>
                    <div className={`text-2xl font-black ${item.lastSlots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                       {item.lastSlots} Slots Left
                    </div>
                    <div className="text-[10px] text-neutral-400 font-bold mt-2 uppercase tracking-wide">
                       Last: {item.lastChecked || 'Waiting...'}
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>

        {/* Col 3: Activity Log & Settings */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Activity Log (Top Half) */}
            <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden min-h-0">
               <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-white z-10 shrink-0">
                  <h2 className="font-black text-neutral-800 uppercase tracking-tight text-sm flex items-center gap-2">
                    <Terminal size={18} className="text-feu-green" />
                    Activity Log
                  </h2>
                  <button onClick={() => setLogs([])} className="text-[10px] font-black uppercase text-neutral-400 hover:text-red-500 tracking-widest transition-colors">
                    Clear Log
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 bg-black/[0.02] custom-scrollbar flex flex-col-reverse">
                  <div ref={logsEndRef} />
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-4 mb-3 group">
                       <span className="text-[10px] font-mono text-neutral-400 w-16 shrink-0 pt-0.5">{log.timestamp}</span>
                       <div className={`text-xs font-bold px-2 py-0.5 rounded uppercase w-20 text-center select-none ${
                          log.color === 'red' ? 'bg-red-100 text-red-700' : 
                          log.color === 'green' ? 'bg-green-100 text-green-700' : 
                          log.color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-500'
                       }`}>
                          {log.type}
                       </div>
                       <span className={`text-xs font-medium ${log.color === 'red' ? 'text-red-600' : log.color === 'green' ? 'text-green-600 font-black' : 'text-neutral-600'}`}>
                          {log.message}
                       </span>
                    </div>
                  ))}
               </div>
            </div>

            {/* Settings (Bottom Half) */}
            <div className="h-[200px] flex bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden shrink-0 p-5 gap-8">
                <div className="flex-1">
                     <h2 className="font-black text-neutral-800 uppercase tracking-tight text-xs flex items-center gap-2 mb-4">
                        <SettingsIcon size={14} className="text-feu-green" /> Backend Configuration
                     </h2>
                     <div className="grid grid-cols-2 gap-8 w-2/3">
                        <div>
                         <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 block">Academic Period</label>
                         <div className="flex gap-2">
                            <select value={activeYear} onChange={e => setActiveYear(e.target.value)} className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs outline-none font-bold">
                              <option value="20242025">2024-2025</option>
                              <option value="20252026">2025-2026</option>
                            </select>
                            <select value={activeTerm} onChange={e => setActiveTerm(e.target.value)} className="w-24 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs outline-none font-bold">
                              <option value="1">Term 1</option>
                              <option value="2">Term 2</option>
                              <option value="3">Term 3</option>
                            </select>
                         </div>
                        </div>
                        <div>
                         <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 block">Interval</label>
                         <select value={intervalMin} onChange={e => setIntervalMin(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs outline-none font-bold">
                           <option value="1">1 Minute</option>
                           <option value="5">5 Minutes</option>
                           <option value="10">10 Minutes</option>
                           <option value="15">15 Minutes</option>
                           <option value="30">30 Minutes</option>
                         </select>
                        </div>
                     </div>
                </div>

             </div>
        </div>
      </main>
    </div>
  );
}
