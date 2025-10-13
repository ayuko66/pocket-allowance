export const yymm = (d: Date = new Date()) => d.toISOString().slice(0,7);
export const fmtJPY = (v: number) => new Intl.NumberFormat('ja-JP', { style:'currency', currency:'JPY' }).format(v);
