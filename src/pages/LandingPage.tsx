import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, FileText, MessageSquare, CheckCircle2, ListTodo,
  Sparkles, ShieldCheck, Zap, Brain, Clock, Target, Layers, BookOpen,
} from 'lucide-react';
import { NeuralShader } from '@/components/NeuralShader';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Brain, title: 'AI Document Understanding', desc: 'Upload any document and let AI read, understand, and structure it into actionable intelligence.' },
  { icon: MessageSquare, title: 'Grounded Q&A', desc: 'Ask questions about your document and get answers backed by source citations. No hallucinations.' },
  { icon: CheckCircle2, title: 'Eligibility Assessment', desc: 'AI compares your situation against document criteria and tells you what matches and what is missing.' },
  { icon: ListTodo, title: 'Action Plans', desc: 'Convert document requirements into a prioritized, trackable task list with deadlines and sources.' },
  { icon: Clock, title: 'Deadline Intelligence', desc: 'Every important date is detected, ranked by urgency, and linked to its source page.' },
  { icon: Sparkles, title: 'AI Studio', desc: 'Generate infographics, mind maps, study guides, and flashcards from your document.' },
];

const steps = [
  { icon: FileText, label: 'Upload', desc: 'Drop your PDF or text document' },
  { icon: Brain, label: 'Understand', desc: 'AI reads and structures the content' },
  { icon: Layers, label: 'Extract', desc: 'Entities, deadlines, requirements surface' },
  { icon: MessageSquare, label: 'Ask', desc: 'Grounded Q&A with citations' },
  { icon: Target, label: 'Decide', desc: 'Eligibility checks and assessments' },
  { icon: ListTodo, label: 'Act', desc: 'Action plans and visual artifacts' },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Hero */}
      <section className="relative flex min-h-screen flex-col">
        <NeuralShader className="fixed inset-0 -z-10" />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
          <Logo />
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button size="sm">Open Workspace</Button>
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Sparkles size={14} /> AI Document Intelligence
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-5xl leading-tight tracking-tight md:text-7xl lg:text-8xl"
          >
            MIND MATRIX
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 font-display text-2xl text-gradient md:text-4xl"
          >
            Turn Documents Into Decisions.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg"
          >
            AI-powered document intelligence for understanding, questioning,
            analyzing and acting on complex information. Don't just read
            documents. Understand what to do.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Link to="/dashboard">
              <Button size="lg" className="gap-2">
                Analyze a Document <ArrowRight size={18} />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="glass">See How It Works</Button>
            </a>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
              <span className="text-xs tracking-widest">SCROLL</span>
              <div className="h-12 w-px bg-gradient-to-b from-primary/40 to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative bg-background px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl md:text-5xl">The Intelligence Pipeline</h2>
            <p className="mt-4 text-muted-foreground">
              From raw document to decision-ready intelligence in six stages.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass relative rounded-xl p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                    <step.icon size={18} className="text-primary" />
                  </div>
                  <span className="font-display text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="font-display text-base">{step.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-primary/30 lg:block" size={16} />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative bg-background px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl md:text-5xl">Everything You Need to Act</h2>
            <p className="mt-4 text-muted-foreground">
              Not just a summary. A complete intelligence workspace.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="glass group rounded-2xl p-6 transition-colors hover:border-primary/30"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 transition-transform group-hover:scale-110">
                  <f.icon size={22} className="text-primary" />
                </div>
                <h3 className="font-display text-xl">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech / trust */}
      <section className="relative bg-background px-6 py-24 md:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="glass-strong rounded-3xl p-10 text-center md:p-16">
            <ShieldCheck size={40} className="mx-auto text-primary" />
            <h2 className="mt-6 font-display text-3xl md:text-4xl">Your Data. Your Intelligence.</h2>
            <p className="mt-4 text-muted-foreground">
              Every document, conversation, and analysis is isolated to your
              account with Row Level Security. AI provider keys never touch
              your browser. All AI processing runs server-side.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-primary" /> RLS Isolation</span>
              <span className="flex items-center gap-2"><Zap size={16} className="text-primary" /> Server-Side AI</span>
              <span className="flex items-center gap-2"><BookOpen size={16} className="text-primary" /> Grounded Citations</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-background px-6 py-24 md:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-5xl">Stop Reading. Start Deciding.</h2>
          <p className="mt-4 text-muted-foreground">
            Upload your first document and experience the full intelligence pipeline.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row justify-center">
            <Link to="/dashboard">
              <Button size="lg" className="gap-2">
                Get Started Free <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10 md:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            AI Document Intelligence Workspace
          </p>
        </div>
      </footer>
    </div>
  );
}
