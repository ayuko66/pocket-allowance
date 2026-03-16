'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const primaryButtonClassName =
  'inline-flex items-center justify-center rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryButtonClassName =
  'inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-50';

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(primaryButtonClassName, className)} {...props} />;
}

export function SecondaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(secondaryButtonClassName, className)} {...props} />;
}

export function PrimaryLink({
  href,
  className,
  children,
}: PropsWithChildren<{ href: string; className?: string }>) {
  return (
    <Link href={href} className={cn(primaryButtonClassName, className)}>
      {children}
    </Link>
  );
}

export function Card({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-stone-200 bg-white/90 p-5 shadow-[0_24px_80px_-48px_rgba(17,24,39,0.45)] backdrop-blur',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">{eyebrow}</p> : null}
      <h2 className="text-xl font-semibold text-stone-950">{title}</h2>
      {description ? <p className="text-sm text-stone-600">{description}</p> : null}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100',
        className,
      )}
      {...props}
    />
  );
}

export function SelectInput({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-100',
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100',
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = 'default',
}: PropsWithChildren<{ tone?: 'default' | 'success' | 'warning' | 'danger' }>) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-800'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-900'
        : tone === 'danger'
          ? 'bg-rose-100 text-rose-800'
          : 'bg-stone-100 text-stone-700';

  return <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', toneClass)}>{children}</span>;
}

export function Field({
  label,
  hint,
  children,
}: PropsWithChildren<{ label: string; hint?: string }>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-stone-700">{title}</p>
      <p className="mt-2 text-sm text-stone-500">{description}</p>
    </div>
  );
}
