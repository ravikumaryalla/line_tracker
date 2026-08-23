import { useState } from 'react';
import AgentApp from './agent/AgentApp';
import AdminApp from './admin/AdminApp';

export default function App() {
  const [role, setRole] = useState(null);

  return (
    <div className="phone-shell">
      <div className="phone">
        {role === 'agent' && <AgentApp onSwitchRole={() => setRole(null)} />}
        {role === 'admin' && <AdminApp onSwitchRole={() => setRole(null)} />}
        {!role && <RolePicker onPick={setRole} />}
      </div>
    </div>
  );
}

function RolePicker({ onPick }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand-navy)' }}>Lending Collection</div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: 4 }}>Choose how you want to sign in</div>
      </div>
      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => onPick('agent')} style={cardBtn('#1e88e5')}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Agent app</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.8)', marginTop: 3 }}>Collect payments in the field</div>
        </button>
        <button onClick={() => onPick('admin')} style={cardBtn('#002C61')}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Admin app</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.8)', marginTop: 3 }}>Manage villages, agents and money</div>
        </button>
      </div>
    </div>
  );
}

function cardBtn(bg) {
  return {
    background: bg, color: '#fff', border: 'none', borderRadius: 12, padding: '18px 20px',
    textAlign: 'left', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0,44,97,.2)', width: '100%',
  };
}
