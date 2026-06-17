interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  accent?: string;
}

export function Pagination({ page, total, pageSize, onChange, accent = '#4318FF' }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const getPages = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const btn = (active: boolean, disabled: boolean): React.CSSProperties => ({
    minWidth: 32, height: 32, borderRadius: 8, border: 'none',
    background: active ? accent : '#F4F7FE',
    color: active ? '#fff' : disabled ? '#D0D5DD' : '#A3AED0',
    fontWeight: active ? 800 : 600, fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 8px',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderTop: '1px solid #F4F7FE' }}>
      <div style={{ fontSize: 12, color: '#A3AED0', fontWeight: 500 }}>{from}–{to} of {total}</div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button style={btn(false, page === 1)} onClick={() => onChange(page - 1)} disabled={page === 1}>‹</button>
        {getPages().map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} style={{ padding: '0 4px', color: '#A3AED0', fontSize: 13 }}>…</span>
            : <button key={p} style={btn(p === page, false)} onClick={() => onChange(Number(p))}>{p}</button>
        )}
        <button style={btn(false, page === totalPages)} onClick={() => onChange(page + 1)} disabled={page === totalPages}>›</button>
      </div>
    </div>
  );
}
