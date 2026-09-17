import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, Edit, Trash2, Loader2, AlertCircle, Users, Flag } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getSeason, updateSeason, deleteSeason, getDivisionsBySeason, getTeamsBySeason } from '@/lib/league';
import { validateSeason, type SeasonInput } from '@/lib/validation';
import type { Season, Division, Team, SeasonStatus } from '@/types/database';

const STATUS_OPTIONS: SeasonStatus[] = ['draft', 'active', 'completed', 'archived'];

const STATUS_VARIANTS: Record<SeasonStatus, 'success' | 'info' | 'warning' | 'outline'> = {
  active: 'success',
  completed: 'info',
  draft: 'warning',
  archived: 'outline',
};

export function SeasonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canManage = canManageLeague(profile?.role);

  const [season, setSeason] = useState<Season | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<SeasonInput>({ name: '', start_date: null, end_date: null });
  const [editStatus, setEditStatus] = useState<SeasonStatus>('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    const [seasonRes, divisionsRes, teamsRes] = await Promise.all([
      getSeason(id),
      getDivisionsBySeason(id),
      getTeamsBySeason(id),
    ]);

    if (seasonRes.error || !seasonRes.data) {
      setError(seasonRes.error || 'Season not found');
    } else {
      setSeason(seasonRes.data);
      setEditForm({
        name: seasonRes.data.name,
        start_date: seasonRes.data.start_date,
        end_date: seasonRes.data.end_date,
      });
      setEditStatus(seasonRes.data.status);
    }
    setDivisions(divisionsRes.data ?? []);
    setTeams(teamsRes.data ?? []);
    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!id) return;
    const result = validateSeason(editForm);
    if (!result.isValid) {
      setValidationErrors(result.errors);
      return;
    }
    setValidationErrors([]);
    setIsSaving(true);
    setSaveError(null);

    const updateRes = await updateSeason(id, {
      name: editForm.name.trim(),
      start_date: editForm.start_date,
      end_date: editForm.end_date,
      status: editStatus,
    });

    setIsSaving(false);
    if (updateRes.error || !updateRes.data) {
      setSaveError(updateRes.error || 'Update failed');
    } else {
      setSeason(updateRes.data);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this season? This cannot be undone.')) return;
    const result = await deleteSeason(id);
    if (result.error) {
      setError(result.error);
    } else {
      navigate('/seasons');
    }
  };

  if (isLoading) {
    return (
      <Container size="lg" className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-tmgl-green-800 animate-spin" />
      </Container>
    );
  }

  if (error || !season) {
    return (
      <Container size="lg" className="py-8">
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load season</p>
            <p className="mt-0.5 text-red-700">{error || 'Season not found'}</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/seasons')} className="mt-2">
              Back to Seasons
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to="/seasons" className="text-sm text-tmgl-green-700 hover:underline flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Seasons
          </Link>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-tmgl-green-800" />
            {isEditing ? 'Edit Season' : season.name}
          </h1>
        </div>
        {canManage && !isEditing && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        )}
      </div>

      {saveError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{saveError}</span>
        </div>
      )}
      {validationErrors.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <ul className="list-disc list-inside space-y-0.5">{validationErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {isEditing ? (
        <Card>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Season Name</label>
              <input id="edit-name" type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
                placeholder="e.g. 2026 Summer League" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-start" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Start Date</label>
                <input id="edit-start" type="date" value={editForm.start_date ?? ''} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value || null })}
                  className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
              </div>
              <div>
                <label htmlFor="edit-end" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">End Date</label>
                <input id="edit-end" type="date" value={editForm.end_date ?? ''} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value || null })}
                  className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
              </div>
            </div>
            <div>
              <label htmlFor="edit-status" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Status</label>
              <select id="edit-status" value={editStatus} onChange={(e) => setEditStatus(e.target.value as SeasonStatus)}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent bg-white">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" size="md" onClick={() => { setIsEditing(false); setValidationErrors([]); setSaveError(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANTS[season.status]}>{season.status}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-tmgl-charcoal-500 font-medium">Start Date</p>
                  <p className="text-tmgl-charcoal-900">{season.start_date ? new Date(season.start_date).toLocaleDateString() : '\u2014'}</p>
                </div>
                <div>
                  <p className="text-tmgl-charcoal-500 font-medium">End Date</p>
                  <p className="text-tmgl-charcoal-900">{season.end_date ? new Date(season.end_date).toLocaleDateString() : '\u2014'}</p>
                </div>
                <div>
                  <p className="text-tmgl-charcoal-500 font-medium">Created</p>
                  <p className="text-tmgl-charcoal-900">{new Date(season.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-tmgl-green-700" />
                <CardTitle className="text-base">Divisions ({divisions.length})</CardTitle>
              </div>
              {canManage && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/divisions/new?seasonId=${id}`)}>Add Division</Button>
              )}
            </CardHeader>
            <CardContent>
              {divisions.length === 0 ? (
                <p className="text-sm text-tmgl-charcoal-500">No divisions yet.</p>
              ) : (
                <div className="space-y-2">
                  {divisions.map((d) => (
                    <button key={d.id} onClick={() => navigate(`/divisions/${d.id}`)}
                      className="w-full text-left p-3 rounded-lg border border-tmgl-charcoal-200 hover:border-tmgl-green-300 transition-colors">
                      <span className="text-sm font-medium text-tmgl-charcoal-900">{d.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-tmgl-green-700" />
                <CardTitle className="text-base">Teams ({teams.length})</CardTitle>
              </div>
              {canManage && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/teams/new?seasonId=${id}`)}>Add Team</Button>
              )}
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <p className="text-sm text-tmgl-charcoal-500">No teams yet.</p>
              ) : (
                <div className="space-y-2">
                  {teams.map((t) => (
                    <button key={t.id} onClick={() => navigate(`/teams/${t.id}`)}
                      className="w-full text-left p-3 rounded-lg border border-tmgl-charcoal-200 hover:border-tmgl-green-300 transition-colors">
                      <span className="text-sm font-medium text-tmgl-charcoal-900">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Container>
  );
}
