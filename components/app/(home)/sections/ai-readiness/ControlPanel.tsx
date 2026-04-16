"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  FileText, 
  Code, 
  Shield, 
  Search, 
  Zap, 
  Database,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Bot,
  Sparkles,
  FileCode,
  Network,
  Info,
  Eye
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAtom } from "jotai";
import ScoreChart from "./ScoreChart";
import RadarChart from "./RadarChart";
import MetricBars from "./MetricBars";
import HubspotGate from "@/components/shared/hubspot-gate/HubspotGate";
import AITeaseCTA from "@/components/shared/ai-tease-cta/AITeaseCTA";
import DetailDrawer from "@/components/shared/detail-drawer/DetailDrawer";
import { hasUnlockedAIAtom } from "@/atoms/gate";

const AI_PLACEHOLDER_BASE = [
  { id: 'ai-loading-0', label: 'Indholdskvalitet til AI', description: 'Analyserer signalforhold i indholdet…', icon: Sparkles, score: 0 },
  { id: 'ai-loading-1', label: 'Informationsarkitektur', description: 'Vurderer sidens struktur…', icon: Bot, score: 0 },
  { id: 'ai-loading-2', label: 'Crawlbarhed', description: 'Tjekker JavaScript-brug…', icon: Database, score: 0 },
  { id: 'ai-loading-3', label: 'Værdi for AI-træning', description: 'Vurderer træningspotentiale…', icon: Network, score: 0 },
  { id: 'ai-loading-4', label: 'Vidensudtræk', description: 'Analyserer entitetsdefinitioner…', icon: FileCode, score: 0 },
  { id: 'ai-loading-5', label: 'Skabelonkvalitet', description: 'Gennemgår semantisk struktur…', icon: Shield, score: 0 },
  { id: 'ai-loading-6', label: 'Indholdsdybde', description: 'Måler indholdets dybde…', icon: Zap, score: 0 },
  { id: 'ai-loading-7', label: 'Maskinlæsbarhed', description: 'Tester udtrækspålidelighed…', icon: Globe, score: 0 },
];

const AI_TEASE_CHECKS = AI_PLACEHOLDER_BASE.map(c => ({
  ...c,
  status: 'pending' as const,
  isAI: true,
  isLoading: false,
}));

const AI_LOADING_CHECKS = AI_PLACEHOLDER_BASE.map(c => ({
  ...c,
  status: 'checking' as const,
  isAI: true,
  isLoading: true,
}));

// Fake scores for the tease-mode radar and bar views — used only when
// no real AI insights are available yet, so the viewer has something to
// react to behind the CTA overlay.
const AI_TEASE_SCORES = [72, 58, 66, 49, 63, 55, 71, 60];

const AI_TEASE_RADAR_DATA = AI_PLACEHOLDER_BASE.map((c, i) => ({
  label: c.label.length > 12 ? c.label.substring(0, 12) + '...' : c.label,
  score: AI_TEASE_SCORES[i],
}));

const AI_TEASE_BAR_METRICS = AI_PLACEHOLDER_BASE.map((c, i) => ({
  label: c.label,
  score: AI_TEASE_SCORES[i],
  status: 'warning' as const,
  category: 'ai' as const,
}));

interface ControlPanelProps {
  isAnalyzing: boolean;
  showResults: boolean;
  url: string;
  analysisData?: any;
  onReset: () => void;
}

interface CheckItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  status: 'pending' | 'checking' | 'pass' | 'fail' | 'warning';
  score?: number;
  details?: string;
  recommendation?: string;
  actionItems?: string[];
  tooltip?: string;
}

export default function ControlPanel({
  isAnalyzing,
  showResults,
  url,
  analysisData,
  onReset,
}: ControlPanelProps) {
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiInsights, setAiInsights] = useState<CheckItem[]>([]);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [combinedChecks, setCombinedChecks] = useState<CheckItem[]>([]);
  const [checks, setChecks] = useState<CheckItem[]>([
    {
      id: 'heading-structure',
      label: 'Overskriftshierarki',
      description: 'H1–H6-struktur',
      icon: FileText,
      status: 'pending',
    },
    {
      id: 'readability',
      label: 'Læsbarhed',
      description: 'Indholdets klarhed',
      icon: Globe,
      status: 'pending',
    },
    {
      id: 'meta-tags',
      label: 'Metadata-kvalitet',
      description: 'Titel, beskrivelse, forfatter',
      icon: FileCode,
      status: 'pending',
    },
    {
      id: 'semantic-html',
      label: 'Semantisk HTML',
      description: 'Korrekte HTML5-tags',
      icon: Code,
      status: 'pending',
    },
    {
      id: 'accessibility',
      label: 'Tilgængelighed',
      description: 'Alt-tekst og ARIA',
      icon: Eye,
      status: 'pending',
    },
    {
      id: 'llms-txt',
      label: 'LLMs.txt',
      description: 'AI-tilladelser',
      icon: Bot,
      status: 'pending',
    },
    {
      id: 'robots-txt',
      label: 'Robots.txt',
      description: 'Crawler-regler',
      icon: Shield,
      status: 'pending',
    },
    {
      id: 'sitemap',
      label: 'Sitemap',
      description: 'Sidestruktur',
      icon: Network,
      status: 'pending',
    },
  ]);

  const [overallScore, setOverallScore] = useState(0);
  const [currentCheckIndex, setCurrentCheckIndex] = useState(-1);
  const [selectedCheck, setSelectedCheck] = useState<CheckItem | null>(null);
  const [hoveredCheck, setHoveredCheck] = useState<string | null>(null);
  const [enhancedScore, setEnhancedScore] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'chart' | 'bars'>('grid');
  const [hasUnlockedAI, setHasUnlockedAI] = useAtom(hasUnlockedAIAtom);
  const [gateOpen, setGateOpen] = useState(false);

  const inTease = showResults && !isAnalyzingAI && aiInsights.length === 0;

  const runAIAnalysis = useCallback(async () => {
    setIsAnalyzingAI(true);
    setShowAIAnalysis(true);

    // Clear any tease tiles first so the staggered loading animation
    // starts from a clean slate.
    setCombinedChecks(prev => prev.filter(c => !(c as any).isAI));

    AI_LOADING_CHECKS.forEach((check, idx) => {
      setTimeout(() => {
        setCombinedChecks(prev => [...prev, check]);
      }, 100 * (idx + 1));
    });

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          htmlContent: analysisData?.htmlContent || '',
          currentChecks: checks,
        }),
      });

      const data = await response.json();
      if (data.success && data.insights) {
        const aiChecks: CheckItem[] = data.insights.map((insight: any, idx: number) => ({
          ...insight,
          icon: [Sparkles, Bot, Database, Network, FileCode, Shield, Zap, Globe][idx % 8],
          description: insight.details?.substring(0, 60) + '...' || 'AI-analyse',
          isAI: true,
        }));

        setAiInsights(aiChecks);

        setCombinedChecks(prev => {
          const withoutLoading = prev.filter(c => !(c as any).isLoading);
          return [...withoutLoading, ...aiChecks];
        });

        if (data.insights.length > 0) {
          const aiScores = data.insights.map((i: any) => i.score || 0);
          const avgAiScore = aiScores.reduce((a: number, b: number) => a + b, 0) / aiScores.length;
          const combinedScore = Math.round((overallScore * 0.6) + (avgAiScore * 0.4));
          setEnhancedScore(combinedScore);
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      setCombinedChecks(prev => prev.filter(c => !(c as any).isLoading));
    } finally {
      setIsAnalyzingAI(false);
    }
  }, [url, analysisData, checks, overallScore]);

  const handleAIClick = useCallback(() => {
    if (hasUnlockedAI) {
      runAIAnalysis();
    } else {
      setGateOpen(true);
    }
  }, [hasUnlockedAI, runAIAnalysis]);

  const handleGateSuccess = useCallback(() => {
    setHasUnlockedAI(true);
    setGateOpen(false);
    runAIAnalysis();
  }, [runAIAnalysis, setHasUnlockedAI]);

  useEffect(() => {
    if (analysisData && analysisData.checks && showResults) {
      // Use real data from API
      const mappedChecks = analysisData.checks.map((check: any) => ({
        ...check,
        icon: checks.find(c => c.id === check.id)?.icon || FileText,
        description: check.details || checks.find(c => c.id === check.id)?.description,
      }));
      setChecks(mappedChecks);
      // Seed the combined grid with the basic 8 + the tease placeholders
      // so the tease overlay has something to dim underneath.
      setCombinedChecks([...mappedChecks, ...AI_TEASE_CHECKS]);
      setAiInsights([]);
      setEnhancedScore(0);
      setOverallScore(analysisData.overallScore || 0);
      setCurrentCheckIndex(-1);
      
      // If AI analysis should auto-start, handle the promise
      if (analysisData.autoStartAI && analysisData.aiAnalysisPromise) {
        console.log('Auto-starting AI analysis with promise');
        setIsAnalyzingAI(true);
        setShowAIAnalysis(true);
        
        // Add placeholder AI tiles immediately with actual titles
        const placeholderAIChecks = [
          {
            id: 'ai-loading-0',
            label: 'Indholdskvalitet til AI',
            description: 'Analyserer signalforhold i indholdet…',
            icon: Sparkles,
            status: 'checking' as const,
            score: 0,
            isAI: true,
            isLoading: true
          },
          {
            id: 'ai-loading-1',
            label: 'Informationsarkitektur',
            description: 'Vurderer sidens struktur…',
            icon: Bot,
            status: 'checking' as const,
            score: 0,
            isAI: true,
            isLoading: true
          },
          {
            id: 'ai-loading-2',
            label: 'Crawlbarhed',
            description: 'Tjekker JavaScript-brug…',
            icon: Database,
            status: 'checking' as const,
            score: 0,
            isAI: true,
            isLoading: true
          },
          {
            id: 'ai-loading-3',
            label: 'Værdi for AI-træning',
            description: 'Vurderer træningspotentiale…',
            icon: Network,
            status: 'checking' as const,
            score: 0,
            isAI: true,
            isLoading: true
          },
          {
            id: 'ai-loading-4',
            label: 'Vidensudtræk',
            description: 'Analyserer entitetsdefinitioner…',
            icon: FileCode,
            status: 'checking' as const,
            score: 0,
            isAI: true,
            isLoading: true
          },
          {
            id: 'ai-loading-5',
            label: 'Skabelonkvalitet',
            description: 'Gennemgår semantisk struktur…',
            icon: Shield,
            status: 'checking' as const,
            score: 0,
            isAI: true,
            isLoading: true
          },
          {
            id: 'ai-loading-6',
            label: 'Indholdsdybde',
            description: 'Måler indholdets dybde…',
            icon: Zap,
            status: 'checking' as const,
            score: 0,
            isAI: true,
            isLoading: true
          },
          {
            id: 'ai-loading-7',
            label: 'Maskinlæsbarhed',
            description: 'Tester udtrækspålidelighed…',
            icon: Globe,
            status: 'checking' as const,
            score: 0,
            isAI: true,
            isLoading: true
          }
        ];
        
        // Add loading AI tiles with staggered animation
        placeholderAIChecks.forEach((check, idx) => {
          setTimeout(() => {
            setCombinedChecks(prev => [...prev, check]);
          }, 100 * (idx + 1));
        });
        
        // Handle the AI analysis promise
        analysisData.aiAnalysisPromise
          .then(async (aiResponse: any) => {
            if (aiResponse) {
              const data = await aiResponse.json();
              if (data.success && data.insights) {
                // Convert AI insights to CheckItem format
                const aiChecks: CheckItem[] = data.insights.map((insight: any, idx: number) => ({
                  ...insight,
                  icon: [Sparkles, Bot, Database, Network, FileCode, Shield, Zap, Globe][idx % 8],
                  description: insight.details?.substring(0, 60) + '...' || 'AI-analyse',
                  isAI: true,
                }));
                
                setAiInsights(aiChecks);
                
                // Replace loading tiles with real AI tiles
                setCombinedChecks(prev => {
                  // Remove loading tiles
                  const withoutLoading = prev.filter(c => !(c as any).isLoading);
                  // Add real AI tiles
                  return [...withoutLoading, ...aiChecks];
                });
                
                // Calculate enhanced score
                if (data.insights.length > 0) {
                  const aiScores = data.insights.map((i: any) => i.score || 0);
                  const avgAiScore = aiScores.reduce((a: number, b: number) => a + b, 0) / aiScores.length;
                  const combinedScore = Math.round((overallScore * 0.6) + (avgAiScore * 0.4));
                  setEnhancedScore(combinedScore);
                }
              }
            }
          })
          .catch(error => {
            console.error('AI analysis error:', error);
            // Remove loading tiles on error
            setCombinedChecks(prev => prev.filter(c => !(c as any).isLoading));
          })
          .finally(() => {
            setIsAnalyzingAI(false);
          });
      }
    } else if (isAnalyzing) {
      // Reset all checks when starting analysis
      const resetChecks = checks.map(check => ({ ...check, status: 'pending' as const }));
      setChecks(resetChecks);
      setCombinedChecks(resetChecks); // Reset combined checks too
      setCurrentCheckIndex(0);
      setOverallScore(0);
      
      // Visual animation while waiting for real results
      const checkInterval = setInterval(() => {
        setCurrentCheckIndex(prev => {
          if (prev >= checks.length - 1) {
            clearInterval(checkInterval);
            return prev;
          }
          return prev + 1;
        });
      }, 200);

      return () => clearInterval(checkInterval);
    }
  }, [isAnalyzing, showResults, analysisData]);

  useEffect(() => {
    if (currentCheckIndex >= 0 && currentCheckIndex < checks.length && isAnalyzing) {
      // Mark current as checking during animation
      setChecks(prev => prev.map((check, index) => {
        if (index === currentCheckIndex) {
          return { ...check, status: 'checking' };
        }
        if (index < currentCheckIndex) {
          return { ...check, status: 'checking' };
        }
        return check;
      }));
      
      // Update combinedChecks to show the animation
      setCombinedChecks(prev => prev.map((check, index) => {
        if (index === currentCheckIndex) {
          return { ...check, status: 'checking' };
        }
        if (index < currentCheckIndex) {
          return { ...check, status: 'checking' };
        }
        return check;
      }));
    }
  }, [currentCheckIndex, checks.length, isAnalyzing]);

  const getStatusIcon = (status: CheckItem['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-16 h-16 text-heat-100 animate-spin" />;
      case 'pass':
        return <CheckCircle2 className="w-16 h-16 text-accent-black" />;
      case 'fail':
        return <XCircle className="w-16 h-16 text-heat-200" />;
      case 'warning':
        return <AlertCircle className="w-16 h-16 text-heat-100" />;
      default:
        return <div className="w-16 h-16 rounded-full border border-black-alpha-8" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-accent-black";
    if (score >= 60) return "text-accent-black";
    return "text-accent-black";
  };

  const renderTile = (check: CheckItem, index: number) => {
    const isActive = index === currentCheckIndex;

    return (
      <motion.div
        key={check.id}
        initial={(check as any).isAI ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: isActive ? 1.05 : 1 }}
        transition={{
          delay: (check as any).isAI ? 0 : index * 0.1,
          scale: { type: "spring", stiffness: 300 },
        }}
        className={`
          relative p-16 rounded-8 transition-all bg-accent-white border min-w-0
          [&_*]:min-w-0
          ${(check as any).isAI ? 'border-heat-100 border-opacity-40 bg-gradient-to-br from-accent-white to-heat-4' : 'border-black-alpha-8'}
          ${isActive ? 'border-heat-100 shadow-lg' : ''}
          ${check.status !== 'pending' && check.status !== 'checking' ? 'cursor-pointer hover:shadow-md' : ''}
          ${(check as any).isLoading ? 'animate-pulse' : ''}
        `}
        onClick={() => {
          if (check.status !== 'pending' && check.status !== 'checking') {
            setSelectedCheck(check);
          }
        }}
        onMouseEnter={() => setHoveredCheck(check.id)}
        onMouseLeave={() => setHoveredCheck(null)}
      >
        <div className="relative">
          <div className="flex items-start justify-end mb-12">
            {getStatusIcon(check.status)}
          </div>

          <h3 className="text-label-large mb-4 text-accent-black font-medium flex items-center gap-6">
            {check.label}
            {check.tooltip && !aiInsights.some(ai => ai.id === check.id) && (
              <div className="relative inline-block">
                <Info className="w-14 h-14 text-black-alpha-32 hover:text-black-alpha-64 transition-colors" />
                <AnimatePresence>
                  {hoveredCheck === check.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-8 w-200 p-8 bg-accent-black text-white text-body-x-small rounded-6 shadow-lg z-50 pointer-events-none"
                    >
                      {check.tooltip}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-accent-black" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </h3>

          <p className="text-body-small text-black-alpha-64">
            {check.description}
          </p>

          {check.status !== 'pending' && check.status !== 'checking' && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <div className="h-2 bg-black-alpha-4 rounded-full overflow-hidden">
                  <motion.div
                    className={`
                      h-full rounded-full
                      ${check.status === 'pass' ? 'bg-accent-black' : ''}
                      ${check.status === 'warning' ? 'bg-heat-100' : ''}
                      ${check.status === 'fail' ? 'bg-heat-200' : ''}
                    `}
                    initial={{ width: 0 }}
                    animate={{ width: `${check.score}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-label-x-small text-black-alpha-32 mt-4 text-center"
              >
                Klik for detaljer
              </motion.div>
            </>
          )}
        </div>

      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-[1440px] mx-auto px-16 md:px-24"
    >
      {/* Header */}
      <motion.div 
        className="text-center mb-48 pt-24 md:pt-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-title-h4 md:text-title-h3 lg:text-title-h2 text-accent-black mb-12 break-words">
          AI-parathedsanalyse
        </h2>
        <p className="text-body-medium md:text-body-large text-black-alpha-64 break-all md:break-words">
          Øjebliksbillede af én side: {url}
        </p>
        
        {showResults && (
          <>
            {/* View Mode Toggle - Moved above score */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-24 mb-20 flex flex-wrap justify-center gap-4"
            >
              <button
                onClick={() => setViewMode('grid')}
                className={`px-10 py-6 md:px-16 md:py-8 rounded-8 text-label-small md:text-label-medium font-medium transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-accent-black text-white shadow-md' 
                    : 'bg-black-alpha-4 text-black-alpha-64 hover:bg-black-alpha-8'
                }`}
              >
                Gitter
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-10 py-6 md:px-16 md:py-8 rounded-8 text-label-small md:text-label-medium font-medium transition-all ${
                  viewMode === 'chart' 
                    ? 'bg-accent-black text-white shadow-md' 
                    : 'bg-black-alpha-4 text-black-alpha-64 hover:bg-black-alpha-8'
                }`}
              >
                Radar-diagram
              </button>
              <button
                onClick={() => setViewMode('bars')}
                className={`px-10 py-6 md:px-16 md:py-8 rounded-8 text-label-small md:text-label-medium font-medium transition-all ${
                  viewMode === 'bars' 
                    ? 'bg-accent-black text-white shadow-md' 
                    : 'bg-black-alpha-4 text-black-alpha-64 hover:bg-black-alpha-8'
                }`}
              >
                Søjlediagram
              </button>
            </motion.div>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.5 }}
              className="flex justify-center"
            >
              <ScoreChart 
                score={enhancedScore > 0 ? enhancedScore : overallScore}
                enhanced={enhancedScore > 0}
                size={180}
              />
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Conditional rendering based on view mode */}
      {viewMode === 'grid' && (
        <div className="mb-40 px-0 md:px-40">
          {/* Basic checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {combinedChecks
              .filter(c => !(c as any).isAI)
              .map((check, index) => renderTile(check, index))}
          </div>

          {/* AI checks (teased until the user unlocks) */}
          {(() => {
            const aiTiles = combinedChecks.filter(c => (c as any).isAI);
            if (aiTiles.length === 0) return null;
            return (
              <div className="relative">
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 transition-all ${
                    inTease ? 'opacity-40 select-none blur-[1px] pointer-events-none max-h-[480px] md:max-h-none overflow-hidden' : ''
                  }`}
                >
                  {aiTiles.map((check, index) => renderTile(check, index))}
                </div>
                {inTease && <AITeaseCTA onClick={handleAIClick} />}
              </div>
            );
          })()}
        </div>
      )}

      {/* Radar Chart View */}
      {viewMode === 'chart' && showResults && (
        <div>
          <motion.div
            className="flex flex-col lg:flex-row justify-center items-start gap-24 lg:gap-48 mb-40"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Basic Analysis Chart */}
            <div className="flex flex-col w-full lg:w-[360px]">
              <h3 className="text-label-large text-accent-black mb-16 font-medium text-center">Grundanalyse</h3>
              <RadarChart 
                data={checks
                  .filter(check => check.status !== 'pending' && check.status !== 'checking')
                  .slice(0, 8)
                  .map(check => ({
                    label: check.label,
                    score: check.score || 0
                  }))}
                size={300}
              />
            </div>
            
            {(aiInsights.length > 0 || inTease) && (
              <motion.div
                className="flex items-center"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <div className="text-label-large text-black-alpha-32 font-medium">MOD</div>
              </motion.div>
            )}

            {/* AI Analysis Chart — rendered with real data when unlocked,
                with synthetic tease data when locked. */}
            {(aiInsights.length > 0 || inTease) && (
              <motion.div
                className="flex flex-col w-full lg:w-[360px] relative"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-label-large text-heat-100 mb-16 font-medium text-center">AI-forbedret analyse</h3>
                <div
                  className={`transition-all ${
                    inTease ? 'opacity-40 select-none blur-[1px] pointer-events-none' : ''
                  }`}
                >
                  <RadarChart
                    data={
                      inTease
                        ? AI_TEASE_RADAR_DATA
                        : aiInsights
                            .filter(check => check.status !== 'pending' && check.status !== 'checking')
                            .slice(0, 8)
                            .map(check => ({
                              label: check.label,
                              score: check.score || 0,
                            }))
                    }
                    size={300}
                  />
                </div>
                {inTease && <AITeaseCTA onClick={handleAIClick} />}
              </motion.div>
            )}
          </motion.div>

          {aiInsights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mb-20"
            >
              <div className="inline-flex items-center gap-8 px-16 py-8 bg-heat-4 rounded-8">
                <span className="text-label-medium text-accent-black">
                  AI-analysen fandt {aiInsights.filter(i => i.score && i.score < 50).length} yderligere forbedringsområder
                </span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Bar Chart View */}
      {viewMode === 'bars' && showResults && (
        <motion.div
          className="px-0 md:px-40 mb-40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MetricBars
            metrics={combinedChecks
              .filter(check => check.status !== 'pending' && check.status !== 'checking')
              .filter(check => !(check as any).isAI)
              .map(check => ({
                label: check.label,
                score: check.score || 0,
                status: check.status as 'pass' | 'warning' | 'fail',
                category: ['robots-txt', 'sitemap', 'llms-txt'].includes(check.id) ? 'domain' : 'page',
                details: check.details,
                recommendation: check.recommendation,
                actionItems: check.actionItems,
              }))}
          />

          {inTease && (
            <div className="relative mt-40">
              <div className="opacity-40 select-none blur-[1px] pointer-events-none">
                <MetricBars metrics={AI_TEASE_BAR_METRICS} />
              </div>
              <AITeaseCTA onClick={handleAIClick} />
            </div>
          )}

          {aiInsights.length > 0 && (
            <div className="mt-40">
              <MetricBars
                metrics={aiInsights.map(check => ({
                  label: check.label,
                  score: check.score || 0,
                  status: check.status as 'pass' | 'warning' | 'fail',
                  category: 'ai' as const,
                  details: check.details,
                  recommendation: check.recommendation,
                  actionItems: check.actionItems,
                }))}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Action Buttons */}
      {showResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex gap-12 justify-center"
        >
          <button
            onClick={onReset}
            className="px-20 py-10 bg-accent-white border border-black-alpha-8 hover:bg-black-alpha-4 rounded-8 text-label-medium transition-all"
          >
            Analysér en anden side
          </button>
        </motion.div>
      )}

      <HubspotGate
        isOpen={gateOpen}
        onClose={() => setGateOpen(false)}
        onSuccess={handleGateSuccess}
        websiteUrl={url}
      />

      <DetailDrawer
        check={selectedCheck}
        onClose={() => setSelectedCheck(null)}
      />

    </motion.div>
  );
}