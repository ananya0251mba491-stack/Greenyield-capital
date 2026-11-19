import React from 'react';
import { AlertCircle, CheckCircle2, Clock, FileEdit, ShieldAlert, XCircle } from 'lucide-react';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-sky-700',
  neutral: 'text-slate-600',
};

function resolveToneAndLabel(status: string): { tone: Tone; label: string } {
  const s = status.toLowerCase();
  if (['active', 'approved_internally', 'paid', 'completed', 'resolved', 'reviewed_indicative'].includes(s)) {
    return { tone: 'success', label: status.replace(/_/g, ' ') };
  }
  if (['pending', 'pending_review', 'under_review', 'in_review', 'in progress', 'in_progress', 'trial', 'submitted', 'under commissioning'].includes(s)) {
    return { tone: 'info', label: status.replace(/_/g, ' ') };
  }
  if (['changes_requested', 'flagged', 'unpaid', 'overdue', 'planned', 'open', 'medium', 'high'].includes(s)) {
    return { tone: 'warning', label: status.replace(/_/g, ' ') };
  }
  if (['rejected', 'suspended', 'revoked', 'urgent'].includes(s)) {
    return { tone: 'danger', label: status.replace(/_/g, ' ') };
  }
  return { tone: 'neutral', label: status.replace(/_/g, ' ') };
}

export const StatusText: React.FC<{ status: string; customLabel?: string }> = ({ status, customLabel }) => {
  const { tone, label } = resolveToneAndLabel(status);
  const formatted =
    customLabel ||
    label
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'danger'
      ? XCircle
      : tone === 'warning'
      ? AlertCircle
      : tone === 'info'
      ? Clock
      : status === 'draft'
      ? FileEdit
      : ShieldAlert;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${TONE_CLASSES[tone]}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{formatted}</span>
    </span>
  );
};
