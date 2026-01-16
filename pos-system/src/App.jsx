// src/App.jsx
import React, { useState } from 'react';
import PointOfSale from './components/PointOfSale.jsx';
import Login from './components/Login.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';

// Import CSS
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('pos');

  const handleLogin = (user) => {
    setCurrentUser(user);
    setView('pos');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('pos');
  };

  // Check if user is admin/manager
  const canAccessDashboard = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

  return (
    <div>
      {!currentUser ? (
        <Login onLogin={handleLogin} />
      ) : (
        // 👇 UPDATED CONTAINER STYLES
        // If view is 'pos', lock the screen (hidden). 
        // If view is 'dashboard', let it scroll (auto).
        <div style={{
          height: '100vh',
          overflow: view === 'pos' ? 'hidden' : 'auto',
          backgroundColor: '#1a1a1a'
        }}>

          <div style={{
            // Ensure the content fills the screen for POS, 
            // but grows naturally for Dashboard
            height: view === 'pos' ? '100%' : 'auto',
            minHeight: '100%'
          }}>
            {view === 'pos' && (
              <PointOfSale
                onLogout={handleLogout}
                onNavigateToDashboard={canAccessDashboard ? () => setView('dashboard') : null}
              />
            )}
            {view === 'dashboard' && (
              <AdminDashboard
                onBack={() => setView('pos')}
                onLogout={handleLogout}
              />
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default App;