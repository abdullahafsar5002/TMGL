import { useState, useEffect, useCallback } from 'react';
import { Save, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { getPlayerByProfileId, updatePlayer } from '@/lib/league';
import { supabase } from '@/lib/supabase';
import type { Player } from '@/types/database';

export default function ProfileSettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [player, setPlayer] = useState<Player | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const playerResult = await getPlayerByProfileId(user.id);
      if (playerResult.data) {
        setPlayer(playerResult.data);
        setPhone(playerResult.data.phone ?? '');
      }

      if (profile?.full_name) {
        setFullName(profile.full_name);
      }
    } catch {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id);

      if (profileError) {
        setError(profileError.message);
        return;
      }

      if (player) {
        const playerResult = await updatePlayer(player.id, {
          full_name: fullName.trim(),
          phone: phone || null,
        });
        if (playerResult.error) {
          setError(playerResult.error);
          return;
        }
      }

      await refreshProfile();
      setSuccess('Profile updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState message="Loading profile..." />;

  return (
    <Container className="py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
      )}

      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="ghost" onClick={loadData}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}
