export default function BottomNav({ tabs, active, onChange }) {
  return (
    <div style={{ flex: 'none', display: 'flex', background: '#fff', borderTop: '1px solid #e0e0e0', padding: '6px 4px 8px' }}>
      {tabs.map(([label, key]) => {
        const isActive = active === key;
        return (
          <div
            key={key}
            onClick={() => onChange(key)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', cursor: 'pointer', borderRadius: 8 }}
          >
            <div style={{ width: 22, height: 22, borderRadius: 6, background: isActive ? 'var(--brand-navy)' : 'rgba(0,0,0,.42)', opacity: isActive ? 1 : 0.35 }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? 'var(--brand-navy)' : 'rgba(0,0,0,.42)' }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}
