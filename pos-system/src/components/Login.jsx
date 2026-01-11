// src/components/Login.jsx
import React, { useState } from 'react';
import { getUsers } from '../data/repository';
import { useEffect } from 'react';

const Login = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    setLoading(true);

    // 1. Get users from Supabase
    const users = await getUsers();

    // 2. Find the user
    const user = users.find(u => u.pin === pin);

    if (user) {
      onLogin(user);
    } else {
      setError('Invalid PIN');
      setPin('');
    }
    setLoading(false);
  };

  // Styles (same as before)
  const styles = {
    container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#222', color: 'white' },
    display: { fontSize: '2rem', marginBottom: '20px', padding: '10px', width: '200px', textAlign: 'center', background: '#333', borderRadius: '5px' },
    keypad: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
    button: { width: '80px', height: '80px', fontSize: '1.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer', background: '#444', color: 'white' },
    loginBtn: { gridColumn: 'span 3', backgroundColor: 'green', color: 'white' },
    error: { color: 'red', height: '20px', marginBottom: '10px' }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Handle Numbers (0-9)
      if (/^[0-9]$/.test(e.key)) {
        if (pin.length < 4) {
          setPin((prev) => prev + e.key);
          setError(''); // Clear error when typing
        }
      }

      // 2. Handle Backspace
      if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        setError('');
      }

      // 3. Handle Enter (Main Enter & Numpad Enter)
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevents weird form submission behaviors
        handleSubmit(); // 👈 This fires your existing login logic
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    
  }, [pin, handleSubmit]);

  return (
    <div style={styles.container}>
      <h2>Enter PIN</h2>
      <div style={styles.display}>{pin.replace(/./g, '•') || '____'}</div>
      <div style={styles.error}>{loading ? 'Verifying...' : error}</div>

      <div style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button key={num} onClick={() => handleNumClick(num.toString())} style={styles.button}>
            {num}
          </button>
        ))}
        <button onClick={handleClear} style={{ ...styles.button, backgroundColor: '#882222' }}>CLR</button>
        <button onClick={() => handleNumClick('0')} style={styles.button}>0</button>
        <button onClick={handleSubmit} disabled={loading} style={{ ...styles.button, ...styles.loginBtn, opacity: loading ? 0.5 : 1 }}>
          {loading ? '...' : 'LOGIN'}
        </button>
      </div>
    </div>
  );
};

export default Login;