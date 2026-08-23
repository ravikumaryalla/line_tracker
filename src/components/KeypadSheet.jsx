import { F } from '../format';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];

export default function KeypadSheet({ name, sub, weekly, amount, onKey, onSave, onClose, saving }) {
  const chips = [weekly, Math.round(weekly / 2), weekly * 2];

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 20 }}>
      <div onClick={onClose} style={{ flex: 1 }} />
      <div style={{ background: '#fff', borderRadius: '18px 18px 0 0', padding: '18px 18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{sub}</div>
          </div>
          <div onClick={onClose} style={{ fontSize: 22, color: 'rgba(0,0,0,.4)', cursor: 'pointer', padding: '0 6px' }}>×</div>
        </div>

        <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 16, marginTop: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,.5)' }}>Amount received</div>
          <div style={{ fontSize: 42, fontWeight: 700, color: 'var(--brand-navy)', letterSpacing: '-.02em', marginTop: 4, lineHeight: 1.1 }}>
            {amount ? F(parseInt(amount, 10) || 0) : '₹0'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {chips.map((c) => (
            <div
              key={c}
              onClick={() => onKey('set', String(c))}
              style={{ flex: 1, textAlign: 'center', border: '1px solid #e0e0e0', borderRadius: 9999, padding: '9px 4px', fontSize: 13.5, fontWeight: 600, color: 'var(--brand-navy)', cursor: 'pointer' }}
            >
              {F(c)}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
          {DIGITS.map((k) => (
            <div
              key={k}
              onClick={() => onKey('press', k)}
              style={{ background: '#f5f5f5', borderRadius: 10, padding: '15px 0', textAlign: 'center', fontSize: 22, fontWeight: 600, color: 'rgba(0,0,0,.8)', cursor: 'pointer', userSelect: 'none' }}
            >
              {k}
            </div>
          ))}
        </div>

        <div
          onClick={onSave}
          style={{ marginTop: 14, textAlign: 'center', background: '#43a047', color: '#fff', borderRadius: 10, padding: 16, fontSize: 17, fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0,44,97,.2)', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : amount ? `Save ${F(parseInt(amount, 10) || 0)} as paid` : 'Save as paid'}
        </div>
      </div>
    </div>
  );
}
