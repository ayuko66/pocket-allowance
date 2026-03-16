import { clsx, type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const formatMonth = (value: string) => `${value.slice(0, 4)}年${value.slice(5, 7)}月`;

export const getMonthKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
};

export const getMonthKeyFromDate = (value: string) => value.slice(0, 7);

export const getTodayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);

export const formatDateTime = (value: string | null) => {
  if (!value) {
    return '未設定';
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const ruleStatusLabel: Record<string, string> = {
  draft: '下書き',
  pending_child_approval: '子の承認待ち',
  pending_parent_approval: '親の承認待ち',
  active: '有効',
  rejected: '却下',
};

export const summaryStatusLabel: Record<string, string> = {
  open: '集計中',
  closed: '締め済み',
};
