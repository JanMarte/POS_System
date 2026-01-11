// src/App.jsx
import React, { useState } from 'react'; // Removed useEffect & seedDatabase
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

  const canAccessDashboard = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

  return (
    <div>
      {!currentUser ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div style={{ position: 'relative' }}>
          
          {/* TOP BAR */}
          <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: '50px', padding: '0 20px', background: '#333', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>User: <strong>{currentUser.name}</strong> ({currentUser.role})</span>
            <div>
                {canAccessDashboard && view === 'pos' && (
                    <button onClick={() => setView('dashboard')} style={{ marginRight: '10px', padding: '5px 15px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                        ADMIN DASHBOARD
                    </button>
                )}
                <button onClick={handleLogout} style={{ padding: '5px 15px', background: '#d9534f', color: 'white', border: 'none', cursor: 'pointer' }}>
                  LOGOUT
                </button>
            </div>
          </div>
          
          {/* MAIN CONTENT */}
          <div style={{ paddingTop: '50px' }}> 
            {view === 'pos' && <PointOfSale />}
            {view === 'dashboard' && <AdminDashboard onBack={() => setView('pos')} />}
          </div>

        </div>
      )}
    </div>
  );
}

export default App;