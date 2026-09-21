/**
 * Official Certification / Partner Badge
 *
 * Shows a verified badge on certified club profiles.
 * Clubs become partners after verification by TMGL admins.
 */

import { ShieldCheck, ExternalLink, Award } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';

interface PartnerBadgeProps {
  clubName: string;
  partnerSince?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export function PartnerBadge({ clubName: _clubName, partnerSince, size = 'md', showDetails = false }: PartnerBadgeProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <ShieldCheck className={`${sizes[size]} text-tmgl-green`} />
      {showDetails && (
        <span className="text-xs font-medium text-tmgl-green">
          Certified Partner{partnerSince ? ` since ${new Date(partnerSince).getFullYear()}` : ''}
        </span>
      )}
    </div>
  );
}

interface CertificationCardProps {
  clubName: string;
  partnerSince?: string | null;
  features?: string[];
}

export function CertificationCard({ clubName, partnerSince, features }: CertificationCardProps) {
  return (
    <Card className="border-tmgl-green/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="w-5 h-5 text-yellow-400" />
          Official Partner Club
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-tmgl-green/10 rounded-lg border border-tmgl-green/20">
          <ShieldCheck className="w-8 h-8 text-tmgl-green shrink-0" />
          <div>
            <p className="font-semibold text-sm text-tmgl-silver">{clubName}</p>
            <p className="text-xs text-tmgl-silver/60">
              TMGL Certified{partnerSince ? ` · Since ${new Date(partnerSince).getFullYear()}` : ''}
            </p>
          </div>
        </div>

        {features && features.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-tmgl-silver/60 uppercase tracking-wide">Includes</p>
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-tmgl-silver/80">
                <div className="w-1 h-1 rounded-full bg-tmgl-green shrink-0" />
                {f}
              </div>
            ))}
          </div>
        )}

        <a
          href="https://tmgl.vercel.app/certification"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-tmgl-green hover:underline"
        >
          Learn about certification <ExternalLink className="w-3 h-3" />
        </a>
      </CardContent>
    </Card>
  );
}
