// src/components/Login.jsx
import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleNumClick = (num) => {
    if (pin.length < 4) {
      setPin(pin + num);
      setError('');
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = () => {
    // 1. Get users from our "Database"
    const users = JSON.parse(localStorage.getItem('pos_users')) || [];
    
    // 2. Find the user with this PIN
    const user = users.find(u => u.pin === pin);

    if (user) {
      onLogin(user); // Send user info back to App.jsx
    } else {
      setError('Invalid PIN');
      setPin('');
    }
  };

  // Styles
  const styles = {
    container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#222', color: 'white' },
    display: { fontSize: '2rem', marginBottom: '20px', padding: '10px', width: '200px', textAlign: 'center', background: '#333', borderRadius: '5px' },
    keypad: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
    button: { width: '80px', height: '80px', fontSize: '1.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer', background: '#444', color: 'white' },
    loginBtn: { gridColumn: 'span 3', backgroundColor: 'green', color: 'white' },
    error: { color: 'red', height: '20px', marginBottom: '10px' }
  };

  return (
    <div style={styles.container}>
      <h2>Enter PIN</h2>
      <div style={styles.display}>{pin.replace(/./g, '•') || '____'}</div> {/* Hides the PIN */}
      <div style={styles.error}>{error}</div>
      
      <div style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button key={num} onClick={() => handleNumClick(num.toString())} style={styles.button}>
            {num}
          </button>
        ))}
        <button onClick={handleClear} style={{ ...styles.button, backgroundColor: '#882222' }}>CLR</button>
        <button onClick={() => handleNumClick('0')} style={styles.button}>0</button>
        <button onClick={handleSubmit} style={{ ...styles.button, ...styles.loginBtn }}>
          LOGIN
        </button>
      </div>
      
      <div style={{marginTop: '20px', color: '#888'}}>
        <small>Hint: Try 1111, 2222, or 3333</small>
      </div>
    </div>
  );
};

export default Login;