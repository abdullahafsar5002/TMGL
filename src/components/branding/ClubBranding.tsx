/**
 * Club-Level Branding
 *
 * Allows league managers to upload a logo and set primary color,
 * changing the app theme to match their golf club's brand.
 */

import { useState, useEffect } from 'react';
import { Palette, Upload, RotateCcw, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

export interface ClubBranding {
  club_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
}

const PRESET_COLORS = [
  { name: 'TMGL Green', primary: '#166534', accent: '#22C55E' },
  { name: 'Royal Blue', primary: '#1E3A5F', accent: '#3B82F6' },
  { name: 'Classic Red', primary: '#991B1B', accent: '#EF4444' },
  { name: 'Champion Gold', primary: '#92400E', accent: '#F59E0B' },
  { name: 'Prestige Purple', primary: '#581C87', accent: '#A855F7' },
  { name: 'Forest Green', primary: '#14532D', accent: '#22C55E' },
  { name: 'Ocean Teal', primary: '#134E4A', accent: '#14B8A6' },
  { name: 'Sunset Orange', primary: '#9A3412', accent: '#F97316' },
];

const DEFAULT_BRANDING: ClubBranding = {
  club_name: 'TMGL',
  logo_url: null,
  primary_color: '#166534',
  accent_color: '#22C55E',
};

export function getStoredBranding(): ClubBranding {
  try {
    const stored = localStorage.getItem('tmgl_club_branding');
    if (stored) return JSON.parse(stored) as ClubBranding;
  } catch { /* ignore */ }
  return DEFAULT_BRANDING;
}

export function applyBranding(branding: ClubBranding) {
  const root = document.documentElement;
  root.style.setProperty('--club-primary', branding.primary_color);
  root.style.setProperty('--club-accent', branding.accent_color);

  // Compute lighter shades
  const r = parseInt(branding.primary_color.slice(1, 3), 16);
  const g = parseInt(branding.primary_color.slice(3, 5), 16);
  const b = parseInt(branding.primary_color.slice(5, 7), 16);
  root.style.setProperty('--club-primary-light', `rgba(${r}, ${g}, ${b}, 0.1)`);
  root.style.setProperty('--club-primary-mid', `rgba(${r}, ${g}, ${b}, 0.5)`);

  localStorage.setItem('tmgl_club_branding', JSON.stringify(branding));
}

interface ClubBrandingEditorProps {
  isAdmin: boolean;
}

export function ClubBrandingEditor({ isAdmin }: ClubBrandingEditorProps) {
  const toast = useToast();
  const [branding, setBranding] = useState<ClubBranding>(getStoredBranding);
  const [uploading, setUploading] = useState(false);
  const [clubName, setClubName] = useState(branding.club_name);

  useEffect(() => {
    applyBranding(branding);
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }

    setUploading(true);
    const fileName = `club-logo-${Date.now()}.${file.name.split('.').pop()}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (error) {
      toast.error('Failed to upload logo');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const updated = { ...branding, logo_url: urlData.publicUrl };
    setBranding(updated);
    applyBranding(updated);
    setUploading(false);
    toast.success('Logo uploaded');
  };

  const handleColorChange = (field: 'primary_color' | 'accent_color', color: string) => {
    const updated = { ...branding, [field]: color };
    setBranding(updated);
    applyBranding(updated);
  };

  const handleSave = () => {
    const updated = { ...branding, club_name: clubName };
    setBranding(updated);
    applyBranding(updated);
    toast.success('Branding saved');
  };

  const handleReset = () => {
    setBranding(DEFAULT_BRANDING);
    setClubName('TMGL');
    applyBranding(DEFAULT_BRANDING);
    toast.success('Branding reset to defaults');
  };

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="w-4 h-4 text-tmgl-green" />
          Club Branding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-tmgl-silver mb-1.5">Club Name</label>
          <input
            type="text"
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-tmgl-charcoal-800 border border-tmgl-charcoal-700 text-tmgl-silver text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green"
            placeholder="e.g. Royal Golf Club"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-tmgl-silver mb-1.5">Club Logo</label>
          <div className="flex items-center gap-3">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt="Club Logo" className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-tmgl-charcoal-800 flex items-center justify-center">
                <Palette className="w-5 h-5 text-tmgl-charcoal-500" />
              </div>
            )}
            <label className="flex-1">
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-tmgl-charcoal-600 hover:border-tmgl-green cursor-pointer text-sm text-tmgl-silver/60 hover:text-tmgl-silver transition-colors">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Logo'}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-tmgl-silver mb-2">Preset Themes</label>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setBranding({ ...branding, primary_color: preset.primary, accent_color: preset.accent });
                  applyBranding({ ...branding, primary_color: preset.primary, accent_color: preset.accent });
                }}
                className={`p-2 rounded-lg border-2 transition-all ${
                  branding.primary_color === preset.primary
                    ? 'border-tmgl-green bg-tmgl-green/10'
                    : 'border-tmgl-charcoal-700 hover:border-tmgl-charcoal-500'
                }`}
                title={preset.name}
              >
                <div className="flex gap-1 mb-1">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primary }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.accent }} />
                </div>
                <p className="text-[10px] text-tmgl-silver/60 truncate">{preset.name}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-tmgl-silver mb-1.5">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primary_color}
                onChange={(e) => handleColorChange('primary_color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                value={branding.primary_color}
                onChange={(e) => handleColorChange('primary_color', e.target.value)}
                className="flex-1 px-2 py-1.5 rounded bg-tmgl-charcoal-800 border border-tmgl-charcoal-700 text-tmgl-silver text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-tmgl-silver mb-1.5">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.accent_color}
                onChange={(e) => handleColorChange('accent_color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                value={branding.accent_color}
                onChange={(e) => handleColorChange('accent_color', e.target.value)}
                className="flex-1 px-2 py-1.5 rounded bg-tmgl-charcoal-800 border border-tmgl-charcoal-700 text-tmgl-silver text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} className="flex-1 bg-tmgl-green hover:bg-tmgl-green/90">
            <Check className="w-4 h-4 mr-1.5" /> Save Branding
          </Button>
          <Button onClick={handleReset} variant="secondary" className="flex-1">
            <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
