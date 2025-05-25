import { useState } from 'react';
import CandleChart from './components/CandleChart';
import { SOLANA_COLORS } from './components/CandleChart';

function App() {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentPnl, setCurrentPnl] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '1200px', 
      margin: '0 auto',
      padding: '2rem',
      background: `linear-gradient(to bottom, ${SOLANA_COLORS.dark}, #000)`,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem'
    }}>
      
      <main style={{
        width: '100%',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        border: `1px solid rgba(${SOLANA_COLORS.primary}, 0.1)`,
        backdropFilter: 'blur(8px)'
      }}>
        <CandleChart 
          onPnlChange={setCurrentPnl}
          onLevelChange={setCurrentLevel}
        />
      </main>
    </div>
  );
}

export default App;