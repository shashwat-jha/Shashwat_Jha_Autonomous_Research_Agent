export interface ResearchLog {
  timestamp: string;
  stage: 'analyze' | 'search' | 'deduplicate' | 'synthesize' | 'complete' | 'error';
  message: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  queryMatched?: string;
}

export interface ResearchSession {
  id: string;
  topic: string;
  status: 'idle' | 'analyzing' | 'searching' | 'processing' | 'synthesizing' | 'completed' | 'failed';
  queries: string[];
  selectedSources: string[]; // E.g. types of sources chosen (e.g. academic papers, news, documentation, wiki)
  sources: ResearchSource[];
  logs: ResearchLog[];
  report: string;
  createdAt: string;
  durationMs?: number;
}
