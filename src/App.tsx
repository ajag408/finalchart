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
      <header style={{
        width: '100%',
        textAlign: 'center',
        padding: '2rem 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        
        <h1 style={{ 
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '3.5rem',
          fontWeight: 'bold',
          margin: 0,
          background: `linear-gradient(45deg, ${SOLANA_COLORS.primary}, ${SOLANA_COLORS.secondary})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: `0 0 20px rgba(20, 241, 149, 0.3)`,
          letterSpacing: '0.1em'
        }}>
          Rug Chart
        </h1>

        {/* <div className="header-right">
          <SharePnlButton onClick={() => setIsShareModalOpen(true)} />
        </div> */}
      </header>
      
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

        <div style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              zIndex: 999
            }}>
            <button 
              onClick={() => setIsShareModalOpen(true)}
              style={{
                backgroundColor: SOLANA_COLORS.primary,
                color: SOLANA_COLORS.dark,
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(20, 241, 149, 0.2)'
              }}
            >
              <span>Share Results</span>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path 
                  fill="currentColor" 
                  d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"
                />
              </svg>
            </button>
      </div>
    </div>
  );
}

export default App;