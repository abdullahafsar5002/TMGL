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
          className="group flex w-full items-center justify-center gap-3 rounded-card border-2 border-dashed border-tmgl-green-300 bg-tmgl-green-50 p-4 transition-all hover:border-tmgl-green-600 hover:bg-tmgl-green-100"
        >
          <Image className="h-6 w-6 text-tmgl-green-700 transition-transform group-hover:scale-110" />
          <span className="text-sm font-medium text-tmgl-green-800">
            {generating ? 'Generating...' : 'Generate Round Summary Image'}
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-card border border-tmgl-charcoal-200 shadow-card">
            <img src={preview} alt="Round Summary" className="w-full" />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleShare}
              className="flex-1 items-center justify-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex-1 items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
          <button
            onClick={() => { setPreview(null); setBlob(null); }}
            className="text-xs text-tmgl-charcoal-500 transition-colors hover:text-tmgl-green-800"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
