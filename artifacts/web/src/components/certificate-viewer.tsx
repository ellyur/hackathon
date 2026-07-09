import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, X, Award, Medal, Trophy, Star } from 'lucide-react';
import type { Certificate, CertTier, CertType } from '@/hooks/use-certificates';

// ── Tier helpers ───────────────────────────────────────────────────────────────

const TIER_COLORS: Record<CertTier, { bg: string; border: string; text: string; badge: string }> = {
  bronze:    { bg: '#fdf6ee', border: '#b87333', text: '#7c4a1e', badge: 'bg-amber-700 text-white' },
  silver:    { bg: '#f5f5f5', border: '#a8a9ad', text: '#4a4a4a', badge: 'bg-slate-400 text-white' },
  gold:      { bg: '#fffbeb', border: '#d4af37', text: '#7a5c00', badge: 'bg-yellow-500 text-white' },
  excellence:{ bg: '#f0f7ff', border: '#1a56db', text: '#1e3a8a', badge: 'bg-blue-700 text-white' },
};

const TYPE_COLORS: Record<CertType, { bg: string; border: string; text: string; badge: string }> = {
  clinical_hours: { bg: '#fffbeb', border: '#d4af37', text: '#7a5c00', badge: 'bg-yellow-500 text-white' },
  ward_completion:{ bg: '#f0fdf4', border: '#16a34a', text: '#14532d', badge: 'bg-green-700 text-white' },
  academic_year:  { bg: '#f5f3ff', border: '#7c3aed', text: '#3b0764', badge: 'bg-violet-700 text-white' },
};

function getColors(cert: Certificate) {
  if (cert.tier) return TIER_COLORS[cert.tier];
  return TYPE_COLORS[cert.type];
}

export function certTypeLabel(type: CertType): string {
  if (type === 'clinical_hours')  return 'Clinical Hours';
  if (type === 'ward_completion') return 'Ward Completion';
  return 'Academic Year';
}

export function CertIcon({ cert, size = 'md' }: { cert: Certificate; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  if (cert.type === 'academic_year')   return <Star className={cls} />;
  if (cert.type === 'ward_completion') return <Trophy className={cls} />;
  if (cert.tier === 'excellence')      return <Award className={cls} />;
  return <Medal className={cls} />;
}

// ── PDF / Print ────────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function printCertificate(cert: Certificate) {
  const c = getColors(cert);
  const today = new Date(cert.earnedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(cert.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .page { width: 900px; background: ${c.bg}; border: 8px solid ${c.border}; border-radius: 4px; padding: 60px; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
    .corner { position: absolute; width: 48px; height: 48px; border-color: ${c.border}; border-style: solid; }
    .corner.tl { top: 16px; left: 16px; border-width: 3px 0 0 3px; }
    .corner.tr { top: 16px; right: 16px; border-width: 3px 3px 0 0; }
    .corner.bl { bottom: 16px; left: 16px; border-width: 0 0 3px 3px; }
    .corner.br { bottom: 16px; right: 16px; border-width: 0 3px 3px 0; }
    .header { text-align: center; margin-bottom: 36px; }
    .org { font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: ${c.text}; opacity: 0.7; margin-bottom: 8px; }
    .cert-label { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 700; color: ${c.border}; letter-spacing: 1px; }
    .achievement { font-size: 11px; letter-spacing: 6px; text-transform: uppercase; color: ${c.text}; opacity: 0.5; margin-top: 4px; }
    .divider { display: flex; align-items: center; gap: 16px; margin: 28px 0; }
    .divider-line { flex: 1; height: 1px; background: linear-gradient(to right, transparent, ${c.border}, transparent); }
    .divider-diamond { width: 8px; height: 8px; background: ${c.border}; transform: rotate(45deg); }
    .presented { text-align: center; font-size: 14px; color: ${c.text}; opacity: 0.65; font-style: italic; margin-bottom: 16px; }
    .student-name { text-align: center; font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 400; font-style: italic; color: ${c.text}; margin-bottom: 8px; border-bottom: 2px solid ${c.border}; padding-bottom: 12px; }
    .student-meta { text-align: center; font-size: 13px; color: ${c.text}; opacity: 0.65; margin-bottom: 28px; letter-spacing: 1px; }
    .body-text { text-align: center; font-size: 15px; color: ${c.text}; line-height: 1.8; max-width: 680px; margin: 0 auto 32px; }
    .highlight { font-weight: 600; color: ${c.border}; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 48px; padding-top: 24px; border-top: 1px solid ${c.border}; opacity: 0.7; }
    .footer-col { text-align: center; }
    .footer-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: ${c.text}; opacity: 0.6; margin-bottom: 4px; }
    .footer-value { font-size: 13px; font-weight: 600; color: ${c.text}; }
    .qr-placeholder { width: 64px; height: 64px; border: 2px solid ${c.border}; display: flex; align-items: center; justify-content: center; font-size: 9px; color: ${c.text}; opacity: 0.4; text-align: center; margin: 0 auto; }
    @media print {
      body { background: white; }
      .page { box-shadow: none; border-width: 6px; }
      @page { size: A4 landscape; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>
    <div class="header">
      <div class="org">Smart Integrated Platform for Academic &amp; Clinical Scheduling</div>
      <div class="cert-label">${escHtml(cert.title)}</div>
      <div class="achievement">Certificate of Achievement</div>
    </div>
    <div class="divider"><div class="divider-line"></div><div class="divider-diamond"></div><div class="divider-line"></div></div>
    <div class="presented">This is to certify that</div>
    <div class="student-name">${escHtml(cert.studentName)}</div>
    <div class="student-meta">${cert.studentNumber !== '—' ? escHtml(cert.studentNumber) + '  ·  ' : ''}${escHtml(cert.program)}</div>
    <div class="body-text">
      ${escHtml(cert.achievementDetail)}.
      ${cert.hoursCompleted != null ? `<br/><span class="highlight">${cert.hoursCompleted.toFixed(1)} hours</span> of verified clinical duty completed.` : ''}
    </div>
    <div class="footer">
      <div class="footer-col">
        <div class="footer-label">Date Awarded</div>
        <div class="footer-value">${escHtml(today)}</div>
      </div>
      <div class="footer-col">
        <div class="qr-placeholder">QR<br/>Verify</div>
      </div>
      <div class="footer-col">
        <div class="footer-label">Certificate ID</div>
        <div class="footer-value">${escHtml(cert.id)}</div>
      </div>
    </div>
  </div>
  <script>window.onload = () => { setTimeout(() => window.print(), 400); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=960,height=680');
  if (win) { win.document.write(html); win.document.close(); }
}

// ── Certificate Card ───────────────────────────────────────────────────────────

export function CertificateCard({
  cert,
  onView,
}: {
  cert: Certificate;
  onView: (c: Certificate) => void;
}) {
  const c = getColors(cert);
  const date = new Date(cert.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div
      className="rounded-xl border-2 p-5 space-y-3 hover:shadow-md transition-shadow"
      style={{ borderColor: c.border, background: c.bg }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: c.border + '22' }}>
            <CertIcon cert={cert} />
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight" style={{ color: c.text }}>{cert.title}</p>
            <p className="text-xs opacity-60 mt-0.5" style={{ color: c.text }}>{cert.subtitle}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${c.badge}`}>
          {certTypeLabel(cert.type)}
        </span>
      </div>

      {cert.hoursCompleted != null && (
        <p className="text-xs" style={{ color: c.text }}>
          <span className="font-semibold">{cert.hoursCompleted.toFixed(1)}h</span> completed
          {cert.percentageCompleted != null && ` · ${cert.percentageCompleted}% milestone`}
        </p>
      )}
      {cert.wardName && (
        <p className="text-xs" style={{ color: c.text }}>
          Ward: <span className="font-semibold">{cert.wardName}</span>
        </p>
      )}

      <p className="text-xs opacity-50" style={{ color: c.text }}>Earned {date}</p>

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => onView(cert)}
          style={{ borderColor: c.border, color: c.text }}>
          View
        </Button>
        <Button size="sm" className="flex-1 text-xs h-8 gap-1" onClick={() => printCertificate(cert)}
          style={{ background: c.border, color: '#fff' }}>
          <Download className="w-3 h-3" /> PDF
        </Button>
      </div>
    </div>
  );
}

// ── Certificate Viewer Modal ───────────────────────────────────────────────────

export function CertificateViewerModal({
  cert,
  onClose,
}: {
  cert: Certificate | null;
  onClose: () => void;
}) {
  if (!cert) return null;
  const c = getColors(cert);
  const date = new Date(cert.earnedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <Dialog open={!!cert} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{cert.title}</DialogTitle>
        </DialogHeader>
        {/* Certificate preview */}
        <div
          className="relative p-10 md:p-14"
          style={{ background: c.bg, borderTop: `6px solid ${c.border}` }}
        >
          {/* Corner ornaments */}
          {(['tl','tr','bl','br'] as const).map(pos => (
            <div key={pos} className="absolute w-10 h-10" style={{
              top:    pos.startsWith('t') ? 12 : undefined,
              bottom: pos.startsWith('b') ? 12 : undefined,
              left:   pos.endsWith('l')   ? 12 : undefined,
              right:  pos.endsWith('r')   ? 12 : undefined,
              borderColor: c.border,
              borderStyle: 'solid',
              borderWidth: pos === 'tl' ? '2px 0 0 2px' : pos === 'tr' ? '2px 2px 0 0' : pos === 'bl' ? '0 0 2px 2px' : '0 2px 2px 0',
            }} />
          ))}

          {/* Org header */}
          <div className="text-center mb-6">
            <p className="text-[10px] tracking-[4px] uppercase mb-2 opacity-50" style={{ color: c.text }}>
              Smart Integrated Platform for Academic & Clinical Scheduling
            </p>
            <h2 className="text-2xl md:text-3xl font-bold font-serif" style={{ color: c.border }}>
              {cert.title}
            </h2>
            <p className="text-[10px] tracking-[5px] uppercase mt-1 opacity-40" style={{ color: c.text }}>
              Certificate of Achievement
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${c.border})` }} />
            <div className="w-2 h-2 rotate-45" style={{ background: c.border }} />
            <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${c.border})` }} />
          </div>

          <p className="text-center text-sm italic mb-3 opacity-60" style={{ color: c.text }}>This is to certify that</p>
          <h3 className="text-center text-2xl md:text-3xl font-serif italic mb-1" style={{ color: c.text }}>
            {cert.studentName}
          </h3>
          <p className="text-center text-xs mb-6 opacity-50 tracking-widest" style={{ color: c.text }}>
            {cert.studentNumber !== '—' ? `${cert.studentNumber}  ·  ` : ''}{cert.program}
          </p>

          <p className="text-center text-sm leading-relaxed max-w-xl mx-auto mb-6" style={{ color: c.text }}>
            {cert.achievementDetail}.
            {cert.hoursCompleted != null && (
              <> <span className="font-semibold" style={{ color: c.border }}>{cert.hoursCompleted.toFixed(1)} hours</span> of verified clinical duty completed.</>
            )}
          </p>

          {/* Footer info */}
          <div className="flex justify-between items-end pt-6 mt-2" style={{ borderTop: `1px solid ${c.border}60` }}>
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1" style={{ color: c.text }}>Date Awarded</p>
              <p className="text-sm font-semibold" style={{ color: c.text }}>{date}</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 border-2 flex items-center justify-center text-[9px] text-center opacity-30"
                style={{ borderColor: c.border, color: c.text }}>
                QR<br/>Verify
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1" style={{ color: c.text }}>Certificate ID</p>
              <p className="text-sm font-mono font-semibold" style={{ color: c.text }}>{cert.id}</p>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-background">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{certTypeLabel(cert.type)}</Badge>
            {cert.schoolYear && <Badge variant="outline" className="text-xs">AY {cert.schoolYear}</Badge>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
              <X className="w-3.5 h-3.5" /> Close
            </Button>
            <Button size="sm" onClick={() => printCertificate(cert)} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
