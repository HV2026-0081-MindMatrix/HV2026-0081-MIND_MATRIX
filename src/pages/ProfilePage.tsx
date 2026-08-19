import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Shield, KeyRound, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function ProfilePage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await supabase.from('profiles').update({ full_name: name, updated_at: new Date().toISOString() }).eq('user_id', user!.id);
      toast({ title: 'Profile updated' });
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:px-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl">Profile</h1>
        <p className="mt-2 text-muted-foreground">Manage your account.</p>
      </motion.div>

      {/* Profile card */}
      <Card className="glass mb-6 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/30">
            <AvatarFallback className="bg-primary/10 text-xl text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-display text-xl">{profile?.full_name || 'User'}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </Card>

      {/* Edit form */}
      <Card className="glass mb-6 p-6">
        <h2 className="mb-4 font-display text-lg">Edit Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input value={user?.email ?? ''} disabled className="pl-10 opacity-60" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Member since</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'} disabled className="pl-10 opacity-60" />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Save Changes
          </Button>
        </form>
      </Card>

      {/* Future features */}
      <Card className="glass mb-6 p-6">
        <h2 className="mb-4 font-display text-lg">Account Settings</h2>
        <div className="space-y-3">
          {[
            { icon: Shield, label: 'Google Connection', desc: 'Connect your Google account', soon: true },
            { icon: KeyRound, label: 'Multi-Factor Authentication', desc: 'Add an extra layer of security', soon: true },
            { icon: Settings, label: 'Preferences', desc: 'Customize your experience', soon: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <item.icon size={18} className="text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              {item.soon && <span className="text-xs text-muted-foreground">Coming soon</span>}
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}
