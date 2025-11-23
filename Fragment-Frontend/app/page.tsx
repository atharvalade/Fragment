"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Cpu, 
  Zap, 
  Shield, 
  Coins, 
  GitBranch, 
  Blocks,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Brain,
  TrendingUp,
  Server,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-lg font-bold gradient-text"
            >
              ⚡ Fragment
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <Link href="#features" className="text-xs hover:text-primary transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-xs hover:text-primary transition-colors">
                How It Works
              </Link>
              <Link href="/submit" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all hover:scale-105">
                Submit Job
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-16">
        <div className="container mx-auto max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-block px-3 py-1.5 rounded-full glass mb-6 border border-primary/30"
          >
            <span className="text-xs flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary" />
              Powered by SAGA • Filecoin • Hyperlane
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold mb-4 leading-tight"
          >
            Decentralized Compute,
            <br />
            <span className="gradient-text">Fragment by Fragment</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            Harness the untapped power of <span className="text-primary font-semibold">millions of idle Macs</span> for 
            AI inference and simulations. 10,000x cheaper than AWS. Zero gas fees for providers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12"
          >
            <Link
              href="/submit"
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all hover:scale-105 glow flex items-center gap-2 group"
            >
              Submit Your First Job
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="px-6 py-3 rounded-lg glass border border-primary/30 font-semibold text-sm hover:bg-white/5 transition-all">
              View Documentation
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
          >
            {[
              { label: "Cost Reduction", value: "10,000x", icon: Zap },
              { label: "Macs Available", value: "~100M", icon: Cpu },
              { label: "Fragments/sec", value: "10K+", icon: GitBranch },
              { label: "USDC Rewards", value: "$$$", icon: Coins },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                className="glass rounded-xl p-4 border border-white/10 hover:border-primary/30 transition-all hover:scale-105"
              >
                <stat.icon className="w-6 h-6 text-primary mb-2 mx-auto" />
                <div className="text-2xl font-bold gradient-text mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-12"
          >
            <ChevronDown className="w-6 h-6 text-muted-foreground animate-bounce mx-auto" />
          </motion.div>
        </div>
      </section>

      {/* Why Revolutionary Section */}
      <section id="features" className="relative z-10 py-16 px-6 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Why Fragment is <span className="gradient-text">Revolutionary</span>
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Traditional cloud computing is slow, expensive, and centralized. We're changing everything.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              {
                icon: GitBranch,
                title: "Micro-Task Fragment Protocol",
                description: "We break jobs into thousands of tiny, independent fragments. Massive parallelization means 100x faster completion than traditional queues.",
                stat: "100x faster",
                color: "blue"
              },
              {
                icon: Cpu,
                title: "Native Mac Optimization",
                description: "Core ML for AI inference, Apple Silicon advantages, and always-on consumer devices mean zero cold starts and instant execution.",
                stat: "Zero cold starts",
                color: "purple"
              },
              {
                icon: Shield,
                title: "Threshold Encryption with Hyperlane",
                description: "Your data is encrypted with threshold key management on SAGA. No single entity can access your information. True privacy.",
                stat: "Decentralized privacy",
                color: "pink"
              },
              {
                icon: Blocks,
                title: "Fault-Tolerant by Design",
                description: "Fragments automatically re-queue if workers go offline. No single point of failure. Jobs always complete, guaranteed.",
                stat: "99.99% reliability",
                color: "green"
              },
              {
                icon: Zap,
                title: "Idle Compute is Free Compute",
                description: "Mac users earn USDC from spare cycles. Requesters pay pennies vs AWS dollars. Everyone wins.",
                stat: "10,000x cheaper",
                color: "yellow"
              },
              {
                icon: Server,
                title: "No Centralized Bottlenecks",
                description: "Decentralized on SAGA blockchain. Filecoin for storage. Hyperlane for encryption. No AWS, no Google, no lock-in.",
                stat: "Fully decentralized",
                color: "indigo"
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass rounded-xl p-6 border border-white/10 hover:border-primary/30 transition-all hover:scale-105 group"
              >
                <div className={`w-12 h-12 rounded-lg bg-${feature.color}-500/10 border border-${feature.color}-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-500`} />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  {feature.description}
                </p>
                <div className="inline-block px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <span className="text-xs font-semibold text-primary">{feature.stat}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              From job submission to USDC payout in seconds
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Submit Your Job",
                description: "Upload your AI model inputs or simulation parameters through our beautiful dashboard. We support text classification, Monte Carlo simulations, and more.",
                icon: Brain,
              },
              {
                step: "02",
                title: "Automatic Fragmentation",
                description: "Our protocol breaks your job into thousands of micro-tasks. Each fragment is encrypted with Hyperlane and stored on Filecoin.",
                icon: GitBranch,
              },
              {
                step: "03",
                title: "Distributed Execution",
                description: "Mac workers claim fragments matching their capabilities. Jobs execute on idle machines using Core ML and native engines. No centralized servers.",
                icon: Cpu,
              },
              {
                step: "04",
                title: "Verified Completion",
                description: "Results are encrypted, uploaded to Filecoin, and verified on-chain. USDC bounties automatically transfer to worker wallets. Zero gas fees.",
                icon: CheckCircle2,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex flex-col md:flex-row items-center gap-6 glass rounded-xl p-6 border border-white/10"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center glow">
                    <item.icon className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="text-3xl font-bold text-primary/20 mb-1">{item.step}</div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative z-10 py-16 px-6 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Built for <span className="gradient-text">Real Work</span>
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              From content moderation to financial modeling
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-8 border border-white/10 hover:border-blue-500/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform glow">
                <Brain className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">AI Content Moderation</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Run Gemma safety classifiers on thousands of documents simultaneously. 
                Perfect for social platforms, content publishers, and community forums.
              </p>
              <ul className="space-y-2 mb-6">
                {["Batch text classification", "Gemma via Core ML", "Privacy-preserving", "Results in minutes"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/submit?type=ai"
                className="inline-flex items-center gap-2 text-blue-500 text-sm font-semibold hover:gap-3 transition-all"
              >
                Try AI Inference
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-8 border border-white/10 hover:border-purple-500/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform glow-purple">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Monte Carlo Simulations</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Run billions of financial simulation trials across distributed Macs. 
                Perfect for risk analysis, portfolio optimization, and market predictions.
              </p>
              <ul className="space-y-2 mb-6">
                {["Billions of trials", "Stock price predictions", "Parallel execution", "Statistical confidence"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/submit?type=simulation"
                className="inline-flex items-center gap-2 text-purple-500 text-sm font-semibold hover:gap-3 transition-all"
              >
                Run Simulation
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-10 border border-primary/30 text-center glow"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to <span className="gradient-text">Fragment</span> Your Work?
            </h2>
            <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto">
              Join the decentralized compute revolution. Submit your first job in under 60 seconds.
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-all hover:scale-105 glow group"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xl font-bold gradient-text">⚡ Fragment</div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Documentation
              </a>
              <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                GitHub
              </a>
              <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                SAGA Blockchain
              </a>
            </div>
          </div>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Powered by SAGA • Filecoin • Hyperlane • Built for Decentralized Compute
          </div>
        </div>
      </footer>
    </div>
  );
}

