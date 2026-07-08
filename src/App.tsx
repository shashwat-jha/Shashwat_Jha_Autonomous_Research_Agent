import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Layers, 
  Globe, 
  Download, 
  Plus, 
  Trash2, 
  Loader2, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle, 
  Sliders, 
  BookOpen, 
  Terminal,
  FileCode,
  FileUp,
  X,
  History,
  Printer
} from 'lucide-react';
import { ResearchSession, ResearchSource, ResearchLog } from './types';
import { prepopulatedSessions } from './prepopulated';

export default function App() {
  // Load sessions from localStorage or default to prepopulated showcase sessions
  const [sessions, setSessions] = useState<ResearchSession[]>(() => {
    const saved = localStorage.getItem('autonomous_research_sessions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse sessions from localStorage', e);
      }
    }
    return prepopulatedSessions;
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    return sessions[0]?.id || '';
  });

  // Form states
  const [topic, setTopic] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customUrls, setCustomUrls] = useState<string[]>([]);
  const [selectedSourceTypes, setSelectedSourceTypes] = useState<string[]>([
    'Scientific Journals', 'Industry Reports', 'Technical Documentation'
  ]);

  // Active execution states
  const [isSearching, setIsSearching] = useState(false);
  const [activeLogs, setActiveLogs] = useState<ResearchLog[]>([]);
  const [activeQueries, setActiveQueries] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Persist sessions to local storage
  useEffect(() => {
    localStorage.setItem('autonomous_research_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Selected session helper
  const currentSession = sessions.find(s => s.id === selectedSessionId);

  // Source Type categories options
  const sourceOptions = [
    'Scientific Journals',
    'Industry Reports',
    'Technical Documentation',
    'Academic Papers',
    'Government Policy Docs',
    'News & Media',
    'Patent Databases',
    'Wikis & General Knowledge'
  ];

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    
    let url = customUrlInput.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    try {
      new URL(url);
      if (!customUrls.includes(url)) {
        setCustomUrls([...customUrls, url]);
      }
      setCustomUrlInput('');
    } catch (err) {
      alert('Please enter a valid URL.');
    }
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    setCustomUrls(customUrls.filter(u => u !== urlToRemove));
  };

  const toggleSourceType = (type: string) => {
    if (selectedSourceTypes.includes(type)) {
      setSelectedSourceTypes(selectedSourceTypes.filter(t => t !== type));
    } else {
      setSelectedSourceTypes([...selectedSourceTypes, type]);
    }
  };

  // Perform research using the backend server agent
  const handleStartResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsSearching(true);
    setErrorMessage('');
    setActiveQueries([]);
    
    const tempSessionId = `session-${Date.now()}`;
    const initialLogs: ResearchLog[] = [
      {
        timestamp: new Date().toISOString(),
        stage: 'analyze',
        message: `Agent initialized. Preparing parameters for topic: "${topic}"`
      }
    ];
    setActiveLogs(initialLogs);

    // Create a temporary session to show in the UI immediately
    const newSession: ResearchSession = {
      id: tempSessionId,
      topic: topic.trim(),
      status: 'analyzing',
      queries: [],
      selectedSources: selectedSourceTypes,
      sources: [],
      logs: initialLogs,
      report: '',
      createdAt: new Date().toISOString()
    };

    setSessions(prev => [newSession, ...prev]);
    setSelectedSessionId(tempSessionId);

    const startTime = Date.now();

    try {
      // Direct call to our backend research endpoint
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: topic.trim(),
          customUrls: customUrls,
          selectedSources: selectedSourceTypes
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Server-side research routine failed.');
      }

      const durationMs = Date.now() - startTime;

      // Update session with final structured results
      setSessions(prev => prev.map(s => {
        if (s.id === tempSessionId) {
          return {
            ...s,
            status: 'completed',
            queries: data.queries || [],
            sources: data.sources || [],
            logs: data.logs || [],
            report: data.report || '',
            durationMs
          };
        }
        return s;
      }));

      // Reset form fields upon success
      setTopic('');
      setCustomUrls([]);

    } catch (err: any) {
      console.error(err);
      const errMessage = err.message || 'An unexpected error occurred during research.';
      setErrorMessage(errMessage);

      const failedLogs: ResearchLog[] = [
        ...activeLogs,
        {
          timestamp: new Date().toISOString(),
          stage: 'error',
          message: `Agent execution failed: ${errMessage}`
        }
      ];

      setSessions(prev => prev.map(s => {
        if (s.id === tempSessionId) {
          return {
            ...s,
            status: 'failed',
            logs: failedLogs,
            report: `# Research Failed\n\n**Error details:** ${errMessage}\n\nPlease check your server logs or verify that your \`GEMINI_API_KEY\` is correctly configured in your secrets.`
          };
        }
        return s;
      }));
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (selectedSessionId === id && updated.length > 0) {
      setSelectedSessionId(updated[0].id);
    } else if (updated.length === 0) {
      setSelectedSessionId('');
    }
  };

  const handleRestoreDefaults = () => {
    setSessions(prepopulatedSessions);
    setSelectedSessionId(prepopulatedSessions[0].id);
  };

  // Download Report as Markdown File
  const handleDownloadMarkdown = (session: ResearchSession) => {
    const element = document.createElement("a");
    const file = new Blob([session.report], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${session.topic.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_report.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Open system print dialog which converts neatly to PDF
  const handlePrintPDF = () => {
    window.print();
  };

  // Elegant, custom Markdown-to-HTML parser function
  const renderMarkdown = (md: string) => {
    if (!md) return <p className="text-gray-400 italic">No report available yet. Run a search to see details.</p>;
    
    const lines = md.split('\n');
    let insideList = false;
    let listType: 'ul' | 'ol' | null = null;

    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={idx} id={`h1-${idx}`} className="text-3xl font-extrabold text-gray-900 border-b border-gray-200 pb-2 mt-8 mb-4 tracking-tight">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} id={`h2-${idx}`} className="text-2xl font-bold text-gray-800 mt-6 mb-3 tracking-tight border-b border-gray-100 pb-1">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} id={`h3-${idx}`} className="text-xl font-semibold text-gray-800 mt-5 mb-2">{line.slice(4)}</h3>;
      }
      
      // Horizontal Rules
      if (line === '---' || line === '***') {
        return <hr key={idx} className="my-6 border-t-2 border-gray-200" />;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        return <blockquote key={idx} className="border-l-4 border-emerald-500 pl-4 py-1 my-3 text-gray-600 italic bg-gray-50/50 rounded-r-md">{line.slice(2)}</blockquote>;
      }

      // Lists (Unordered)
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const cleanText = line.replace(/^[\s]*[\*\-]\s+/, '');
        // Highlight inline bold text
        return (
          <li key={idx} className="text-gray-700 ml-6 list-disc mb-1.5 leading-relaxed">
            {parseInlineStyles(cleanText)}
          </li>
        );
      }

      // Numbered Lists
      if (/^\d+\.\s+/.test(line.trim())) {
        const cleanText = line.replace(/^\s*\d+\.\s+/, '');
        return (
          <li key={idx} className="text-gray-700 ml-6 list-decimal mb-1.5 leading-relaxed">
            {parseInlineStyles(cleanText)}
          </li>
        );
      }

      // Empty Lines
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      // Standard Paragraph
      return (
        <p key={idx} className="text-gray-700 mb-4 leading-relaxed text-base">
          {parseInlineStyles(line)}
        </p>
      );
    });
  };

  // Helper to highlight bold text (`**`) and parse markdown links (`[text](url)`)
  const parseInlineStyles = (text: string) => {
    // Regex for markdown links [label](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    // Regex for bold text **text**
    const boldRegex = /\*\*([^*]+)\*\*/g;
    
    let parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // First, let's parse bold text and links. To keep it robust without heavy dependencies,
    // we do a regex replace chain or a direct split. Let's do a simple inline token parser:
    const tokenRegex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
    const matches = text.match(tokenRegex);
    
    if (!matches) {
      return text;
    }
    
    let currentText = text;
    let matchIdx = 0;
    
    while (true) {
      const match = tokenRegex.exec(text);
      if (!match) break;
      
      const matchText = match[0];
      const startIndex = match.index;
      
      // Push plain text before match
      if (startIndex > lastIndex) {
        parts.push(text.substring(lastIndex, startIndex));
      }
      
      if (matchText.startsWith('**') && matchText.endsWith('**')) {
        // Bold
        parts.push(<strong key={matchIdx++} className="font-semibold text-gray-900 bg-emerald-50/40 px-1 rounded">{matchText.slice(2, -2)}</strong>);
      } else {
        // Link
        const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(matchText);
        if (linkMatch) {
          parts.push(
            <a 
              key={matchIdx++} 
              href={linkMatch[2]} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-0.5 hover:underline"
            >
              {linkMatch[1]}
              <ExternalLink className="w-3 h-3" />
            </a>
          );
        } else {
          parts.push(matchText);
        }
      }
      
      lastIndex = tokenRegex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts;
  };

  return (
    <div id="app-root" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* Header Banner */}
      <header id="app-header" className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30">
            <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Autonomous Research Agent <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">v1.2</span>
            </h1>
            <p className="text-xs text-slate-400">Deep, self-guided research & factual verification engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            id="btn-restore-defaults"
            onClick={handleRestoreDefaults}
            className="text-xs text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 transition duration-150 flex items-center gap-1.5"
            title="Restore Showcase Datasets"
          >
            <History className="w-3.5 h-3.5" />
            Restore Showcase
          </button>
          
          <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-slate-300">Agent Core Standby</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Control Panel / Sidebar */}
        <aside id="sidebar-panel" className="w-full lg:w-96 border-r border-slate-800 bg-slate-950/40 p-5 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-73px)]">
          
          {/* Section: Start New Research */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Configure Agent Goal</h2>
            </div>

            <form onSubmit={handleStartResearch} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Research Topic / Question</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Next-gen solid state batteries commercialization timelines..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-3 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition duration-150"
                    disabled={isSearching}
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Search className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Source Types Multi-select */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Source focus</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {sourceOptions.map((opt) => {
                    const selected = selectedSourceTypes.includes(opt);
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => toggleSourceType(opt)}
                        className={`text-left text-xs px-2.5 py-1.5 rounded-lg border transition duration-150 ${
                          selected 
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40' 
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* URL Direct Scraping / Sources Bonus */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">Direct Scrape Specific URL (Optional)</label>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase">Bonus Target</span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="e.g. example.com/doc"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    disabled={isSearching}
                  />
                  <button 
                    type="button"
                    onClick={handleAddUrl}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-white px-3 py-1.5 rounded-lg transition duration-150 flex items-center justify-center"
                    disabled={isSearching}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {customUrls.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {customUrls.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-slate-900 border border-emerald-500/20 text-[11px] text-emerald-300 pl-2 pr-1 py-0.5 rounded-md">
                        <span className="truncate max-w-[120px]">{url}</span>
                        <button type="button" onClick={() => handleRemoveUrl(url)} className="text-slate-500 hover:text-red-400 p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSearching || !topic.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-semibold py-3 px-4 rounded-xl text-sm transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Agent is Researcing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Launch Autonomous Agent
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Section: Search History */}
          <div className="flex-1 flex flex-col gap-3 min-h-[220px]">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Research Archives ({sessions.length})</h2>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
              {sessions.map((s) => {
                const isSelected = s.id === selectedSessionId;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-left relative group ${
                      isSelected 
                        ? 'bg-slate-900/90 border-emerald-500/50 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/50 border-slate-900 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium line-clamp-2 text-slate-200 group-hover:text-white transition duration-150">
                        {s.topic}
                      </span>
                      <button
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        className="text-slate-600 hover:text-red-400 p-1 rounded-md opacity-0 group-hover:opacity-100 transition duration-150 self-start"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3 text-[10px]">
                      <div className="flex items-center gap-2">
                        {s.status === 'completed' && (
                          <span className="text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                            <span className="h-1 w-1 bg-emerald-400 rounded-full animate-pulse"></span>
                            Complete
                          </span>
                        )}
                        {s.status === 'failed' && (
                          <span className="text-red-400 font-medium bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">
                            Failed
                          </span>
                        )}
                        {(s.status === 'analyzing' || s.status === 'searching' || s.status === 'processing' || s.status === 'synthesizing') && (
                          <span className="text-amber-400 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                            <Loader2 className="w-2 h-2 animate-spin" />
                            Researching
                          </span>
                        )}
                        <span className="text-slate-500">
                          {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {s.durationMs && (
                        <span className="text-slate-500">
                          {(s.durationMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {sessions.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No active searches in archives.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Dashboard Area */}
        <main id="workspace-panel" className="flex-1 flex flex-col overflow-y-auto max-h-[calc(100vh-73px)]">
          {currentSession ? (
            <div className="flex-1 flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-slate-800">
              
              {/* Left Column: Logs, Sources, Queries */}
              <div className="w-full xl:w-[420px] p-6 flex flex-col gap-6 bg-slate-950/20">
                
                {/* Agent Process Stage Monitor */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agent Executive Console</h2>
                  </div>

                  {/* Execution Timeline Terminal */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs flex flex-col gap-2 shadow-inner h-[280px] overflow-y-auto">
                    {currentSession.logs.map((log, idx) => {
                      let color = 'text-slate-300';
                      if (log.stage === 'error') color = 'text-red-400';
                      if (log.stage === 'complete') color = 'text-emerald-400';
                      if (log.stage === 'analyze') color = 'text-blue-400';
                      if (log.stage === 'search') color = 'text-purple-400';
                      if (log.stage === 'deduplicate') color = 'text-amber-400';

                      return (
                        <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
                          <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className={`${color} shrink-0 font-semibold uppercase text-[10px]`}>{log.stage}:</span>
                          <span className="text-slate-300">{log.message}</span>
                        </div>
                      );
                    })}
                    
                    {currentSession.status === 'analyzing' && (
                      <div className="flex items-center gap-2 text-slate-500 italic mt-2 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>Gathering context from external sources...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Formulated Queries Expand Panel */}
                {currentSession.queries && currentSession.queries.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                      <Search className="w-4 h-4 text-emerald-400" />
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Query Expanse & Selectors</h2>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {currentSession.queries.map((q, idx) => (
                        <div key={idx} className="bg-slate-900/60 border border-slate-800/80 px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs text-slate-300">
                          <span className="bg-slate-800 text-slate-400 font-mono text-[10px] w-5 h-5 rounded-md flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="italic">"{q}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Valid Sources Panel */}
                <div className="flex flex-col gap-3 flex-1 min-h-[250px]">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified Sources & Citations ({currentSession.sources.length})</h2>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[350px] pr-1">
                    {currentSession.sources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-3 rounded-xl transition duration-150 flex flex-col gap-1.5 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition duration-150 line-clamp-1">
                            {src.title}
                          </span>
                          <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                        </div>
                        
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {src.snippet}
                        </p>

                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                          <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md border border-slate-700 font-mono">
                            {src.domain}
                          </span>
                          {src.queryMatched && (
                            <span className="truncate max-w-[150px] text-right italic text-slate-500">
                              via "{src.queryMatched}"
                            </span>
                          )}
                        </div>
                      </a>
                    ))}

                    {currentSession.sources.length === 0 && (
                      <div className="text-center py-8 text-slate-500 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl">
                        <Globe className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                        <p className="text-xs">No citations captured.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Markdown Report Preview & Export */}
              <div id="print-report-container" className="flex-1 p-6 lg:p-8 flex flex-col gap-5 bg-slate-950/10">
                
                {/* Report Header Controls */}
                <div id="report-controls" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-semibold text-emerald-400 tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Synthesis Output
                    </span>
                    <h2 className="text-lg font-bold text-white mt-1.5">Interactive Research Artifact</h2>
                  </div>

                  {currentSession.status === 'completed' && (
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleDownloadMarkdown(currentSession)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-white font-medium py-2 px-3.5 rounded-lg transition duration-150 flex items-center gap-2 hover:border-slate-600"
                        title="Download Markdown File"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        Markdown
                      </button>

                      <button
                        onClick={handlePrintPDF}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium py-2 px-3.5 rounded-lg transition duration-150 flex items-center gap-2 text-xs shadow-md shadow-emerald-500/10"
                        title="Export Clean PDF / Print Layout"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-950" />
                        Export PDF
                      </button>
                    </div>
                  )}
                </div>

                {/* Report Content Panel */}
                <div className="flex-1 bg-white text-slate-800 rounded-2xl p-6 lg:p-10 shadow-xl border border-slate-200/80 max-w-4xl mx-auto w-full overflow-y-auto animate-fade-in printable-report">
                  <div className="prose max-w-none">
                    {currentSession.status === 'completed' || currentSession.status === 'failed' ? (
                      renderMarkdown(currentSession.report)
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900">Synthesizing Research Data</h3>
                        <p className="text-sm text-slate-500 max-w-xs mt-1">
                          Our autonomous agent is compiling search results, cross-referencing domains, and formatting your final structured report...
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
              <Sparkles className="w-12 h-12 text-emerald-500/40 mb-4 animate-bounce" />
              <h2 className="text-xl font-bold text-white mb-2">Autonomous Research Workspace</h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Specify a research topic or question in the sidebar control panel. The agent will formulate queries, scour live sources, filter out duplicates, and write a high-fidelity formatted report.
              </p>
              <button
                onClick={() => {
                  setTopic("Impact of Post-Quantum Cryptography on Enterprise Networks");
                }}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-300 font-medium py-2 px-4 rounded-xl text-xs border border-slate-700 transition duration-150"
              >
                Try sample topic: "Impact of Post-Quantum Cryptography"
              </button>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
