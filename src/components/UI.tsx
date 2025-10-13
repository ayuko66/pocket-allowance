'use client';
import { clsx } from 'clsx';
import React from 'react';
export const Button = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={clsx('px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50', p.className)} />
);
export const Card: React.FC<React.PropsWithChildren<{title?: string}>> = ({title, children}) => (
  <div className="rounded-lg border p-4">
    {title && <h3 className="font-semibold mb-2">{title}</h3>}
    {children}
  </div>
);
