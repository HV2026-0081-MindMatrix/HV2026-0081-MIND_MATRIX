import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { createWorkspace } from '@/services/database';
import { useToast } from '@/hooks/use-toast';

const DEMO_TITLE = 'National STEM Scholarship Program 2026';
const DEMO_TEXT = `National STEM Scholarship Program 2026

Application Guidelines

Overview:
The National STEM Scholarship Program provides financial support to outstanding students pursuing degrees in Science, Technology, Engineering, and Mathematics. This scholarship covers tuition, books, and a monthly stipend for the duration of the degree program.

Eligibility Criteria:
- Applicants must be citizens or permanent residents of the United States.
- Applicants must have a minimum GPA of 3.5 on a 4.0 scale.
- Applicants must be enrolled or accepted into an accredited STEM degree program.
- Applicants must demonstrate financial need.
- Annual family income must not exceed $120,000.
- Applicants must be under 25 years of age as of January 1, 2026.

Required Documents:
1. Completed application form
2. Official academic transcripts
3. Two letters of recommendation from STEM faculty
4. Personal statement (maximum 1000 words)
5. Proof of income (tax returns or equivalent)
6. Proof of citizenship or permanent residency
7. FAFSA Student Aid Report

Important Deadlines:
- Application opens: September 1, 2025
- Application deadline: March 15, 2026
- Recommendation letters due: March 20, 2026
- Interview notifications sent: April 15, 2026
- Final award announcements: May 30, 2026

Award Details:
- Scholarship value: Up to $25,000 per year
- Duration: Up to 4 years (renewable annually)
- Monthly stipend: $500
- Book allowance: $1,000 per year

Rules and Conditions:
- Recipients must maintain a GPA of 3.0 or higher to renew the scholarship.
- Recipients must remain enrolled full-time in a STEM program.
- The scholarship may be revoked if the recipient changes to a non-STEM major.
- Recipients must complete 20 hours of community service per semester.
- The scholarship is non-transferable.

Application Process:
1. Submit the online application form with all required documents.
2. Applications are reviewed by the STEM Scholarship Committee.
3. Shortlisted candidates will be invited for an interview.
4. Final selections are made by the board of directors.

For questions, contact the scholarship office at scholarship@nationalstem.org or call (555) 123-4567.`;

export function DemoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Create demo workspace
        const ws = await createWorkspace('STEM Scholarship Demo', 'Demo workspace with sample scholarship document');

        // Create demo document
        const { data: doc, error: docErr } = await supabase
          .from('documents')
          .insert({
            workspace_id: ws.id,
            file_name: DEMO_TITLE + '.pdf',
            file_type: 'pdf',
            file_size: DEMO_TEXT.length,
            page_count: 5,
            processing_status: 'completed',
            analysis_status: 'completed',
          })
          .select()
          .single();
        if (docErr) throw docErr;

        // Insert analysis run
        await supabase.from('analysis_runs').insert({
          document_id: doc.id,
          summary: 'A STEM scholarship offering up to $25,000/year for students with 3.5+ GPA and family income under $120,000.',
          executive_summary: 'The National STEM Scholarship Program 2026 provides up to $25,000 per year for up to 4 years to US citizens or permanent residents pursuing STEM degrees. Applicants need a minimum 3.5 GPA, must be under 25, demonstrate financial need (family income under $120,000), and submit transcripts, recommendations, a personal statement, proof of income, citizenship proof, and FAFSA. The application deadline is March 15, 2026.',
          key_points: [
            'Scholarship covers up to $25,000/year for 4 years',
            'Minimum GPA requirement: 3.5 on 4.0 scale',
            'Family income must not exceed $120,000',
            'Application deadline: March 15, 2026',
            'Must be a US citizen or permanent resident',
            'Must be under 25 years old as of January 1, 2026',
            'Requires 7 supporting documents including FAFSA',
          ],
          simple_explanation: 'This is a scholarship for students studying science, technology, engineering, or math. It pays up to $25,000 per year for up to 4 years. You need good grades (3.5+ GPA), to be a US citizen or resident, under 25, and your family income must be under $120,000. You need to submit several documents including your grades, recommendation letters, and financial information by March 15, 2026.',
          topics: ['scholarship', 'STEM', 'financial aid', 'education', 'eligibility'],
          potential_risks: [
            'Scholarship is revoked if you switch to a non-STEM major',
            'GPA must stay above 3.0 to maintain the scholarship',
            'Must complete 20 hours of community service per semester',
            'Must remain enrolled full-time',
          ],
        });

        // Insert entities
        const entities = [
          { entity_type: 'organization', value: 'National STEM Scholarship Program', context: 'Scholarship provider' },
          { entity_type: 'amount', value: '$25,000', context: 'Annual scholarship value' },
          { entity_type: 'amount', value: '$500', context: 'Monthly stipend' },
          { entity_type: 'amount', value: '$1,000', context: 'Annual book allowance' },
          { entity_type: 'amount', value: '$120,000', context: 'Maximum family income' },
          { entity_type: 'percentage', value: '3.5 GPA', context: 'Minimum GPA requirement' },
          { entity_type: 'percentage', value: '3.0 GPA', context: 'Maintenance GPA requirement' },
          { entity_type: 'date', value: 'March 15, 2026', context: 'Application deadline' },
          { entity_type: 'date', value: 'May 30, 2026', context: 'Final award announcement' },
          { entity_type: 'date', value: 'January 1, 2026', context: 'Age cutoff date' },
          { entity_type: 'contact', value: 'scholarship@nationalstem.org', context: 'Contact email' },
          { entity_type: 'contact', value: '(555) 123-4567', context: 'Contact phone' },
          { entity_type: 'person', value: 'STEM faculty', context: 'Recommendation letter source' },
        ];
        await supabase.from('document_entities').insert(entities.map((e) => ({ ...e, document_id: doc.id })));

        // Insert deadlines
        const deadlines = [
          { event: 'Application opens', date: '2025-09-01', importance: 'medium', source_page: 3 },
          { event: 'Application deadline', date: '2026-03-15', importance: 'critical', description: 'Final deadline for submitting the application form and all required documents', source_page: 3 },
          { event: 'Recommendation letters due', date: '2026-03-20', importance: 'high', source_page: 3 },
          { event: 'Interview notifications', date: '2026-04-15', importance: 'high', source_page: 3 },
          { event: 'Final award announcements', date: '2026-05-30', importance: 'critical', source_page: 3 },
        ];
        await supabase.from('document_deadlines').insert(deadlines.map((d) => ({ ...d, document_id: doc.id })));

        // Insert requirements
        const requirements = [
          { description: 'US citizen or permanent resident', mandatory: true, source_page: 2, source_text: 'Applicants must be citizens or permanent residents of the United States.' },
          { description: 'Minimum GPA of 3.5 on a 4.0 scale', mandatory: true, source_page: 2, source_text: 'Applicants must have a minimum GPA of 3.5 on a 4.0 scale.' },
          { description: 'Enrolled or accepted into an accredited STEM degree program', mandatory: true, source_page: 2 },
          { description: 'Demonstrate financial need', mandatory: true, source_page: 2 },
          { description: 'Annual family income must not exceed $120,000', mandatory: true, source_page: 2, source_text: 'Annual family income must not exceed $120,000.' },
          { description: 'Under 25 years of age as of January 1, 2026', mandatory: true, source_page: 2 },
          { description: 'Completed application form', mandatory: true, source_page: 2 },
          { description: 'Official academic transcripts', mandatory: true, source_page: 2 },
          { description: 'Two letters of recommendation from STEM faculty', mandatory: true, source_page: 2 },
          { description: 'Personal statement (maximum 1000 words)', mandatory: true, source_page: 2 },
          { description: 'Proof of income (tax returns or equivalent)', mandatory: true, source_page: 2 },
          { description: 'Proof of citizenship or permanent residency', mandatory: true, source_page: 2 },
          { description: 'FAFSA Student Aid Report', mandatory: true, source_page: 2 },
        ];
        await supabase.from('document_requirements').insert(requirements.map((r) => ({ ...r, document_id: doc.id })));

        // Insert rules
        const rules = [
          { rule: 'Maintain GPA of 3.0 or higher', description: 'Required for annual scholarship renewal', source_page: 4 },
          { rule: 'Remain enrolled full-time in a STEM program', description: 'Scholarship requires continuous full-time enrollment', source_page: 4 },
          { rule: 'Scholarship revoked if switching to non-STEM major', description: 'The scholarship is non-transferable to other fields', source_page: 4 },
          { rule: 'Complete 20 hours of community service per semester', description: 'Mandatory community service requirement', source_page: 4 },
          { rule: 'Scholarship is non-transferable', description: 'Cannot be transferred to another student', source_page: 4 },
        ];
        await supabase.from('document_rules').insert(rules.map((r) => ({ ...r, document_id: doc.id })));

        // Insert chunks for RAG
        const chunks = DEMO_TEXT.split('\n\n').map((content, i) => ({
          document_id: doc.id,
          chunk_index: i,
          content,
          page_number: Math.floor(i / 3) + 1,
        }));
        await supabase.from('document_chunks').insert(chunks);

        // Insert action items
        const actions = [
          { title: 'Complete the online application form', description: 'Fill out the STEM scholarship application form', priority: 'critical', deadline: '2026-03-15', source: 'Page 5 - Application Process' },
          { title: 'Request official academic transcripts', description: 'Obtain official transcripts from your institution', priority: 'high', deadline: '2026-03-01', source: 'Page 2 - Required Documents' },
          { title: 'Ask two STEM faculty for recommendation letters', description: 'Request letters from STEM faculty members', priority: 'high', deadline: '2026-03-10', source: 'Page 2 - Required Documents' },
          { title: 'Write personal statement (max 1000 words)', description: 'Write a compelling personal statement', priority: 'high', deadline: '2026-03-10', source: 'Page 2 - Required Documents' },
          { title: 'Gather proof of income', description: 'Collect tax returns or equivalent proof of income', priority: 'medium', deadline: '2026-03-01', source: 'Page 2 - Required Documents' },
          { title: 'Prepare proof of citizenship', description: 'Gather citizenship or permanent residency documentation', priority: 'medium', deadline: '2026-03-01', source: 'Page 2 - Required Documents' },
          { title: 'Complete FAFSA and obtain Student Aid Report', description: 'Fill out the FAFSA form and get the report', priority: 'high', deadline: '2026-02-15', source: 'Page 2 - Required Documents' },
          { title: 'Submit completed application', description: 'Submit all documents before the deadline', priority: 'critical', deadline: '2026-03-15', source: 'Page 5 - Application Process' },
        ];
        await supabase.from('action_items').insert(actions.map((a) => ({ ...a, document_id: doc.id, status: 'pending' })));

        toast({ title: 'Demo ready', description: 'Sample scholarship document loaded with full intelligence.' });
        navigate(`/workspace/${ws.id}/document/${doc.id}`, { replace: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create demo';
        toast({ title: 'Demo setup failed', description: msg, variant: 'destructive' });
        navigate('/dashboard');
      }
    })();
  }, [user, navigate, toast]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <Loader2 size={32} className="mx-auto mb-4 animate-spin text-primary" />
        <p className="font-display text-lg">Setting up your demo document...</p>
        <p className="mt-2 text-sm text-muted-foreground">Creating a sample scholarship document with full AI intelligence.</p>
      </motion.div>
    </div>
  );
}
