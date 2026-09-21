/**
 * Digital Scorecard Export
 *
 * Generates a beautiful "Round Summary" image using HTML Canvas
 * that players can share on Instagram or WhatsApp.
 */

import { computeScorecardSummary } from '@/lib/scoring';
import type { ScorecardHole } from '@/types/database';

export interface RoundSummaryData {
  playerName: string;
  courseName: string;
  roundDate: string;
  holes: ScorecardHole[];
  handicapIndex?: number;
  handicapChange?: number;
  totalScoreToPar?: number;
}

function toParLabel(toPar: number): string {
  if (toPar === 0) return 'E';
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}

function toParColor(toPar: number): string {
  if (toPar <= -2) return '#FFD700';
  if (toPar === -1) return '#22C55E';
  if (toPar === 0) return '#F8FAFC';
  if (toPar === 1) return '#FB923C';
  return '#EF4444';
}

function toParBg(toPar: number): string {
  if (toPar <= -2) return 'rgba(255, 215, 0, 0.15)';
  if (toPar === -1) return 'rgba(34, 197, 94, 0.15)';
  if (toPar === 0) return 'rgba(248, 250, 252, 0.08)';
  if (toPar === 1) return 'rgba(251, 146, 60, 0.15)';
  return 'rgba(239, 68, 68, 0.15)';
}

export function generateRoundSummaryImage(data: RoundSummaryData): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Canvas not supported'));

    const summary = computeScorecardSummary(data.holes);

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0B1120');
    grad.addColorStop(0.5, '#111827');
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Accent bar at top
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, 0, W, 6);

    let y = 60;

    // Logo / Brand
    ctx.fillStyle = '#22C55E';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TORUK MAKTU GOLF LEAGUE', W / 2, y);
    y += 50;

    // "ROUND SUMMARY" title
    ctx.fillStyle = '#94A3B8';
    ctx.font = '24px sans-serif';
    ctx.fillText('ROUND SUMMARY', W / 2, y);
    y += 60;

    // Player name
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(data.playerName, W / 2, y);
    y += 50;

    // Course + Date
    ctx.fillStyle = '#64748B';
    ctx.font = '28px sans-serif';
    ctx.fillText(data.courseName, W / 2, y);
    y += 38;
    ctx.fillText(data.roundDate, W / 2, y);
    y += 70;

    // Big score display
    const toPar = data.totalScoreToPar ?? summary.totalToPar;
    const scoreLabel = toParLabel(toPar);
    ctx.fillStyle = toParColor(toPar);
    ctx.font = 'bold 120px sans-serif';
    ctx.fillText(`${summary.totalStrokes}`, W / 2, y);
    y += 30;

    ctx.fillStyle = toParColor(toPar);
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(`(${scoreLabel})`, W / 2, y);
    y += 50;

    ctx.fillStyle = '#64748B';
    ctx.font = '24px sans-serif';
    ctx.fillText(`${summary.holesCompleted} Holes Played`, W / 2, y);
    y += 80;

    // Front 9 / Back 9 split
    const splitW = 460;
    const splitX1 = W / 2 - splitW - 20;
    const splitX2 = W / 2 + 20;

    function drawSplitBox(x: number, label: string, strokes: number, _par: number, toP: number) {
      const c = ctx!;
      c.fillStyle = 'rgba(30, 41, 59, 0.8)';
      c.beginPath();
      c.roundRect(x, y, splitW, 140, 12);
      c.fill();

      c.fillStyle = '#94A3B8';
      c.font = '22px sans-serif';
      c.textAlign = 'center';
      c.fillText(label, x + splitW / 2, y + 35);

      c.fillStyle = '#F8FAFC';
      c.font = 'bold 44px sans-serif';
      c.fillText(`${strokes}`, x + splitW / 2, y + 85);

      c.fillStyle = toParColor(toP);
      c.font = '28px sans-serif';
      c.fillText(toParLabel(toP), x + splitW / 2, y + 120);
    }

    drawSplitBox(splitX1, 'FRONT 9', summary.front9Strokes, summary.front9Par, summary.front9ToPar);
    drawSplitBox(splitX2, 'BACK 9', summary.back9Strokes, summary.back9Par, summary.back9ToPar);
    y += 180;

    // Hole-by-hole grid
    ctx.fillStyle = '#94A3B8';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HOLE-BY-HOLE', 60, y);
    y += 40;

    const cols = 9;
    const cellW = (W - 120) / cols;
    const cellH = 90;

    // Hole numbers header
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < cols; i++) {
      const holeNum = i + 1;
      ctx.fillText(`${holeNum}`, 60 + cellW * i + cellW / 2, y);
    }
    y += 28;

    // Front 9 row
    const front9Holes = data.holes.filter(h => h.hole_number >= 1 && h.hole_number <= 9);
    for (let i = 0; i < Math.min(front9Holes.length, cols); i++) {
      const h = front9Holes[i];
      const toP = h.strokes - h.par;
      const cx = 60 + cellW * i;
      const cy = y;

      ctx.fillStyle = toParBg(toP);
      ctx.beginPath();
      ctx.roundRect(cx + 4, cy, cellW - 8, cellH, 8);
      ctx.fill();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`P${h.par}`, cx + cellW / 2, cy + 22);

      ctx.fillStyle = toParColor(toP);
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(`${h.strokes}`, cx + cellW / 2, cy + 58);

      ctx.fillStyle = toParColor(toP);
      ctx.font = '18px sans-serif';
      ctx.fillText(toParLabel(toP), cx + cellW / 2, cy + 80);
    }
    y += cellH + 30;

    // Back 9 header
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < cols; i++) {
      ctx.fillText(`${i + 10}`, 60 + cellW * i + cellW / 2, y);
    }
    y += 28;

    // Back 9 row
    const back9Holes = data.holes.filter(h => h.hole_number >= 10 && h.hole_number <= 18);
    for (let i = 0; i < Math.min(back9Holes.length, cols); i++) {
      const h = back9Holes[i];
      const toP = h.strokes - h.par;
      const cx = 60 + cellW * i;
      const cy = y;

      ctx.fillStyle = toParBg(toP);
      ctx.beginPath();
      ctx.roundRect(cx + 4, cy, cellW - 8, cellH, 8);
      ctx.fill();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`P${h.par}`, cx + cellW / 2, cy + 22);

      ctx.fillStyle = toParColor(toP);
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(`${h.strokes}`, cx + cellW / 2, cy + 58);

      ctx.fillStyle = toParColor(toP);
      ctx.font = '18px sans-serif';
      ctx.fillText(toParLabel(toP), cx + cellW / 2, cy + 80);
    }
    y += cellH + 50;

    // Handicap section (if available)
    if (data.handicapIndex !== undefined) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
      ctx.beginPath();
      ctx.roundRect(60, y, W - 120, 80, 12);
      ctx.fill();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('HANDICAP INDEX', 100, y + 32);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(data.handicapIndex.toFixed(1), W - 100, y + 36);

      if (data.handicapChange !== undefined && data.handicapChange !== 0) {
        const changeColor = data.handicapChange < 0 ? '#22C55E' : '#EF4444';
        ctx.fillStyle = changeColor;
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(
          data.handicapChange > 0 ? `▲ +${data.handicapChange.toFixed(1)}` : `▼ ${data.handicapChange.toFixed(1)}`,
          W - 100, y + 68
        );
      }
      y += 100;
    }

    // Footer
    y = H - 80;
    ctx.fillStyle = '#475569';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Played on TMGL • toruk-makto.vercel.app', W / 2, y);

    // Bottom accent bar
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, H - 6, W, 6);

    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create image blob'));
    }, 'image/png');
  });
}

export function downloadRoundSummary(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareRoundSummary(blob: Blob, filename: string): Promise<boolean> {
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'My Round Summary',
          text: 'Check out my round on TMGL!',
        });
        return true;
      } catch {
        return false;
      }
    }
  }
  downloadRoundSummary(blob, filename);
  return true;
}
