import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { aiService } from '@/services/ai';
import { supabase } from '@/lib/supabase';
import { useEligibilityChecks } from '@/hooks/use-document-data';
import { useToast } from '@/hooks/use-toast';
import type { Workspace, DocumentRecord, EligibilityCheck, MatchedCondition } from '@/types';

const statusConfig = {
  likely_eligible: { label: 'Likely Eligible', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/30' },
  needs_more_info: { label: 'Needs More Information', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10 border-warning/30' },
  likely_not_eligible: { label: 'Likely Not Eligible', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' },
};

export function EligibilityTab() {
  const { doc } = useOutletContext<{ workspace: Workspace; doc: DocumentRecord }>();
  const { checks, loading, reload } = useEligibilityChecks(doc.id);
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<{ key: string; question: string }[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const latest = checks[0];

  const startAssessment = async () => {
    setGenerating(true);
    try {
      // Fetch requirements to build questions
      const { data: reqs } = await supabase
        .from('document_requirements')
        .select('*')
        .eq('document_id', doc.id)
        .limit(8);

      if (reqs && reqs.length > 0) {
        setQuestions(reqs.map((r) => ({ key: r.id, question: r.description })));
      } else {
        // No requirements extracted yet — try AI directly
        const res = await aiService.checkEligibility(doc.id, {});
        await saveResult(res);
        toast({ title: 'Assessment complete', description: res.summary });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Assessment failed';
      toast({ title: 'Assessment failed', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const saveResult = async (res: {
    status: EligibilityCheck['status'];
    summary: string;
    matched: MatchedCondition[];
    unmatched: MatchedCondition[];
    missingDocuments: string[];
  }) => {
    await supabase.from('eligibility_checks').insert({
      document_id: doc.id,
      status: res.status,
      summary: res.summary,
      matched_conditions: res.matched,
      unmatched_conditions: res.unmatched,
      missing_documents: res.missingDocuments,
    });
    reload();
  };

  const submitAnswers = async () => {
    setGenerating(true);
    try {
      const res = await aiService.checkEligibility(doc.id, answers);
      await saveResult(res);
      setQuestions([]);
      setAnswers({});
      toast({ title: 'Assessment complete', description: res.summary });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Assessment failed';
      toast({ title: 'Assessment failed', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-muted/40" />;

  return (
    <div className="space-y-6">
      {!latest && questions.length === 0 && (
        <Card className="glass p-8 text-center">
          <CheckCircle2 size={36} className="mx-auto mb-4 text-primary" />
          <h2 className="font-display text-xl">AI Eligibility Assessment</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            AI will extract criteria from your document, ask you relevant questions,
            and compare your situation against the requirements.
          </p>
          <p className="mt-2 text-xs text-muted-foreground italic">
            Based on the uploaded document. Not official/legal advice.
          </p>
          <Button onClick={startAssessment} className="mt-6 gap-2" disabled={generating}>
            {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {generating ? 'Analyzing...' : 'Start Assessment'}
          </Button>
        </Card>
      )}

      {/* Questions form */}
      <AnimatePresence>
        {questions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="glass p-6">
              <h2 className="mb-4 font-display text-lg">Answer these questions</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                AI identified these criteria in your document. Provide your information to check eligibility.
              </p>
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.key} className="space-y-2">
                    <Label>{q.question}</Label>
                    <Input
                      value={answers[q.key] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                      placeholder="Your answer..."
                    />
                  </div>
                ))}
                <Button onClick={submitAnswers} className="gap-2" disabled={generating}>
                  {generating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  Check Eligibility
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      {latest && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className={`glass p-6 border ${statusConfig[latest.status].bg}`}>
            <div className="flex items-center gap-3">
              {(() => {
                const cfg = statusConfig[latest.status];
                return <cfg.icon size={32} className={cfg.color} />;
              })()}
              <div>
                <h2 className="font-display text-xl">{statusConfig[latest.status].label}</h2>
                {latest.summary && <p className="mt-1 text-sm text-muted-foreground">{latest.summary}</p>}
              </div>
            </div>
          </Card>

          {(latest.matched_conditions as MatchedCondition[])?.length > 0 && (
            <Card className="glass p-6">
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg text-success">
                <CheckCircle2 size={18} /> Matched Conditions
              </h3>
              <div className="space-y-2">
                {(latest.matched_conditions as MatchedCondition[]).map((c, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                    <div>
                      <p className="text-sm font-medium">{c.criterion}</p>
                      <p className="text-xs text-muted-foreground">Your answer: {c.user_value}</p>
                      {c.source_page && <p className="text-xs text-primary">Page {c.source_page}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(latest.unmatched_conditions as MatchedCondition[])?.length > 0 && (
            <Card className="glass p-6">
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg text-destructive">
                <XCircle size={18} /> Unmatched Conditions
              </h3>
              <div className="space-y-2">
                {(latest.unmatched_conditions as MatchedCondition[]).map((c, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <XCircle size={16} className="mt-0.5 shrink-0 text-destructive" />
                    <div>
                      <p className="text-sm font-medium">{c.criterion}</p>
                      <p className="text-xs text-muted-foreground">Your answer: {c.user_value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(latest.missing_documents as string[])?.length > 0 && (
            <Card className="glass p-6">
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg text-warning">
                <FileText size={18} /> Missing Documents
              </h3>
              <div className="flex flex-wrap gap-2">
                {(latest.missing_documents as string[]).map((d, i) => (
                  <Badge key={i} variant="outline" className="border-warning/30">{d}</Badge>
                ))}
              </div>
            </Card>
          )}

          <Button onClick={startAssessment} variant="outline" className="gap-2 glass">
            <Sparkles size={16} /> Re-run Assessment
          </Button>
        </motion.div>
      )}
    </div>
  );
}
