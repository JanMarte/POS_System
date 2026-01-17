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

  // Check if user is admin, manager, OR bartender
  const canAccessDashboard = currentUser && (
    currentUser.role === 'admin' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'bartender'
  );

  return (
    <div>
      {!currentUser ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div style={{
          height: '100vh',
          overflow: view === 'pos' ? 'hidden' : 'auto',
          backgroundColor: '#1a1a1a'
        }}>

          <div style={{
            height: view === 'pos' ? '100%' : 'auto',
            minHeight: '100%'
          }}>
            {view === 'pos' && (
              <PointOfSale
                user={currentUser}
                onLogout={handleLogout}
                onNavigateToDashboard={canAccessDashboard ? () => setView('dashboard') : null}
              />
            )}
            {view === 'dashboard' && (
              <AdminDashboard
                user={currentUser}
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