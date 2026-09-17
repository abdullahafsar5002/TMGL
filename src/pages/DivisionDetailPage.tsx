import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Flag, ArrowLeft, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getDivision, updateDivision, deleteDivision, getSeason } from '@/lib/league';
import { validateDivision } from '@/lib/validation';
import type { Division, Season } from '@/types/database';

export function DivisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canManage = canManageLeague(profile?.role);

  const [division, setDivision] = useState<Division | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const res = await getDivision(id);
    if (res.error || !res.data) {
      setError(res.error || 'Division not found');
    } else {
      setDivision(res.data);
      setEditName(res.data.name);
      const seasonRes = await getSeason(res.data.season_id);
      if (seasonRes.data) setSeason(seasonRes.data);
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!id || !division) return;
    const result = validateDivision({ name: editName, season_id: division.season_id });
    if (!result.isValid) { setValidationErrors(result.errors); return; }
    setValidationErrors([]);
    setIsSaving(true);
    setSaveError(null);
    const res = await updateDivision(id, { name: editName.trim() });
    setIsSaving(false);
    if (res.error || !res.data) {
      setSaveError(res.error || 'Update failed');
    } else {
      setDivision(res.data);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Delete this division? Teams in this division will become unassigned.')) return;
    const res = await deleteDivision(id);
    if (res.error) setError(res.error);
    else navigate(season ? `/seasons/${season.id}` : '/seasons');
  };

  if (isLoading) {
    return (
      <Container size="lg" className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-tmgl-green-800 animate-spin" />
      </Container>
    );
  }

  if (error || !division) {
    return (
      <Container size="lg" className="py-8">
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load division</p>
            <p className="mt-0.5 text-red-700">{error || 'Division not found'}</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to={season ? `/seasons/${season.id}` : '/seasons'} className="text-sm text-tmgl-green-700 hover:underline flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> {season?.name ?? 'Season'}
          </Link>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <Flag className="w-5 h-5 text-tmgl-green-800" />
            {isEditing ? 'Edit Division' : division.name}
          </h1>
        </div>
        {canManage && !isEditing && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 mr-1" />Edit</Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
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

      <Card>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div>
                <label htmlFor="div-name" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Division Name</label>
                <input id="div-name" type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" size="md" onClick={() => { setIsEditing(false); setValidationErrors([]); setSaveError(null); }}>Cancel</Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-tmgl-charcoal-700">
              <p><span className="font-medium text-tmgl-charcoal-500">Season:</span> {season?.name ?? '\u2014'}</p>
              <p className="mt-1"><span className="font-medium text-tmgl-charcoal-500">Created:</span> {new Date(division.created_at).toLocaleDateString()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
