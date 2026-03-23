import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Trash2, 
  X, LayoutGrid, Maximize2, AppWindow,
  ChevronLeft, ChevronRight, Folder as FolderIcon, 
  Command, Search, Minus, Palette, Database, Download, Upload,
  Cloud, RefreshCw, Key, Check, AlertCircle
} from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

const DYNAMIC_LAYOUTS = [
  { id: '1x1', name: '突出布局', slots: 1 },
  { id: '1-2-tb', name: '上下布局', slots: 3 },
  { id: '1-2-lr', name: '左右布局', slots: 3 },
  { id: '2x2', name: '满置布局', slots: 4 },
];

const THEMES = {
  'light-gray': { name: '淡灰', appBg: '#f2f2f7', itemBg: 'rgba(255,255,255,0.7)', blur: '30px' },
  'pure-white': { name: '纯白', appBg: '#ffffff', itemBg: 'rgba(255,255,255,1)', blur: '0px' },
  'beige':      { name: '米色', appBg: '#F5F5DC', itemBg: 'rgba(255,255,255,0.6)', blur: '30px' },
  'light-blue': { name: '淡蓝', appBg: '#E6F0FA', itemBg: 'rgba(255,255,255,0.6)', blur: '30px' },
  'light-green':{ name: '淡绿', appBg: '#E8F5E9', itemBg: 'rgba(255,255,255,0.6)', blur: '30px' },
  'transparent':{ name: '透明玻璃', appBg: 'linear-gradient(135deg, #d2dbe6, #e6e6ee, #dcd2e6)', itemBg: 'rgba(255,255,255,0.15)', blur: '8px' },
  'frosted':    { name: '毛玻璃', appBg: 'linear-gradient(135deg, #e0eaf5, #f0f0f5, #e8e0f5)', itemBg: 'rgba(255,255,255,0.4)', blur: '40px' },
};

const getGlassStyle = (themeObj, overrides = {}) => ({
  background: themeObj.itemBg,
  backdropFilter: `blur(${themeObj.blur})`,
  WebkitBackdropFilter: `blur(${themeObj.blur})`,
  ...overrides
});

const getFaviconUrl = (url) => {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; }
  catch { return null; }
};

const MOBILE_THEME_CYCLE = ['light-gray', 'beige', 'light-green'];

export default function App() {
  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem('cyberspace_bookmarks_apple');
    if (saved) return JSON.parse(saved).map((f, i) => ({
      ...f, gridIdx: f.gridIdx ?? i,
      links: (f.links || []).map(l => ({ ...l, clickCount: l.clickCount ?? 0 }))
    }));
    return [
      { id: generateId(), title: '知识图谱', x: 80, y: 150, w: 320, h: 420, z: 1, inCanvas: true, gridIdx: 0, links: [{ id: generateId(), label: 'Apple', url: 'https://apple.com', clickCount: 0 }] },
      { id: generateId(), title: '核心工具', x: 450, y: 150, w: 320, h: 420, z: 2, inCanvas: true, gridIdx: 1, links: [] },
    ];
  });

  const [themeId, setThemeId] = useState(() => localStorage.getItem('cyberspace_theme') || 'light-gray');
  const currentTheme = THEMES[themeId];
  const [viewMode, setViewMode] = useState('canvas');
  const [maxZ, setMaxZ] = useState(10);
  const [capsuleExpanded, setCapsuleExpanded] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [dynamicOpen, setDynamicOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);
  const timers = useRef({ global: null, console: null, dynamic: null, theme: null, data: null });
  const wrapperRef = useRef(null);

  const [iosPage, setIosPage] = useState(0);
  const [iosActiveFolder, setIosActiveFolder] = useState(null);
  const [activeLayout, setActiveLayout] = useState(DYNAMIC_LAYOUTS[2]);
  const [slotAssignments, setSlotAssignments] = useState({});
  const [splitRatios, setSplitRatios] = useState({ '1-2-tb': { y: 50, x: 50 }, '1-2-lr': { x: 50, y: 50 }, '2x2': { x: 50, y: 50 } });

  // Cloud sync state
  const [gistToken, setGistToken] = useState(() => localStorage.getItem('cyberspace_gist_token') || '');
  const [gistId, setGistId] = useState(() => localStorage.getItem('cyberspace_gist_id') || '');
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | pushing | pulling | success | error
  const [showTokenSetup, setShowTokenSetup] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [gistIdInput, setGistIdInput] = useState(''); 

  const [isMobile, setIsMobile] = useState(false);
  const [pinnedMenu, setPinnedMenu] = useState(null); // 新增：记录当前被“固定”的菜单
  const showTokenSetupRef = useRef(showTokenSetup);

  useEffect(() => { showTokenSetupRef.current = showTokenSetup; }, [showTokenSetup]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const closeAllDropdowns = () => { 
    setConsoleOpen(false); setDynamicOpen(false); setThemeOpen(false); setDataOpen(false); 
    setSearchQuery(''); setPinnedMenu(null); setShowTokenSetup(false);
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCapsuleExpanded(true); setConsoleOpen(true); setPinnedMenu('console');
        setDynamicOpen(false); setThemeOpen(false); setDataOpen(false);
        setTimeout(() => searchRef.current?.focus(), 100);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const h = (e) => { 
        if (wrapperRef.current && !wrapperRef.current.contains(e.target)) { 
            closeAllDropdowns();
        } 
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, []);

  useEffect(() => { localStorage.setItem('cyberspace_bookmarks_apple', JSON.stringify(folders)); }, [folders]);
  useEffect(() => { localStorage.setItem('cyberspace_theme', themeId); }, [themeId]);

  const handleGlobalEnter = () => { if(isMobile) return; clearTimeout(timers.current.global); setCapsuleExpanded(true); };
  const handleGlobalLeave = () => { 
    if(isMobile) return; 
    timers.current.global = setTimeout(() => { 
      // 只要有菜单被固定，或者正在设置Token/搜索，就阻止全局收起
      if (pinnedMenu || showTokenSetupRef.current || (searchRef.current && searchRef.current === document.activeElement)) return;
      setCapsuleExpanded(false); closeAllDropdowns(); 
    }, 400); 
  };

  const handleConsoleEnter = () => { if(isMobile) return; clearTimeout(timers.current.console); setConsoleOpen(true); setDynamicOpen(false); setThemeOpen(false); setDataOpen(false); };
  const handleConsoleLeave = () => { 
    if(isMobile) return; 
    timers.current.console = setTimeout(() => { 
      if (pinnedMenu === 'console' || (searchRef.current && searchRef.current === document.activeElement)) return;
      setConsoleOpen(false); setSearchQuery(''); 
    }, 250); 
  };

  const handleDynamicEnter = () => { if(isMobile) return; clearTimeout(timers.current.dynamic); setDynamicOpen(true); setConsoleOpen(false); setThemeOpen(false); setDataOpen(false); };
  const handleDynamicLeave = () => { 
    if(isMobile) return; 
    timers.current.dynamic = setTimeout(() => { 
      if (pinnedMenu === 'dynamic') return;
      setDynamicOpen(false); 
    }, 250); 
  };

  const handleThemeEnter = () => { if(isMobile) return; clearTimeout(timers.current.theme); setThemeOpen(true); setConsoleOpen(false); setDynamicOpen(false); setDataOpen(false); };
  const handleThemeLeave = () => { 
    if(isMobile) return; 
    timers.current.theme = setTimeout(() => { 
      if (pinnedMenu === 'theme') return;
      setThemeOpen(false); 
    }, 250); 
  };

  const handleDataEnter = () => { if(isMobile) return; clearTimeout(timers.current.data); setDataOpen(true); setConsoleOpen(false); setDynamicOpen(false); setThemeOpen(false); };
  const handleDataLeave = () => { 
    if(isMobile) return; 
    timers.current.data = setTimeout(() => { 
      if (pinnedMenu === 'data' || showTokenSetupRef.current) return;
      setDataOpen(false); 
    }, 250); 
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Gist ID 已复制，可通过微信发给手机粘贴');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); alert('Gist ID 已复制，可通过微信发给手机粘贴'); }
      catch (e) { alert('复制失败，请手动复制: ' + text); }
      document.body.removeChild(ta);
    }
  };

  const cycleMobileTheme = () => {
    setThemeId(prev => {
      const idx = MOBILE_THEME_CYCLE.indexOf(prev);
      return MOBILE_THEME_CYCLE[(idx + 1) % MOBILE_THEME_CYCLE.length];
    });
  };

  const addFolder = () => {
    if (isMobile && folders.filter(f => f.inCanvas).length >= 4) {
      alert('手机端空间有限，最多只能展示 4 个核心文件夹。请先关闭一些文件夹再新建。');
      return;
    }
    const nf = { id: generateId(), title: '新枢纽核心', x: window.innerWidth / 2 - 160 + (Math.random() * 40 - 20), y: window.innerHeight / 2 - 200 + (Math.random() * 40 - 20), w: 320, h: 420, z: maxZ + 1, inCanvas: true, gridIdx: folders.length, links: [] };
    setMaxZ(maxZ + 1); setFolders([...folders, nf]);
  };
  const updateFolder = (id, updates) => setFolders(folders.map(f => f.id === id ? { ...f, ...updates } : f));
  const bringToFront = (id) => { setMaxZ(prev => prev + 1); updateFolder(id, { z: maxZ + 1 }); };
  const deleteFolder = (id) => {
    setFolders(folders.filter(f => f.id !== id));
    if (iosActiveFolder?.id === id) setIosActiveFolder(null);
    const ns = { ...slotAssignments }; Object.keys(ns).forEach(k => { if (ns[k] === id) delete ns[k] }); setSlotAssignments(ns);
  };

  const handleLinkClick = useCallback((folderId, linkId) => {
    setFolders(prev => prev.map(f => f.id !== folderId ? f : { ...f, links: f.links.map(l => l.id === linkId ? { ...l, clickCount: (l.clickCount || 0) + 1 } : l) }));
  }, []);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ folders, themeId, slotAssignments, splitRatios }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cyberspace-bookmarks.json'; a.click();
    setDataOpen(false); setCapsuleExpanded(false);
  };
  const handleImport = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const d = JSON.parse(ev.target.result);
          if (d.folders) setFolders(d.folders.map((f, i) => ({ ...f, gridIdx: f.gridIdx ?? i, links: (f.links || []).map(l => ({ ...l, clickCount: l.clickCount ?? 0 })) })));
          if (d.themeId && THEMES[d.themeId]) setThemeId(d.themeId);
          if (d.slotAssignments) setSlotAssignments(d.slotAssignments);
          if (d.splitRatios) setSplitRatios(d.splitRatios);
        } catch { alert('文件解析失败'); }
      };
      reader.readAsText(file);
    };
    input.click(); setDataOpen(false); setCapsuleExpanded(false);
  };

  const saveToken = (token, id) => {
    setGistToken(token); localStorage.setItem('cyberspace_gist_token', token);
    if (id) { setGistId(id); localStorage.setItem('cyberspace_gist_id', id); } 
    else { setGistId(''); localStorage.removeItem('cyberspace_gist_id'); }
    setShowTokenSetup(false); setTokenInput(''); setGistIdInput('');
  };
  const clearToken = () => {
    setGistToken(''); setGistId('');
    localStorage.removeItem('cyberspace_gist_token');
    localStorage.removeItem('cyberspace_gist_id');
  };

  const handleCloudPush = async () => {
    if (!gistToken) { setShowTokenSetup(true); return; }
    setSyncStatus('pushing');
    const payload = JSON.stringify({ folders, themeId, slotAssignments, splitRatios }, null, 2);
    const fileContent = { 'cyberspace-bookmarks.json': { content: payload } };
    try {
      let res;
      if (gistId) {
        res = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: 'PATCH', headers: { Authorization: `token ${gistToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: fileContent })
        });
      } else {
        res = await fetch('https://api.github.com/gists', {
          method: 'POST', headers: { Authorization: `token ${gistToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'Cyberspace Bookmarks Sync', public: false, files: fileContent })
        });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!gistId) { setGistId(data.id); localStorage.setItem('cyberspace_gist_id', data.id); }
      setSyncStatus('success'); setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      console.error('Cloud push failed:', err);
      setSyncStatus('error'); setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleCloudPull = async () => {
    if (!gistToken || !gistId) { setShowTokenSetup(true); return; }
    setSyncStatus('pulling');
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: { Authorization: `token ${gistToken}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const content = data.files['cyberspace-bookmarks.json']?.content;
      if (!content) throw new Error('No data found');
      const d = JSON.parse(content);
      if (d.folders) setFolders(d.folders.map((f, i) => ({ ...f, gridIdx: f.gridIdx ?? i, links: (f.links || []).map(l => ({ ...l, clickCount: l.clickCount ?? 0 })) })));
      if (d.themeId && THEMES[d.themeId]) setThemeId(d.themeId);
      if (d.slotAssignments) setSlotAssignments(d.slotAssignments);
      if (d.splitRatios) setSplitRatios(d.splitRatios);
      setSyncStatus('success'); setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      console.error('Cloud pull failed:', err);
      setSyncStatus('error'); setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleCanvasDrop = (e) => {
    e.preventDefault(); const id = e.dataTransfer.getData('console_folder');
    if (id) { setMaxZ(maxZ + 1); updateFolder(id, { inCanvas: true, x: e.clientX - 160, y: e.clientY - 20, z: maxZ + 1 }); }
  };

  const handleConsoleDeploy = (folder) => {
    if (isMobile) {
      if (!folder.inCanvas && folders.filter(f => f.inCanvas).length >= 4) {
        alert('手机端空间有限，最多只能展示 4 个核心文件夹。请先关闭桌面上的部分文件夹。');
        return;
      }
      updateFolder(folder.id, { inCanvas: true });
    } else {
      if (viewMode === 'canvas') { updateFolder(folder.id, { inCanvas: true, z: maxZ + 1 }); setMaxZ(maxZ + 1); }
      else if (viewMode === 'ios') { setIosPage(Math.floor(folder.gridIdx / 12)); setIosActiveFolder(folder); }
    }
    setConsoleOpen(false); setCapsuleExpanded(false); setSearchQuery('');
  };

  const filteredFolders = searchQuery.trim()
    ? folders.filter(f => {
        const q = searchQuery.toLowerCase();
        return f.title.toLowerCase().includes(q) || f.links.some(l => l.label.toLowerCase().includes(q) || l.url.toLowerCase().includes(q));
      })
    : folders;

  return (
    <div className="relative w-full h-screen overflow-hidden text-[#1d1d1f] selection:bg-[#007AFF]/30 font-apple tracking-tight transition-all duration-[800ms] ease-apple" style={{ background: currentTheme.appBg }}>
      <div ref={wrapperRef} className={`fixed z-[10000] flex flex-col items-center ${isMobile ? 'top-4 w-[95vw] left-1/2 -translate-x-1/2' : 'top-4 left-1/2 -translate-x-1/2'}`} onMouseEnter={handleGlobalEnter} onMouseLeave={handleGlobalLeave}>
        
        {isMobile ? (
          <div className="border border-black/5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex items-center p-1.5 rounded-full transition-all duration-700 ease-apple gap-1.5 relative z-20 flex-wrap justify-center w-full" style={getGlassStyle(currentTheme)}>
            <CapsuleBtn icon={<Search size={18}/>} text="库" active={consoleOpen} expanded={true} onClick={() => { if(consoleOpen){setConsoleOpen(false);} else {setConsoleOpen(true); setDataOpen(false);} }} />
            <div className="w-px h-5 bg-black/10 mx-0.5" />
            <CapsuleBtn icon={<Cloud size={18}/>} text="云" active={dataOpen} expanded={true} onClick={() => { if(dataOpen){setDataOpen(false); setShowTokenSetup(false);} else {setDataOpen(true); setConsoleOpen(false);} }} />
            <div className="w-px h-5 bg-black/10 mx-0.5" />
            <CapsuleBtn icon={<Palette size={18}/>} text="外观" expanded={true} onClick={cycleMobileTheme} />
            <div className="w-px h-5 bg-black/10 mx-0.5" />
            <CapsuleBtn icon={<Plus size={18}/>} text="新建" isPrimary expanded={true} onClick={addFolder} />
          </div>
        ) : (
          <div className="border border-black/5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex items-center p-1.5 rounded-full transition-all duration-700 ease-apple gap-1.5 relative z-20 flex-wrap justify-center" style={getGlassStyle(currentTheme)}>
            <CapsuleBtn icon={<Search size={18}/>} text="库" active={consoleOpen || pinnedMenu === 'console'} onMouseEnter={handleConsoleEnter} onMouseLeave={handleConsoleLeave} expanded={capsuleExpanded} onClick={() => { if(pinnedMenu === 'console'){setPinnedMenu(null); setConsoleOpen(false);} else {setPinnedMenu('console'); setConsoleOpen(true); setTimeout(() => searchRef.current?.focus(), 100);} }} />
            <div className="w-px h-5 bg-black/10 mx-0.5" />
            <CapsuleBtn icon={<Maximize2 size={18}/>} text="画布" active={viewMode === 'canvas'} onClick={() => setViewMode('canvas')} expanded={capsuleExpanded} />
            <CapsuleBtn icon={<AppWindow size={18}/>} text="应用" active={viewMode === 'ios'} onClick={() => setViewMode('ios')} expanded={capsuleExpanded} />
            <CapsuleBtn icon={<LayoutGrid size={18}/>} text="工作区" active={viewMode === 'dynamic'} onClick={() => { setViewMode('dynamic'); if(pinnedMenu==='dynamic'){setPinnedMenu(null); setDynamicOpen(false);} else {setPinnedMenu('dynamic'); setDynamicOpen(true);} }} onMouseEnter={handleDynamicEnter} onMouseLeave={handleDynamicLeave} expanded={capsuleExpanded} />
            <div className="w-px h-5 bg-black/10 mx-0.5" />
            <CapsuleBtn icon={<Palette size={18}/>} text="外观" active={themeOpen || pinnedMenu === 'theme'} onClick={() => { if(pinnedMenu==='theme'){setPinnedMenu(null); setThemeOpen(false);} else {setPinnedMenu('theme'); setThemeOpen(true);} }} onMouseEnter={handleThemeEnter} onMouseLeave={handleThemeLeave} expanded={capsuleExpanded} />
            <CapsuleBtn icon={<Database size={18}/>} text="数据" active={dataOpen || pinnedMenu === 'data'} onClick={() => { if(pinnedMenu==='data'){setPinnedMenu(null); setDataOpen(false); setShowTokenSetup(false);} else {setPinnedMenu('data'); setDataOpen(true);} }} onMouseEnter={handleDataEnter} onMouseLeave={handleDataLeave} expanded={capsuleExpanded} />
            <div className="w-px h-5 bg-black/10 mx-0.5" />
            <CapsuleBtn icon={<Plus size={18}/>} text="新建" isPrimary onClick={addFolder} expanded={capsuleExpanded} />
          </div>
        )}

        <div onMouseEnter={handleConsoleEnter} onMouseLeave={handleConsoleLeave} className={`absolute top-full left-1/2 -translate-x-1/2 pt-3 ${isMobile ? 'w-[95vw]' : 'w-[340px]'} transition-all duration-500 ease-apple z-10 ${consoleOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <div className="border border-black/5 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[60vh] transition-all duration-700" style={getGlassStyle(currentTheme)}>
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-black/[0.04] rounded-xl border border-black/5 focus-within:border-[#007AFF] focus-within:bg-white transition-colors">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input ref={searchRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={isMobile ? '搜索书签和文件夹…' : '搜索书签和文件夹… ⌘K'} className="flex-1 bg-transparent text-[13px] font-medium outline-none text-[#1d1d1f] placeholder:text-slate-400" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={14} /></button>}
              </div>
            </div>
            <div className="flex justify-between items-center px-5 py-2 border-b border-black/5 bg-black/[0.03]">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-2"><Command size={14}/> {searchQuery ? `${filteredFolders.length} 个结果` : `核心资源拓扑 (${folders.length})`}</span>
            </div>
            <div className="overflow-y-auto p-2 custom-scrollbar flex-1">
              {filteredFolders.length === 0 && <p className="text-slate-400 text-xs p-6 text-center">{searchQuery ? '无匹配结果' : '暂无文件夹'}</p>}
              <div className="flex flex-col gap-1">
                {filteredFolders.map(f => (
                  <div key={f.id} draggable={!isMobile && viewMode === 'canvas'} onDragStart={(e) => e.dataTransfer.setData('console_folder', f.id)} onClick={() => handleConsoleDeploy(f)} className={`w-full flex items-center justify-between p-3 hover:bg-black/5 rounded-xl transition-all duration-300 group ${!isMobile && viewMode === 'canvas' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}>
                    <div className="flex items-center gap-3">
                      <FolderIcon size={18} className="text-[#007AFF] shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-medium text-[15px] text-[#1d1d1f] truncate max-w-[150px]">{f.title}</span>
                        {searchQuery && f.links.some(l => l.label.toLowerCase().includes(searchQuery.toLowerCase()) || l.url.toLowerCase().includes(searchQuery.toLowerCase())) && (
                          <span className="text-[11px] text-slate-400 truncate max-w-[150px]">含: {f.links.filter(l => l.label.toLowerCase().includes(searchQuery.toLowerCase()) || l.url.toLowerCase().includes(searchQuery.toLowerCase())).map(l => l.label).join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.inCanvas && (isMobile || viewMode === 'canvas') && <span className="text-[10px] font-medium px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full">已部署</span>}
                      <button onClick={(e) => { e.stopPropagation(); deleteFolder(f.id); }} className={`p-1.5 ${isMobile ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all`}><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {!isMobile && (
          <>
            <div onMouseEnter={handleDynamicEnter} onMouseLeave={handleDynamicLeave} className={`absolute top-full left-1/2 -translate-x-1/2 pt-3 transition-all duration-500 ease-apple z-10 w-max ${dynamicOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
              <div className="border border-black/5 p-1.5 rounded-full flex gap-1 shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-all duration-700" style={getGlassStyle(currentTheme)}>
                {DYNAMIC_LAYOUTS.map(layout => (
                  <button key={layout.id} onClick={() => setActiveLayout(layout)} className={`px-4 py-1.5 text-[13px] font-medium whitespace-nowrap rounded-full transition-colors duration-300 ${activeLayout.id === layout.id ? 'bg-[#1d1d1f] text-white shadow-md' : 'text-slate-600 hover:text-black hover:bg-black/5'}`}>{layout.name}</button>
                ))}
              </div>
            </div>

            <div onMouseEnter={handleThemeEnter} onMouseLeave={handleThemeLeave} className={`absolute top-full left-1/2 -translate-x-1/2 pt-3 transition-all duration-500 ease-apple z-10 w-max ${themeOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
              <div className="border border-black/5 p-1.5 rounded-full flex gap-1 shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-all duration-700 flex-wrap justify-center max-w-[90vw]" style={getGlassStyle(currentTheme)}>
                {Object.entries(THEMES).map(([id, t]) => (
                  <button key={id} onClick={() => setThemeId(id)} className={`px-4 py-1.5 text-[13px] font-medium whitespace-nowrap rounded-full transition-colors duration-300 ${themeId === id ? 'bg-[#1d1d1f] text-white shadow-md' : 'text-slate-600 hover:text-black hover:bg-black/5'}`}>{t.name}</button>
                ))}
              </div>
            </div>
          </>
        )}

        <div onMouseEnter={handleDataEnter} onMouseLeave={handleDataLeave} className={`absolute top-full left-1/2 -translate-x-1/2 pt-3 transition-all duration-500 ease-apple z-10 w-max max-w-[95vw] ${dataOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <div className="border border-black/5 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-all duration-700 overflow-hidden" style={getGlassStyle(currentTheme, { background: 'rgba(255,255,255,0.92)' })}>
            {showTokenSetup ? (
              <div className="p-4 w-[320px] max-w-[90vw] flex flex-col gap-3 animate-pop-in">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#1d1d1f] flex items-center gap-2"><Key size={14}/> 云端中枢配置</span>
                  <button onClick={() => setShowTokenSetup(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-500">1. GitHub Token (必备)</label>
                  <input value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" className="w-full bg-black/[0.04] px-3 py-2 rounded-[10px] text-[12px] font-mono border border-black/10 focus:border-[#007AFF] focus:bg-white outline-none transition-colors text-black" />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-end">
                    <label className="text-[11px] font-semibold text-slate-500">2. Gist ID (跨设备拉取需填)</label>
                    {gistId && (
                      <button onClick={() => copyToClipboard(gistId)} className="text-[10px] text-[#007AFF] hover:underline bg-[#007AFF]/10 px-1.5 py-0.5 rounded">复制当前 ID</button>
                    )}
                  </div>
                  <input value={gistIdInput} onChange={e => setGistIdInput(e.target.value)} placeholder="留空则在首次上传时自动生成" className="w-full bg-black/[0.04] px-3 py-2 rounded-[10px] text-[12px] font-mono border border-black/10 focus:border-[#007AFF] focus:bg-white outline-none transition-colors text-black" />
                </div>

                <div className="flex gap-2 mt-1">
                  {gistToken && <button onClick={clearToken} className="px-3 py-1.5 text-[12px] font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">断开</button>}
                  <button onClick={() => saveToken(tokenInput.trim(), gistIdInput.trim())} disabled={!tokenInput.trim()} className="flex-1 px-3 py-1.5 bg-[#007AFF] hover:bg-[#0066d6] disabled:opacity-30 text-white rounded-lg text-[12px] font-semibold transition-all">保存配置</button>
                </div>
              </div>
            ) : (
              <div className="p-1.5 flex flex-col gap-1">
                <div className="flex gap-1">
                  <button onClick={handleCloudPush} disabled={syncStatus === 'pushing' || syncStatus === 'pulling'} className="flex-1 px-4 py-2 text-[13px] font-medium whitespace-nowrap rounded-lg text-slate-600 hover:text-black hover:bg-black/5 transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-40">
                    {syncStatus === 'pushing' ? <RefreshCw size={14} className="animate-spin"/> : <Cloud size={14}/>} 上传云端
                  </button>
                  <button onClick={handleCloudPull} disabled={syncStatus === 'pushing' || syncStatus === 'pulling' || !gistId} className="flex-1 px-4 py-2 text-[13px] font-medium whitespace-nowrap rounded-lg text-slate-600 hover:text-black hover:bg-black/5 transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-40">
                    {syncStatus === 'pulling' ? <RefreshCw size={14} className="animate-spin"/> : <Download size={14}/>} 拉取云端
                  </button>
                </div>
                {!isMobile && (
                  <div className="flex gap-1">
                    <button onClick={handleExport} className="flex-1 px-4 py-1.5 text-[12px] font-medium whitespace-nowrap rounded-lg text-slate-500 hover:text-black hover:bg-black/5 transition-colors duration-300 flex items-center justify-center gap-2"><Download size={13}/> 导出文件</button>
                    <button onClick={handleImport} className="flex-1 px-4 py-1.5 text-[12px] font-medium whitespace-nowrap rounded-lg text-slate-500 hover:text-black hover:bg-black/5 transition-colors duration-300 flex items-center justify-center gap-2"><Upload size={13}/> 导入文件</button>
                  </div>
                )}
                <div className="flex items-center justify-between px-3 py-1.5 border-t border-black/5 mt-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    {syncStatus === 'success' && <><Check size={12} className="text-green-500"/> 同步成功</>}
                    {syncStatus === 'error' && <><AlertCircle size={12} className="text-red-500"/> 同步失败</>}
                    {syncStatus === 'idle' && (gistToken ? <><Check size={12} className="text-green-500"/> Token 已配置</> : '未配置云同步')}
                  </span>
                  <button onClick={() => { setTokenInput(gistToken); setGistIdInput(gistId); setShowTokenSetup(true); }} className="text-[11px] text-[#007AFF] font-medium hover:underline"><Key size={11} className="inline mr-1"/>设置密钥</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`w-full h-full relative ${isMobile ? 'pt-20' : 'pt-20'}`} onDragOver={(e) => { if (!isMobile && viewMode === 'canvas') e.preventDefault(); }} onDrop={(e) => { if (!isMobile && viewMode === 'canvas') handleCanvasDrop(e); }}>
        {isMobile ? (
          <MobileGridView folders={folders} updateFolder={updateFolder} theme={currentTheme} onLinkClick={handleLinkClick} />
        ) : (
          <>
            {viewMode === 'canvas' && <CanvasView folders={folders.filter(f => f.inCanvas)} updateFolder={updateFolder} bringToFront={bringToFront} theme={currentTheme} onLinkClick={handleLinkClick} />}
            {viewMode === 'ios' && <IosGridView folders={folders} setFolders={setFolders} updateFolder={updateFolder} iosPage={iosPage} setIosPage={setIosPage} activeFolder={iosActiveFolder} setActiveFolder={setIosActiveFolder} theme={currentTheme} onLinkClick={handleLinkClick} />}
            {viewMode === 'dynamic' && <DynamicView folders={folders} updateFolder={updateFolder} activeLayout={activeLayout} slotAssignments={slotAssignments} setSlotAssignments={setSlotAssignments} splitRatios={splitRatios} setSplitRatios={setSplitRatios} theme={currentTheme} onLinkClick={handleLinkClick} />}
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .font-apple { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif; }
        .ease-apple { transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1); }
        @keyframes pop-in { 0% { opacity: 0; transform: scale(0.97) translateY(8px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes pop-out { 0% { opacity: 1; transform: scale(1) translateY(0); } 100% { opacity: 0; transform: scale(0.97) translateY(8px); } }
        .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-pop-out { animation: pop-out 0.15s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(0,0,0,0.3); }
        @media (max-width: 768px) { .custom-scrollbar::-webkit-scrollbar { display: none; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}

function CapsuleBtn({ active, isPrimary, icon, text, expanded, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <button onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      className={`relative flex items-center justify-center rounded-full transition-all duration-700 ease-apple z-0 hover:z-10 hover:scale-[1.03] ${
        isPrimary ? 'bg-[#007AFF] text-white hover:bg-[#0066d6] shadow-[0_2px_10px_rgba(0,122,255,0.2)]' :
        active ? 'bg-black/[0.08] text-[#007AFF] shadow-sm border border-black/5' :
        'text-slate-600 hover:text-[#1d1d1f] hover:bg-black/5 hover:shadow-sm'
      } ${expanded ? 'px-4 py-2' : 'w-10 h-10'}`}>
      <div className="shrink-0">{icon}</div>
      <div className={`flex items-center transition-all duration-700 ease-apple overflow-hidden ${expanded ? 'max-w-[100px] opacity-100 ml-2.5' : 'max-w-0 opacity-0 ml-0'}`}>
        <span className="text-[14px] font-semibold whitespace-nowrap">{text}</span>
      </div>
    </button>
  );
}

function MobileGridView({ folders, updateFolder, theme, onLinkClick }) {
  const activeFolders = folders.filter(f => f.inCanvas).slice(0, 4);

  return (
    <div className="w-full h-full overflow-y-auto p-4 pb-12 grid grid-cols-1 sm:grid-cols-2 gap-4 align-top content-start custom-scrollbar">
      {activeFolders.length === 0 && (
        <div className="col-span-1 sm:col-span-2 text-center text-slate-500 mt-20 text-sm font-medium">
          桌面非常干净。<br/><br/>请点击顶部「库」打开核心文件夹，或点击「新建」。
        </div>
      )}
      {activeFolders.map(folder => (
        <div key={folder.id} className="w-full rounded-[24px] shadow-[0_15px_35px_-10px_rgba(0,0,0,0.15)] border border-black/5 flex flex-col overflow-hidden transition-all duration-500 ease-apple" style={{ ...getGlassStyle(theme), height: '360px' }}>
          <div className="flex items-center justify-between p-4 bg-black/5 shrink-0 border-b border-black/5">
            <div className="flex items-center gap-2 font-semibold text-[#1d1d1f] text-[15px]">
              <FolderIcon size={18} className="text-[#007AFF]"/>
              <EditableTitle title={folder.title} onSave={(t) => updateFolder(folder.id, { title: t })} className="text-[15px] font-semibold truncate max-w-[150px]" />
            </div>
            <button onClick={() => updateFolder(folder.id, { inCanvas: false })} className="p-2 text-slate-500 hover:text-black hover:bg-black/10 rounded-full transition-colors bg-white/30 shadow-sm"><X size={14} strokeWidth={3} /></button>
          </div>
          <FolderBody folder={folder} updateFolder={updateFolder} onLinkClick={onLinkClick} isMobile={true} />
        </div>
      ))}
    </div>
  );
}

function CanvasView({ folders, updateFolder, bringToFront, theme, onLinkClick }) {
  return (
    <div className="absolute inset-0 w-full h-full">
      {folders.map(folder => <CanvasStickyNote key={folder.id} folder={folder} updateFolder={updateFolder} bringToFront={bringToFront} theme={theme} onLinkClick={onLinkClick} />)}
    </div>
  );
}

function CanvasStickyNote({ folder, updateFolder, bringToFront, theme, onLinkClick }) {
  const [isClosing, setIsClosing] = useState(false);
  const handleClose = () => { setIsClosing(true); setTimeout(() => updateFolder(folder.id, { inCanvas: false }), 120); };

  const handleDragStart = (e) => {
    if (['INPUT', 'BUTTON', 'A'].includes(e.target.tagName)) return;
    bringToFront(folder.id);
    const sx = e.clientX, sy = e.clientY, ix = folder.x, iy = folder.y;
    const move = (ev) => updateFolder(folder.id, { x: ix + ev.clientX - sx, y: iy + ev.clientY - sy });
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  };

  return (
    <div className={`absolute rounded-[24px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-black/5 flex flex-col overflow-hidden group transition-all duration-700 ease-apple ${isClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
      style={{ ...getGlassStyle(theme), left: folder.x, top: folder.y, width: folder.w, height: folder.h, zIndex: folder.z }}
      onMouseDown={() => bringToFront(folder.id)}>
      <div className="flex items-center justify-between p-4 bg-black/5 cursor-move shrink-0 border-b border-black/5" onMouseDown={handleDragStart}>
        <div className="flex items-center gap-2 font-semibold text-[#1d1d1f] text-[15px]"><FolderIcon size={18} className="text-[#007AFF]"/> <EditableTitle title={folder.title} onSave={(t) => updateFolder(folder.id, { title: t })} className="text-[15px] font-semibold" /></div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button onClick={handleClose} className="p-1.5 text-slate-500 hover:text-black hover:bg-black/10 rounded-lg transition-colors"><Minus size={16} /></button>
        </div>
      </div>
      <FolderBody folder={folder} updateFolder={updateFolder} onLinkClick={onLinkClick} isMobile={false} />
      <div className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50 flex items-end justify-end p-2 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
        onMouseDown={(e) => {
          e.stopPropagation(); bringToFront(folder.id);
          const sx = e.clientX, sy = e.clientY, iW = folder.w, iH = folder.h;
          const move = (ev) => updateFolder(folder.id, { w: Math.max(280, iW + ev.clientX - sx), h: Math.max(300, iH + ev.clientY - sy) });
          const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
          document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
        }}>
        <div className="w-2.5 h-2.5 rounded-tl-sm rounded-br-[14px] bg-slate-300" />
      </div>
    </div>
  );
}

function IosGridView({ folders, setFolders, updateFolder, iosPage, setIosPage, activeFolder, setActiveFolder, theme, onLinkClick }) {
  const [draggedId, setDraggedId] = useState(null);
  const [hoveredTargetIdx, setHoveredTargetIdx] = useState(null);
  const [closingFolderId, setClosingFolderId] = useState(null);
  const cols = 4;
  const perPage = cols * 3;

  const handleDrop = (e, targetIdx) => {
    e.preventDefault(); const id = e.dataTransfer.getData('grid_folder'); if (!id) return;
    const nf = [...folders]; const df = nf.find(f => f.id === id); const tf = nf.find(f => f.gridIdx === targetIdx);
    const oi = df.gridIdx; df.gridIdx = targetIdx; if (tf && tf.id !== df.id) tf.gridIdx = oi;
    setFolders(nf); setDraggedId(null); setHoveredTargetIdx(null);
  };
  const handleCloseModal = () => { setClosingFolderId(activeFolder.id); setTimeout(() => { setActiveFolder(null); setClosingFolderId(null); }, 120); };

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center animate-pop-in">
      <div className="w-full max-w-[800px] h-[550px] grid gap-x-6 gap-y-8 p-6 pt-10" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: 'repeat(3, 1fr)' }}>
        {Array.from({ length: perPage }).map((_, i) => {
          const gi = iosPage * perPage + i;
          const folder = folders.find(f => f.gridIdx === gi);
          const isH = hoveredTargetIdx === gi;
          return (
            <div key={gi} onDragOver={(e) => { e.preventDefault(); setHoveredTargetIdx(gi); }} onDragLeave={() => setHoveredTargetIdx(null)} onDrop={(e) => handleDrop(e, gi)}
              className={`flex flex-col items-center gap-2.5 w-full h-full justify-center transition-all duration-500 ease-apple rounded-[28px] ${isH ? 'bg-[#007AFF]/10 shadow-[0_0_30px_rgba(0,122,255,0.15)] border border-[#007AFF]/30 scale-[1.03]' : 'border border-transparent'}`}>
              {folder ? (
                <div draggable onClick={() => setActiveFolder(folder)} onDragStart={(e) => { setDraggedId(folder.id); e.dataTransfer.setData('grid_folder', folder.id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDraggedId(null)}
                  className={`flex flex-col items-center gap-2 cursor-pointer group w-24 transition-all duration-500 ease-apple ${draggedId === folder.id ? 'opacity-30 scale-90' : 'active:scale-[0.97]'}`}>
                  <div className="w-20 h-20 rounded-[22px] shadow-[0_8px_20px_rgba(0,0,0,0.06)] border border-black/5 flex items-center justify-center group-hover:scale-[1.03] transition-all duration-700 ease-apple" style={getGlassStyle(theme)}>
                    <FolderIcon size={38} className="text-[#007AFF]" />
                  </div>
                  <EditableTitle title={folder.title} onSave={(t) => updateFolder(folder.id, { title: t })} className="text-[13px] font-medium text-[#1d1d1f] text-center" />
                </div>
              ) : <div className={`w-20 h-20 rounded-[22px] transition-all duration-500 ease-apple ${isH ? 'border border-[#007AFF]/40 bg-[#007AFF]/5' : 'bg-transparent'}`} />}
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-10 flex items-center gap-4 border border-black/5 shadow-[0_10px_20px_rgba(0,0,0,0.05)] px-5 py-2.5 rounded-full transition-all duration-700 ease-apple" style={getGlassStyle(theme)}>
        <button onClick={() => setIosPage(Math.max(0, iosPage - 1))} disabled={iosPage === 0} className="p-0.5 disabled:opacity-20 hover:bg-black/5 rounded-full transition-colors text-slate-600"><ChevronLeft size={18}/></button>
        <div className="flex gap-2 items-center">
          {Array.from({ length: Math.max(1, Math.ceil(Math.max(...folders.map(f => f.gridIdx || 0), 0) / perPage) + 1) }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ease-apple ${i === iosPage ? 'bg-black w-6' : 'bg-black/20 w-2'}`} />
          ))}
        </div>
        <button onClick={() => setIosPage(iosPage + 1)} className="p-0.5 hover:bg-black/5 rounded-full transition-colors text-slate-600"><ChevronRight size={18}/></button>
      </div>
      {activeFolder && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/10 backdrop-blur-md" onClick={handleCloseModal}>
          <div className={`w-full max-w-2xl mx-4 h-[70vh] border border-black/5 rounded-[28px] shadow-[0_30px_60px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden transition-all duration-700 ease-apple ${closingFolderId === activeFolder.id ? 'animate-pop-out' : 'animate-pop-in'}`} onClick={e => e.stopPropagation()} style={getGlassStyle(theme)}>
            <div className="flex items-center justify-between p-5 border-b border-black/5 bg-black/[0.03]">
              <span className="font-semibold text-lg flex items-center gap-3 text-[#1d1d1f]"><FolderIcon className="text-[#007AFF]" size={20}/> <EditableTitle title={activeFolder.title} onSave={(t) => updateFolder(activeFolder.id, { title: t })} className="text-lg font-semibold" /></span>
              <button onClick={handleCloseModal} className="p-2 hover:bg-black/5 rounded-full text-slate-500 transition-colors"><X size={18}/></button>
            </div>
            <FolderBody folder={activeFolder} updateFolder={updateFolder} onLinkClick={onLinkClick} isMobile={false} />
          </div>
        </div>
      )}
    </div>
  );
}

function DynamicView({ folders, updateFolder, activeLayout, slotAssignments, setSlotAssignments, splitRatios, setSplitRatios, theme, onLinkClick }) {
  const containerRef = useRef(null);
  const [closingSlot, setClosingSlot] = useState(null);
  const [dockHoverInfo, setDockHoverInfo] = useState(null);

  const handleDrop = (e, si) => {
    e.preventDefault(); const fid = e.dataTransfer.getData('folderId');
    if (fid) { const ns = { ...slotAssignments }; Object.keys(ns).forEach(k => { if (ns[k] === fid) delete ns[k] }); ns[si] = fid; setSlotAssignments(ns); }
  };
  const handleRemoveSlot = (idx) => { setClosingSlot(idx); setTimeout(() => { const s = {...slotAssignments}; delete s[idx]; setSlotAssignments(s); setClosingSlot(null); }, 120); };

  const startResizing = (e, axis) => {
    e.preventDefault(); const isX = axis === 'x'; const sp = isX ? e.clientX : e.clientY;
    const sr = splitRatios[activeLayout.id][axis]; const box = containerRef.current.getBoundingClientRect(); const size = isX ? box.width : box.height;
    const move = (ev) => { const nr = Math.max(15, Math.min(85, sr + ((isX ? ev.clientX : ev.clientY) - sp) / size * 100)); setSplitRatios(prev => ({...prev, [activeLayout.id]: { ...prev[activeLayout.id], [axis]: nr }})); };
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  };

  const unassigned = folders.filter(f => !Object.values(slotAssignments).includes(f.id));

  const renderSlot = (idx) => {
    const folder = folders.find(f => f.id === slotAssignments[idx]);
    const isClosing = closingSlot === idx;
    return (
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, idx)} className="w-full h-full relative p-2">
        <div className={`w-full h-full rounded-[24px] overflow-hidden flex flex-col transition-all duration-700 ease-apple ${folder ? 'shadow-[0_15px_40px_rgba(0,0,0,0.08)] border border-black/5' : 'bg-black/5 hover:bg-black/10 items-center justify-center text-slate-500 border border-dashed border-black/10'}`} style={folder ? getGlassStyle(theme) : {}}>
          {folder ? (
            <div className={`w-full h-full flex flex-col ${isClosing ? 'animate-pop-out' : 'animate-pop-in'}`}>
              <div className="p-4 border-b border-black/5 bg-black/[0.03] flex justify-between">
                <span className="font-semibold text-[15px] flex items-center gap-2"><FolderIcon size={18} className="text-[#007AFF]"/> <EditableTitle title={folder.title} onSave={(t) => updateFolder(folder.id, { title: t })} className="text-[15px] font-semibold" /></span>
                <button onClick={() => handleRemoveSlot(idx)} className="text-slate-500 hover:text-black bg-black/5 hover:bg-black/10 p-1.5 rounded-lg transition-colors"><X size={14}/></button>
              </div>
              <FolderBody folder={folder} updateFolder={updateFolder} onLinkClick={onLinkClick} isMobile={false} />
            </div>
          ) : <span className="text-[11px] font-bold tracking-widest text-slate-400/80 uppercase">空间 {idx + 1}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className={`absolute inset-0 w-full h-full flex animate-pop-in flex-row`}>
      <div className={`flex-1 flex flex-col p-4 pr-1 overflow-hidden relative`} ref={containerRef}>
        {activeLayout.id === '1x1' && renderSlot(0)}
        {activeLayout.id === '1-2-lr' && (
          <div className="flex w-full h-full">
            <div style={{ width: `${splitRatios['1-2-lr'].x}%` }} className="h-full relative">{renderSlot(0)}</div>
            <div className="w-6 -mx-3 z-10 cursor-col-resize flex items-center justify-center group" onMouseDown={e => startResizing(e, 'x')}><div className="w-1.5 h-16 rounded-full bg-black/10 group-hover:bg-[#007AFF] transition-colors"/></div>
            <div className="flex-1 flex flex-col h-full relative">
              <div style={{ height: `${splitRatios['1-2-lr'].y}%` }} className="w-full relative">{renderSlot(1)}</div>
              <div className="h-6 -my-3 z-10 cursor-row-resize flex items-center justify-center group" onMouseDown={e => startResizing(e, 'y')}><div className="h-1.5 w-16 rounded-full bg-black/10 group-hover:bg-[#007AFF] transition-colors"/></div>
              <div className="flex-1 w-full relative">{renderSlot(2)}</div>
            </div>
          </div>
        )}
        {activeLayout.id === '1-2-tb' && (
          <div className="flex flex-col w-full h-full">
            <div style={{ height: `${splitRatios['1-2-tb'].y}%` }} className="w-full relative">{renderSlot(0)}</div>
            <div className="h-6 -my-3 z-10 cursor-row-resize flex items-center justify-center group" onMouseDown={e => startResizing(e, 'y')}><div className="h-1.5 w-16 rounded-full bg-black/10 group-hover:bg-[#007AFF] transition-colors"/></div>
            <div className="flex-1 flex w-full relative">
              <div style={{ width: `${splitRatios['1-2-tb'].x}%` }} className="h-full relative">{renderSlot(1)}</div>
              <div className="w-6 -mx-3 z-10 cursor-col-resize flex items-center justify-center group" onMouseDown={e => startResizing(e, 'x')}><div className="w-1.5 h-16 rounded-full bg-black/10 group-hover:bg-[#007AFF] transition-colors"/></div>
              <div className="flex-1 h-full relative">{renderSlot(2)}</div>
            </div>
          </div>
        )}
        {activeLayout.id === '2x2' && (
          <div className="flex flex-col w-full h-full">
            <div style={{ height: `${splitRatios['2x2'].y}%` }} className="flex w-full relative">
              <div style={{ width: `${splitRatios['2x2'].x}%` }} className="h-full relative">{renderSlot(0)}</div>
              <div className="w-6 -mx-3 z-10 cursor-col-resize flex items-center justify-center group" onMouseDown={e => startResizing(e, 'x')}><div className="w-1.5 h-16 rounded-full bg-black/10 group-hover:bg-[#007AFF] transition-colors"/></div>
              <div className="flex-1 h-full relative">{renderSlot(1)}</div>
            </div>
            <div className="h-6 -my-3 z-10 cursor-row-resize flex items-center justify-center group" onMouseDown={e => startResizing(e, 'y')}><div className="h-1.5 w-16 rounded-full bg-black/10 group-hover:bg-[#007AFF] transition-colors"/></div>
            <div className="flex-1 flex w-full relative">
              <div style={{ width: `${splitRatios['2x2'].x}%` }} className="h-full relative">{renderSlot(2)}</div>
              <div className="w-6 -mx-3 z-10 cursor-col-resize flex items-center justify-center group" onMouseDown={e => startResizing(e, 'x')}><div className="w-1.5 h-16 rounded-full bg-black/10 group-hover:bg-[#007AFF] transition-colors"/></div>
              <div className="flex-1 h-full relative">{renderSlot(3)}</div>
            </div>
          </div>
        )}
      </div>
      <div className="w-20 flex flex-col items-center py-4 gap-4 shrink-0 z-10 border-l border-black/5 transition-all duration-700 ease-apple" style={{ ...getGlassStyle(theme), background: 'transparent' }}>
        <div className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase transform rotate-90 my-4">Dock</div>
        <div className="flex-1 w-full overflow-y-auto custom-scrollbar flex flex-col items-center gap-8 px-2 pt-8 pb-10">
          {unassigned.map(f => (
            <div key={f.id} draggable onDragStart={(e) => e.dataTransfer.setData('folderId', f.id)}
              onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setDockHoverInfo({ folder: f, top: r.top + r.height / 2 }); }}
              onMouseLeave={() => setDockHoverInfo(null)}
              className="relative w-10 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-[1.15] transition-transform duration-500 ease-apple">
              <FolderIcon size={26} className="text-[#007AFF] drop-shadow-[0_4px_8px_rgba(0,122,255,0.3)]" />
            </div>
          ))}
        </div>
      </div>
      {dockHoverInfo && (
        <div className="fixed z-[99999] right-[90px] border border-black/5 rounded-[20px] flex items-center p-3 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] w-[240px] pointer-events-none transition-all duration-700"
          style={{ ...getGlassStyle(theme, { background: 'rgba(255,255,255,0.9)' }), top: dockHoverInfo.top, transform: 'translateY(-50%)' }}>
          <FolderIcon className="w-8 h-8 shrink-0 text-[#007AFF]" />
          <div className="ml-3 flex flex-col flex-1 truncate">
            <span className="font-semibold text-[14px] text-[#1d1d1f] truncate">{dockHoverInfo.folder.title}</span>
            <span className="text-[11px] font-medium text-slate-500 mt-0.5">{dockHoverInfo.folder.links.length} 个书签</span>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableTitle({ title, onSave, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => { setValue(title); }, [title]);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

  const commit = () => { const trimmed = value.trim(); if (trimmed && trimmed !== title) onSave(trimmed); else setValue(title); setEditing(false); };

  if (editing) return <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(title); setEditing(false); } }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className={`bg-black/5 border border-black/10 focus:border-[#007AFF] rounded-lg px-2 py-0.5 outline-none transition-colors text-[#1d1d1f] ${className}`} style={{ width: Math.max(60, value.length * 14 + 20) + 'px' }} />;
  return <span onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }} className={`cursor-default select-none ${className}`} title="双击改名">{title}</span>;
}

// 📱 & 💻 核心重构：自适应 FolderBody
function FolderBody({ folder, updateFolder, onLinkClick, isMobile }) {
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const sortedLinks = [...folder.links].sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0));

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !newUrl.trim()) return;
    let finalUrl = newUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
    updateFolder(folder.id, { links: [...folder.links, { id: generateId(), label: newLabel.trim(), url: finalUrl, clickCount: 0 }] });
    setNewLabel(''); setNewUrl(''); setIsAdding(false);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-transparent">
      {/* 动态适配：手机端纵向 flex-col，桌面端横向 flex-wrap */}
      <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar content-start ${isMobile ? 'flex flex-col gap-2.5' : 'flex flex-wrap gap-2.5'}`}>
        {sortedLinks.length === 0 && !isAdding && <div className="w-full h-full flex items-center justify-center text-slate-400 text-[13px] font-medium">无书签数据</div>}
        {sortedLinks.map(link => {
          const favicon = getFaviconUrl(link.url);
          return (
            <div key={link.id} className={`relative group ${isMobile ? 'w-full shrink-0' : 'max-w-full'}`}>
              <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => onLinkClick?.(folder.id, link.id)}
                className={`inline-flex items-center gap-2 px-3.5 bg-black/[0.04] hover:bg-[#007AFF] hover:text-white border border-black/5 hover:border-transparent text-[13px] font-semibold text-[#1d1d1f] hover:shadow-md transition-all duration-300 ease-apple shadow-sm ${isMobile ? 'w-full justify-between rounded-xl py-3' : 'rounded-full py-1.5'}`}>
                
                {/* 左侧：Icon + 文字 */}
                <div className="flex items-center gap-2 truncate">
                  {favicon && <img src={favicon} alt="" className="w-4 h-4 rounded-sm shrink-0" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />}
                  <span className={`truncate ${isMobile ? 'max-w-[200px]' : 'max-w-[140px]'}`}>{link.label}</span>
                </div>
                
                {/* 右侧：热度排序计数 + (仅手机端显示的内置删除按钮) */}
                <div className="flex items-center gap-2 shrink-0">
                  {(link.clickCount || 0) > 0 && <span className="text-[11px] opacity-40 font-normal">{link.clickCount}</span>}
                  {isMobile && (
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateFolder(folder.id, { links: folder.links.filter(l => l.id !== link.id) }); }} 
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white/50 rounded-lg transition-colors shadow-sm bg-black/5"
                    >
                      <Trash2 size={14}/>
                    </button>
                  )}
                </div>
              </a>
              {/* 桌面端特供的外部悬浮 X 按钮 */}
              {!isMobile && (
                <button onClick={() => updateFolder(folder.id, { links: folder.links.filter(l => l.id !== link.id) })} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center scale-50 group-hover:scale-100 transition-all duration-300 shadow-md hover:bg-red-400 z-10">
                  <X size={12} strokeWidth={3}/>
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-black/5 bg-black/[0.03]">
        {isAdding ? (
          <form onSubmit={handleAddLink} className="flex flex-col gap-2.5 animate-pop-in">
            <input autoFocus placeholder="标签名称" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="w-full bg-black/[0.04] px-3.5 py-2 rounded-[10px] text-[13px] font-medium border border-black/10 focus:border-[#007AFF] focus:bg-white focus:outline-none transition-colors shadow-sm text-black" />
            <div className="flex gap-2">
              <input placeholder="URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="flex-1 bg-black/[0.04] px-3.5 py-2 rounded-[10px] text-[13px] font-medium border border-black/10 focus:border-[#007AFF] focus:bg-white focus:outline-none transition-colors shadow-sm text-black" />
              <button type="button" onClick={() => setIsAdding(false)} className="px-3 rounded-[10px] text-[13px] font-semibold text-slate-500 hover:bg-black/10 transition-colors">取消</button>
              <button type="submit" className="px-4 bg-[#007AFF] hover:bg-[#0066d6] text-white rounded-[10px] text-[13px] font-semibold shadow-md transition-all active:scale-95">添加</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setIsAdding(true)} className="w-full py-2.5 rounded-[12px] border border-dashed border-black/10 text-slate-500 hover:text-[#007AFF] hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all duration-500 ease-apple flex justify-center items-center gap-1.5 text-[13px] font-semibold">
            <Plus size={16} /> 添加新书签
          </button>
        )}
      </div>
    </div>
  );
}