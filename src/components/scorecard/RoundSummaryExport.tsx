/**
 * Round Summary Card — exportable shareable image component
 */

import { useState } from 'react';
import { Share2, Download, Image } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { generateRoundSummaryImage, shareRoundSummary, downloadRoundSummary, type RoundSummaryData } from '@/lib/scorecardExport';

interface RoundSummaryExportProps {
  data: RoundSummaryData;
  className?: string;
}

export function RoundSummaryExport({ data, className = '' }: RoundSummaryExportProps) {
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const imageBlob = await generateRoundSummaryImage(data);
      setBlob(imageBlob);
      setPreview(URL.createObjectURL(imageBlob));
    } catch (err) {
      console.error('Failed to generate summary:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!blob) return;
    const filename = `tmgl-round-${data.courseName.replace(/\s+/g, '-').toLowerCase()}-${data.roundDate}.png`;
    await shareRoundSummary(blob, filename);
  };

  const handleDownload = () => {
    if (!blob) return;
    const filename = `tmgl-round-${data.courseName.replace(/\s+/g, '-').toLowerCase()}-${data.roundDate}.png`;
    downloadRoundSummary(blob, filename);
  };

  return (
    <div className={className}>
      {!preview ? (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-tmgl-green/30 hover:border-tmgl-green/60 bg-tmgl-dark/50 transition-all group"
        >
          <Image className="w-6 h-6 text-tmgl-green group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium text-tmgl-silver">
            {generating ? 'Generating...' : 'Generate Round Summary Image'}
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden border border-tmgl-charcoal-700">
            <img src={preview} alt="Round Summary" className="w-full" />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 bg-tmgl-green hover:bg-tmgl-green/90"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button
              onClick={handleDownload}
              variant="secondary"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
          <button
            onClick={() => { setPreview(null); setBlob(null); }}
            className="text-xs text-tmgl-silver/60 hover:text-tmgl-silver transition-colors"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
