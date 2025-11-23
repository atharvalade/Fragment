"use client";

import { useState, ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, TrendingUp, Upload, Loader2, CheckCircle2, Info, ArrowLeft, 
  Package, Shield, Database, Cpu, ExternalLink, Activity, Zap, Clock, ChevronDown
} from "lucide-react";
import Link from "next/link";
import { getApiUrl } from "@/lib/config";

interface SubmissionLog {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

interface CreatingFragment {
  index: number;
  text: string;
  status: 'creating' | 'uploading' | 'encrypting' | 'done';
  filecoinUrl?: string;
  blobId?: string;
  encryptionId?: string;
}

interface Fragment {
  fragmentId: string;
  fragmentIndex: number;
  status: string;
  data: { text: string };
  bountyAmount: number;
  filecoinUrl?: string;
  blobId?: string;
  encryptionId?: string;
  workerId?: string;
  result?: {
    filecoinUrl: string;
    blobId: string;
  };
}

interface JobStatus {
  jobId: string;
  totalFragments: number;
  completedFragments: number;
  status: string;
  fragments: Fragment[];
}

interface Dataset {
  datasetId: number;
  count: number;
  pieces: Array<{
    datasetId: number;
    cid: string;
    cdnUrl: string;
  }>;
}

interface DatasetPreview {
  datasetId: number;
  loading: boolean;
  data: any[];
}

export default function SubmitJob() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [submissionLogs, setSubmissionLogs] = useState<SubmissionLog[]>([]);
  const [creatingFragments, setCreatingFragments] = useState<CreatingFragment[]>([]);

  // Dataset selection
  const [availableDatasets, setAvailableDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [useExistingDataset, setUseExistingDataset] = useState(true);
  const [datasetPreviews, setDatasetPreviews] = useState<Map<number, DatasetPreview>>(new Map());
  const [showingDatasetId, setShowingDatasetId] = useState<number | null>(null);

  // AI Form State
  const [aiText, setAiText] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiPrompt, setAiPrompt] = useState("Classify the following text as 'safe' or 'unsafe' based on harmful content (hate speech, violence, sexual content, etc.). Respond with only 'safe' or 'unsafe'.");
  
  // Load available datasets
  useEffect(() => {
    fetch(getApiUrl('/api/datasets'))
      .then(res => res.json())
      .then(data => {
        setAvailableDatasets(data.datasets || []);
        if (data.datasets && data.datasets.length > 0) {
          setSelectedDatasetId(data.datasets[0].datasetId);
        }
      })
      .catch(console.error);
  }, []);

  // Load dataset preview
  const loadDatasetPreview = async (datasetId: number) => {
    if (datasetPreviews.has(datasetId)) {
      setShowingDatasetId(showingDatasetId === datasetId ? null : datasetId);
      return;
    }

    setShowingDatasetId(datasetId);
    setDatasetPreviews(prev => new Map(prev).set(datasetId, { datasetId, loading: true, data: [] }));

    const dataset = availableDatasets.find(d => d.datasetId === datasetId);
    if (!dataset) return;

    try {
      const dataPromises = dataset.pieces.map(piece =>
        fetch(piece.cdnUrl).then(res => res.json())
      );
      const allData = await Promise.all(dataPromises);
      
      setDatasetPreviews(prev => new Map(prev).set(datasetId, { 
        datasetId, 
        loading: false, 
        data: allData 
      }));
    } catch (error) {
      console.error('Error loading dataset preview:', error);
      setDatasetPreviews(prev => new Map(prev).set(datasetId, { 
        datasetId, 
        loading: false, 
        data: [] 
      }));
    }
  };

  const addLog = (type: SubmissionLog['type'], message: string) => {
    setSubmissionLogs(prev => [...prev, { type, message, timestamp: Date.now() }]);
  };

  // Poll for job status updates
  useEffect(() => {
    if (!jobId || !submitted || isSubmitting) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(getApiUrl(`/api/jobs/${jobId}`));
        if (response.ok) {
          const data = await response.json();
          setJobStatus(data);
        }
      } catch (error) {
        console.error("Error polling job status:", error);
      }
    }, 2000);

    fetch(getApiUrl(`/api/jobs/${jobId}`))
      .then(res => res.json())
      .then(data => setJobStatus(data))
      .catch(console.error);

    return () => clearInterval(pollInterval);
  }, [jobId, submitted, isSubmitting]);

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on selection mode
    if (useExistingDataset && !selectedDatasetId) {
      alert("Please select a dataset.");
      return;
    }
    
    if (!useExistingDataset && !aiText && !aiFile) {
      alert("Please enter text or upload a file.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionLogs([]);
    setCreatingFragments([]);
    addLog('info', '🚀 Starting job submission...');

    let requestBody: any = {
      jobType: 'gemma-text-classification',
      bountyPerFragment: 0.01,
      prompt: aiPrompt
    };

    // Option 1: Use existing Filecoin dataset
    if (useExistingDataset && selectedDatasetId) {
      addLog('info', `📦 Using existing Filecoin dataset ${selectedDatasetId}`);
      requestBody.datasetId = selectedDatasetId;
      
      const dataset = availableDatasets.find(d => d.datasetId === selectedDatasetId);
      if (dataset) {
        addLog('success', `✅ Dataset has ${dataset.count} fragments`);
        addLog('info', `💰 Total bounty: ${(dataset.count * 0.01).toFixed(2)} wSAGA`);
      }
    }
    // Option 2: Upload new data
    else {
      let dataToSend: any[] = [];
      if (aiFile) {
        addLog('info', `📁 Reading file: ${aiFile.name}`);
        const fileContent = await aiFile.text();
        const lines = fileContent.split('\n').slice(1).filter(line => line.trim() !== '');
        dataToSend = lines.map((line, i) => ({
          text: line.replace(/^["']|["']$/g, '').trim()
        }));
        addLog('success', `✅ Loaded ${dataToSend.length} sentences from CSV`);
      } else if (aiText) {
        dataToSend = [{ text: aiText }];
        addLog('info', `📝 Processing single text input`);
      }
      
      requestBody.data = dataToSend;

      // Only show fragment creation UI if uploading new data
      if (!useExistingDataset && requestBody.data) {
        const initialFragments: CreatingFragment[] = requestBody.data.map((item: any, i: number) => ({
          index: i,
          text: item.text,
          status: 'creating'
        }));
        setCreatingFragments(initialFragments);
        
        addLog('info', `📦 Creating ${requestBody.data.length} fragments...`);
      }
    }

    try {
      addLog('info', `🔗 Connecting to Fragment backend...`);
      addLog('info', `⛓️  Submitting to blockchain with Filecoin CIDs...`);

      const response = await fetch(getApiUrl('/api/jobs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit job");
      }

      const result = await response.json();
      
      addLog('success', `✅ Job created: ${result.jobId}`);
      addLog('success', `📊 ${result.totalFragments} fragments on blockchain`);
      addLog('success', `🔗 Transaction: ${result.transactionHash.substring(0, 16)}...`);
      addLog('info', `🌐 Explorer: ${result.explorerUrl}`);
      addLog('info', `⚡ Job now available to Mac workers...`);

      setJobId(result.jobId);
      
      // Wait a moment before transitioning
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitted(true);
      setIsSubmitting(false);
    } catch (error: any) {
      console.error("Error submitting job:", error);
      addLog('error', `❌ Error: ${error.message}`);
      alert(`Error: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-blue-500/30 bg-blue-500/5';
      case 'claimed': return 'border-orange-500/30 bg-orange-500/5';
      case 'completed': return 'border-green-500/30 bg-green-500/5';
      default: return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': 
        return <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-500 border border-blue-500/20">PENDING</span>;
      case 'claimed': 
        return <span className="px-2 py-1 rounded text-xs bg-orange-500/10 text-orange-500 border border-orange-500/20">PROCESSING</span>;
      case 'completed': 
        return <span className="px-2 py-1 rounded text-xs bg-green-500/10 text-green-500 border border-green-500/20">COMPLETED</span>;
      default: 
        return <span className="px-2 py-1 rounded text-xs bg-gray-500/10 text-gray-500 border border-gray-500/20">{status.toUpperCase()}</span>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Package className="w-4 h-4 text-blue-500" />;
      case 'claimed': return <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default: return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCreatingStatusIcon = (status: CreatingFragment['status']) => {
    switch (status) {
      case 'creating': return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      case 'uploading': return <Database className="w-3 h-3 text-purple-500 animate-pulse" />;
      case 'encrypting': return <Shield className="w-3 h-3 text-blue-500 animate-pulse" />;
      case 'done': return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    }
  };

  const getCreatingStatusText = (status: CreatingFragment['status']) => {
    switch (status) {
      case 'creating': return 'Creating...';
      case 'uploading': return 'Uploading to Filecoin...';
      case 'encrypting': return 'Encrypting with Hyperlane...';
      case 'done': return 'Ready';
    }
  };

  const getLogIcon = (type: SubmissionLog['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getLogColor = (type: SubmissionLog['type']) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  // Submitting view with real-time fragment creation
  if (isSubmitting && !submitted) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-2">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-lg font-bold gradient-text">
                ⚡ Fragment
              </Link>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 pt-20 pb-16 max-w-6xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2 gradient-text">Creating Your Job...</h1>
            <p className="text-muted-foreground">Fragmenting, encrypting, and uploading to Filecoin</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logs */}
            <div className="lg:col-span-1">
              <div className="border rounded-lg overflow-hidden sticky top-24">
                <div className="bg-muted/50 px-4 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                    <h3 className="font-semibold text-sm">Live Logs</h3>
                  </div>
                </div>
                <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto bg-black/20 font-mono text-xs">
                  {submissionLogs.map((log, i) => (
                    <div key={i} className={`flex items-start gap-2 ${getLogColor(log.type)}`}>
                      <span>{getLogIcon(log.type)}</span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fragment Creation Progress */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Fragments Being Created</h2>
                <p className="text-sm text-muted-foreground">Each fragment is encrypted and uploaded to Filecoin</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {creatingFragments.map((fragment) => (
                  <div
                    key={fragment.index}
                    className={`border rounded-lg p-4 transition-all ${
                      fragment.status === 'done' ? 'border-green-500/30 bg-green-500/5' :
                      fragment.status === 'encrypting' ? 'border-blue-500/30 bg-blue-500/5' :
                      fragment.status === 'uploading' ? 'border-purple-500/30 bg-purple-500/5' :
                      'border-gray-500/30 bg-gray-500/5'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getCreatingStatusIcon(fragment.status)}
                        <span className="font-semibold text-sm">Fragment #{fragment.index}</span>
                      </div>
                      <span className={`text-xs font-medium ${
                        fragment.status === 'done' ? 'text-green-500' :
                        fragment.status === 'encrypting' ? 'text-blue-500' :
                        fragment.status === 'uploading' ? 'text-purple-500' :
                        'text-gray-500'
                      }`}>
                        {getCreatingStatusText(fragment.status)}
                      </span>
                    </div>

                    {/* Text */}
                    <div className="mb-3 p-2 bg-black/20 rounded text-xs">
                      <p className="line-clamp-2 text-muted-foreground">
                        "{fragment.text}"
                      </p>
                    </div>

                    {/* Progress indicator */}
                    {fragment.status !== 'done' && (
                      <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" 
                             style={{ width: fragment.status === 'creating' ? '33%' : fragment.status === 'uploading' ? '66%' : '99%' }}
                        />
                      </div>
                    )}

                    {fragment.status === 'done' && fragment.blobId && (
                      <div className="space-y-2 text-xs">
                        <div className="p-2 bg-purple-500/10 rounded border border-purple-500/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Database className="w-3 h-3 text-purple-500" />
                            <span className="text-muted-foreground font-semibold">Filecoin</span>
                          </div>
                          <code className="text-purple-400 font-mono text-[10px] break-all">
                            {fragment.blobId}
                          </code>
                        </div>
                        {fragment.encryptionId && (
                          <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="w-3 h-3 text-blue-500" />
                              <span className="text-muted-foreground font-semibold">Hyperlane</span>
                            </div>
                            <code className="text-blue-400 font-mono text-[10px] break-all">
                              {fragment.encryptionId}
                            </code>
                          </div>
                        )}
                      </div>
                    )}
                    {fragment.status === 'done' && !fragment.blobId && (
                      <div className="flex items-center gap-2 text-xs text-green-500">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Encrypted & uploaded</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Job tracking view
  if (submitted) {
    const totalFragments = jobStatus?.totalFragments || 0;
    const completedFragments = jobStatus?.completedFragments || 0;
    const processingFragments = jobStatus?.fragments.filter(f => f.status === 'claimed').length || 0;
    const pendingFragments = jobStatus?.fragments.filter(f => f.status === 'pending').length || 0;
    const progress = totalFragments > 0 ? (completedFragments / totalFragments) * 100 : 0;

    return (
      <div className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-2">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-lg font-bold gradient-text">
                ⚡ Fragment
              </Link>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 pt-20 pb-16 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 gradient-text">Real-Time Job Processing</h1>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Job ID:</span>
                  <code className="px-2 py-1 bg-muted/50 rounded font-mono text-xs">
                    {jobId}
                  </code>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">Completion</div>
                <div className="text-4xl font-bold gradient-text">
                  {Math.round(progress)}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden border border-white/5">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 opacity-50 animate-pulse bg-white/20" />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</span>
              </div>
              <div className="text-3xl font-bold text-blue-500">{totalFragments}</div>
            </div>
            
            <div className="border rounded-lg p-4 bg-gradient-to-br from-gray-500/5 to-gray-500/10 border-gray-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-gray-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</span>
              </div>
              <div className="text-3xl font-bold text-gray-500">{pendingFragments}</div>
            </div>
            
            <div className="border rounded-lg p-4 bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-5 h-5 text-orange-500 animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Processing</span>
              </div>
              <div className="text-3xl font-bold text-orange-500">{processingFragments}</div>
            </div>
            
            <div className="border rounded-lg p-4 bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</span>
              </div>
              <div className="text-3xl font-bold text-green-500">{completedFragments}</div>
            </div>
            
            <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cost</span>
              </div>
              <div className="text-2xl font-bold text-purple-500">
                {(totalFragments * 0.01).toFixed(2)} <span className="text-sm">USDC</span>
              </div>
            </div>
          </div>

          {/* Fragments Grid */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Fragment Details</h2>
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Activity className="w-3 h-3 animate-pulse text-green-500" />
                Updates every 2 seconds
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobStatus?.fragments.map((fragment) => (
                <div
                  key={fragment.fragmentId}
                  className={`border rounded-lg p-4 transition-all ${getStatusColor(fragment.status)} hover:border-white/20`}
                >
                  {/* Fragment Header */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(fragment.status)}
                      <div>
                        <div className="font-semibold text-sm">Fragment #{fragment.fragmentIndex}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {fragment.fragmentId.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(fragment.status)}
                  </div>

                  {/* Fragment Data */}
                  <div className="mb-3 p-3 bg-black/20 rounded text-xs border border-white/5">
                    <div className="text-muted-foreground mb-1 font-semibold">Input:</div>
                    <p className="line-clamp-2">
                      "{fragment.data.text}"
                    </p>
                  </div>

                  {/* Technical Details */}
                  <div className="space-y-2 text-xs">
                    {/* Bounty */}
                    <div className="flex items-center justify-between p-2 bg-green-500/5 rounded border border-green-500/20">
                      <span className="text-muted-foreground">Bounty:</span>
                      <span className="font-mono font-semibold text-green-500">
                        +{fragment.bountyAmount.toFixed(2)} USDC
                      </span>
                    </div>

                    {/* Filecoin Storage */}
                    {fragment.filecoinUrl && (
                      <div className="p-2 bg-purple-500/5 rounded border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Database className="w-3 h-3 text-purple-500" />
                          <span className="text-muted-foreground font-semibold">Filecoin Storage</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-purple-400 font-mono truncate">
                            {fragment.blobId}
                          </code>
                          <a
                            href={fragment.filecoinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-500 hover:text-purple-400"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Hyperlane Encryption */}
                    {fragment.encryptionId && (
                      <div className="p-2 bg-blue-500/5 rounded border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-3 h-3 text-blue-500" />
                          <span className="text-muted-foreground font-semibold">Hyperlane Encryption</span>
                        </div>
                        <code className="text-blue-400 font-mono text-[10px] break-all">
                          {fragment.encryptionId}
                        </code>
                      </div>
                    )}

                    {/* Worker Info */}
                    {fragment.workerId && (
                      <div className="p-2 bg-orange-500/5 rounded border border-orange-500/20">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3 h-3 text-orange-500" />
                          <span className="text-muted-foreground font-semibold mr-2">Worker:</span>
                          <code className="text-orange-400 font-mono">
                            {fragment.workerId.substring(0, 12)}...
                          </code>
                        </div>
                      </div>
                    )}

                    {/* Result */}
                    {fragment.result && (
                      <div className="p-2 bg-green-500/5 rounded border border-green-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span className="text-muted-foreground font-semibold">Result</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-green-400 font-mono truncate">
                            {fragment.result.blobId}
                          </code>
                          <a
                            href={fragment.result.filecoinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500 hover:text-green-400"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSubmitted(false);
                setAiText("");
                setAiFile(null);
                setJobId("");
                setJobStatus(null);
                setSubmissionLogs([]);
                setIsSubmitting(false);
                setCreatingFragments([]);
              }}
            >
              New Job
            </Button>
            {progress === 100 && (
              <Button
                className="flex-1"
                variant="default"
                onClick={async () => {
                  try {
                    const response = await fetch(getApiUrl(`/api/jobs/${jobId}/results`));
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `results_${jobId.substring(0, 8)}.csv`;
                    a.click();
                  } catch (error) {
                    console.error("Error downloading results:", error);
                  }
                }}
              >
                Download Results CSV
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Submission form
  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-lg font-bold gradient-text">
              ⚡ Fragment
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-20 pb-16 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Submit a job</h1>
          <p className="text-muted-foreground">
            Choose your compute task and configure the parameters
          </p>
        </div>

        <div className="border rounded-lg">
          <Tabs defaultValue="ai">
            <TabsList className="w-full">
              <TabsTrigger value="ai" className="flex-1">
                <Brain className="w-4 h-4 mr-2" />
                AI Moderation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="p-6 space-y-6">
              <form onSubmit={handleAISubmit} className="space-y-6">
                {/* Dataset Selection Toggle */}
                <div className="bg-muted/30 rounded-lg p-4 border border-white/10">
                  <Label className="text-base font-semibold mb-3 block">Data Source</Label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setUseExistingDataset(true)}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                        useExistingDataset 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Package className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-sm font-medium">Use Existing Dataset</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {availableDatasets.length} datasets available
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseExistingDataset(false)}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                        !useExistingDataset 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Upload className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-sm font-medium">Upload New Data</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        CSV or text input
                      </div>
                    </button>
                  </div>
                </div>

                {/* Option 1: Select Existing Dataset */}
                {useExistingDataset && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-semibold">Available Filecoin Datasets</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select a dataset that's already stored on Filecoin
                      </p>
                    </div>

                    {availableDatasets.length === 0 ? (
                      <div className="p-8 text-center border border-dashed rounded-lg">
                        <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No datasets available</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Upload new data to create your first dataset
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {availableDatasets.map(dataset => {
                          const isSelected = selectedDatasetId === dataset.datasetId;
                          const preview = datasetPreviews.get(dataset.datasetId);
                          const isShowing = showingDatasetId === dataset.datasetId;

                          return (
                            <div
                              key={dataset.datasetId}
                              className={`border rounded-lg transition-all ${
                                isSelected 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-white/10 hover:border-white/20'
                              }`}
                            >
                              {/* Dataset Header */}
                              <div
                                onClick={() => setSelectedDatasetId(dataset.datasetId)}
                                className="p-4 cursor-pointer"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                      isSelected ? 'bg-primary/20' : 'bg-muted'
                                    }`}>
                                      <Database className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-sm">Dataset #{dataset.datasetId}</div>
                                      <div className="text-xs text-muted-foreground">{dataset.count} fragments</div>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                  )}
                                </div>

                                {/* Dataset Stats */}
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                  <div className="p-2 bg-muted/30 rounded">
                                    <div className="text-xs text-muted-foreground">Fragments</div>
                                    <div className="font-semibold text-sm">{dataset.count}</div>
                                  </div>
                                  <div className="p-2 bg-muted/30 rounded">
                                    <div className="text-xs text-muted-foreground">Cost</div>
                                    <div className="font-semibold text-sm text-green-500">{(dataset.count * 0.1).toFixed(1)} wSAGA</div>
                                  </div>
                                  <div className="p-2 bg-muted/30 rounded">
                                    <div className="text-xs text-muted-foreground">Storage</div>
                                    <div className="font-semibold text-sm">Filecoin</div>
                                  </div>
                                </div>

                                {/* Piece CIDs */}
                                <div className="space-y-2">
                                  {dataset.pieces.slice(0, 2).map((piece, idx) => (
                                    <div key={piece.cid} className="p-2 bg-black/20 rounded text-xs">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-muted-foreground">Fragment #{idx}:</span>
                                        <code className="text-purple-400 font-mono">{piece.cid.substring(0, 20)}...</code>
                                      </div>
                                      <a
                                        href={piece.cdnUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>View on Filecoin CDN</span>
                                      </a>
                                    </div>
                                  ))}
                                  {dataset.pieces.length > 2 && (
                                    <div className="text-xs text-muted-foreground text-center">
                                      +{dataset.pieces.length - 2} more fragments
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Preview Button & Content */}
                              <div className="border-t border-white/10 p-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadDatasetPreview(dataset.datasetId);
                                  }}
                                >
                                  {preview?.loading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Loading content...
                                    </>
                                  ) : isShowing ? (
                                    <>
                                      <ChevronDown className="w-4 h-4 mr-2 rotate-180" />
                                      Hide Dataset Content
                                    </>
                                  ) : (
                                    <>
                                      <Info className="w-4 h-4 mr-2" />
                                      View Dataset Content
                                    </>
                                  )}
                                </Button>

                                {/* Dataset Content Preview */}
                                {isShowing && preview && !preview.loading && (
                                  <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
                                    {preview.data.map((item, idx) => (
                                      <div key={idx} className="p-3 bg-black/40 rounded border border-white/5">
                                        <div className="text-xs text-muted-foreground mb-1">Fragment #{idx}</div>
                                        <div className="text-sm">{JSON.stringify(item.data || item, null, 2)}</div>
                                        <div className="text-xs text-muted-foreground mt-2">
                                          Timestamp: {item.timestamp || 'N/A'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Option 2: Upload New Data */}
                {!useExistingDataset && (
                  <>
                    <div>
                      <Label htmlFor="ai-text">Text content</Label>
                      <Textarea
                        id="ai-text"
                        placeholder="Enter text to analyze for safety..."
                        className="mt-2 min-h-[120px] resize-none"
                        value={aiText}
                        onChange={(e) => setAiText(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        AI will analyze this text for harmful content
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="ai-file">Upload CSV file (optional)</Label>
                      <div className="mt-2 relative border-2 border-dashed rounded-lg p-6 hover:border-muted-foreground/50 transition-colors">
                        <input
                          id="ai-file"
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept=".csv"
                          onChange={(e) => setAiFile(e.target.files?.[0] || null)}
                        />
                        <div className="text-center">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm">
                            {aiFile ? aiFile.name : "Click to upload or drag and drop"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            CSV file with a text column (one sentence per line)
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="ai-prompt">AI Prompt</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="Enter the prompt for the AI model..."
                    className="mt-2 min-h-[80px] resize-none"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This prompt will be used by Gemma model on Mac workers
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">
                        This will create a decentralized compute job on the Fragment network.
                        Each sentence will be encrypted with Hyperlane, stored on Filecoin, and processed by Mac workers.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || (useExistingDataset ? !selectedDatasetId : (!aiText && !aiFile))}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting to blockchain...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Submit Job with {useExistingDataset ? 'Existing Dataset' : 'New Data'}
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

