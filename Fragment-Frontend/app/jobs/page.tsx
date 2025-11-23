"use client";

import { useState, ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle2, Loader2, ArrowLeft, ExternalLink, Package, Shield, Database, Cpu } from "lucide-react";
import Link from "next/link";
import { getApiUrl } from "@/lib/config";

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

export default function JobsPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("Classify the following text as 'safe' or 'unsafe' based on whether it contains hate speech, violence, or harmful content.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [jobId, setJobId] = useState<string>("");
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      
      // Read file content
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvContent(content);
      };
      reader.readAsText(file);
    }
  };

  // Poll for job status updates
  useEffect(() => {
    if (!jobId || !submitted) return;

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
    }, 2000); // Poll every 2 seconds

    // Initial fetch
    fetch(getApiUrl(`/api/jobs/${jobId}`))
      .then(res => res.json())
      .then(data => setJobStatus(data))
      .catch(console.error);

    return () => clearInterval(pollInterval);
  }, [jobId, submitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!csvContent || !prompt) {
      alert('Please upload a CSV file and provide a prompt');
      return;
    }

    setIsSubmitting(true);

    try {
      const lines = csvContent.split('\n').slice(1).filter(line => line.trim());
      const data = lines.map(line => ({
        text: line.replace(/^["']|["']$/g, '').trim()
      }));

      const response = await fetch(getApiUrl('/api/jobs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          jobType: 'gemma-text-classification',
          bountyPerFragment: 0.01,
          prompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit job");
      }

      const result = await response.json();
      setJobId(result.jobId);
      setSubmitted(true);
    } catch (error: any) {
      console.error("Error submitting job:", error);
      alert(`Error: ${error.message}`);
    } finally {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Package className="w-4 h-4 text-blue-500" />;
      case 'claimed': return <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default: return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  if (submitted) {
    const totalFragments = jobStatus?.totalFragments || 0;
    const completedFragments = jobStatus?.completedFragments || 0;
    const progress = totalFragments > 0 ? (completedFragments / totalFragments) * 100 : 0;

    return (
      <div className="min-h-screen bg-background">
        {/* Navigation */}
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

        <div className="container mx-auto px-4 pt-20 pb-16 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-semibold mb-2">Job Processing</h1>
                <p className="text-sm text-muted-foreground font-mono">
                  Job ID: {jobId.substring(0, 8)}...{jobId.substring(jobId.length - 8)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">Progress</div>
                <div className="text-3xl font-bold gradient-text">
                  {completedFragments}/{totalFragments}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Total Fragments</span>
              </div>
              <div className="text-2xl font-bold">{totalFragments}</div>
            </div>
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Processing</span>
              </div>
              <div className="text-2xl font-bold text-orange-500">
                {jobStatus?.fragments.filter(f => f.status === 'claimed').length || 0}
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Completed</span>
              </div>
              <div className="text-2xl font-bold text-green-500">{completedFragments}</div>
            </div>
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Total Cost</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {(totalFragments * 0.01).toFixed(2)} <span className="text-sm">USDC</span>
              </div>
            </div>
          </div>

          {/* Fragments Grid */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Fragments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobStatus?.fragments.map((fragment) => (
                <div
                  key={fragment.fragmentId}
                  className={`border rounded-lg p-4 transition-all ${getStatusColor(fragment.status)}`}
                >
                  {/* Fragment Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(fragment.status)}
                      <span className="font-semibold text-sm">
                        Fragment #{fragment.fragmentIndex}
                      </span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">
                      +{fragment.bountyAmount.toFixed(2)} USDC
                    </span>
                  </div>

                  {/* Fragment Data */}
                  <div className="mb-3 p-2 bg-muted/30 rounded text-xs">
                    <p className="line-clamp-2 text-muted-foreground">
                      {fragment.data.text}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`font-medium ${
                      fragment.status === 'completed' ? 'text-green-500' :
                      fragment.status === 'claimed' ? 'text-orange-500' : 'text-blue-500'
                    }`}>
                      {fragment.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Links */}
                  <div className="space-y-2">
                    {/* Input Data Links */}
                    {fragment.filecoinUrl && (
                      <div className="flex items-center gap-2">
                        <Database className="w-3 h-3 text-purple-500" />
                        <a
                          href={fragment.filecoinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-500 hover:underline flex items-center gap-1"
                        >
                          Input on Filecoin
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {fragment.encryptionId && (
                      <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-muted-foreground font-mono">
                          Hyperlane: {fragment.encryptionId.substring(0, 10)}...
                        </span>
                      </div>
                    )}

                    {/* Worker Info */}
                    {fragment.workerId && (
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3 h-3 text-orange-500" />
                        <span className="text-xs text-muted-foreground">
                          Worker: {fragment.workerId.substring(0, 8)}...
                        </span>
                      </div>
                    )}

                    {/* Result Links */}
                    {fragment.result && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <a
                          href={fragment.result.filecoinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-500 hover:underline flex items-center gap-1"
                        >
                          Result on Filecoin
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            <Button
              className="flex-1"
              onClick={() => {
                setSubmitted(false);
                setCsvFile(null);
                setCsvContent("");
                setJobId("");
                setJobStatus(null);
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
                <FileText className="w-4 h-4 mr-2" />
                Download Results
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Submit AI Classification Job</h1>
          <p className="text-muted-foreground">
            Upload a CSV file with text to classify using Gemma AI
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CSV Upload */}
          <div>
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="mt-2 relative border-2 border-dashed rounded-lg p-6 hover:border-muted-foreground/50 transition-colors">
              <input
                id="csv-file"
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".csv"
                onChange={handleFileChange}
              />
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm">
                  {csvFile ? csvFile.name : "Click to upload or drag and drop"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV file with text data (one sentence per line)
                </p>
              </div>
            </div>
            {csvFile && (
              <p className="text-xs text-green-600 mt-2">
                ✓ {csvContent.split('\n').filter(l => l.trim()).length - 1} sentences loaded
              </p>
            )}
          </div>

          {/* Prompt */}
          <div>
            <Label htmlFor="prompt">AI Classification Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Enter the prompt for the AI model..."
              className="mt-2 min-h-[100px] resize-none"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              This prompt will be used by the Gemma model on Mac workers for classification.
            </p>
          </div>

          {/* Info Box */}
          {csvFile && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fragments</span>
                <span className="font-medium">
                  {csvContent.split('\n').filter(l => l.trim()).length - 1}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. Time</span>
                <span className="font-medium">
                  ~{Math.ceil((csvContent.split('\n').filter(l => l.trim()).length - 1) / 60)} min
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost</span>
                <span className="font-medium text-green-600">
                  {((csvContent.split('\n').filter(l => l.trim()).length - 1) * 0.01).toFixed(2)} USDC
                </span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !csvFile || !prompt}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fragmenting and uploading to Filecoin...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Submit Job
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

