// src/components/Login.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Notification from './Notification';
import { hashPin } from '../data/repository';

const Login = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setNotification({ message: '', type: '' });

    try {
      const hashedPin = await hashPin(pin);

      const { data, error } = await supabase.rpc('verify_user_pin', {
        user_name: name.trim(),
        input_pin: hashedPin
      });

      if (error) throw error;

      if (data) {
        setNotification({ message: `Welcome, ${data.name}!`, type: 'success' });
        setTimeout(() => {
          onLogin(data);
        }, 800);
      } else {
        setNotification({ message: 'Invalid Name or PIN', type: 'error' });
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setNotification({ message: 'Login Error', type: 'error' });
      setLoading(false);
    }
  };

  const styles = {
    container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#222', color: 'white' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px', width: '300px', padding: '30px', background: '#333', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' },
    input: { padding: '15px', fontSize: '1.2rem', borderRadius: '5px', border: '1px solid #555', background: '#222', color: 'white', textAlign: 'center' },
    button: {
      padding: '15px', fontSize: '1.2rem', borderRadius: '5px', border: 'none',
      cursor: loading ? 'not-allowed' : 'pointer',
      backgroundColor: loading ? '#555' : '#28a745',
      color: 'white', fontWeight: 'bold',
      transition: 'all 0.2s',
      display: 'flex', justifyContent: 'center' // Center the text + dots
    }
  };

  return (
    <div style={styles.container}>
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      {/* 👇 ANIMATION STYLES */}
      <style>{`
        @keyframes dots {
          0%, 20% { content: "."; }
          40% { content: ".."; }
          60%, 100% { content: "..."; }
        }
        .animated-dots::after {
          content: ".";
          animation: dots 1.5s steps(1, end) infinite;
          display: inline-block;
          width: 0px; /* Prevents button size jumping */
          text-align: left;
        }
      `}</style>

      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>System Login</h2>

        <input
          style={styles.input}
          type="text"
          placeholder="Name (e.g. Jan)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          autoComplete="username"
          disabled={loading}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="PIN"
          maxLength="4"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoComplete="current-password"
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading}
          style={styles.button}
        >
          {loading ? <span className="animated-dots">Verifying</span> : 'LOGIN'}
        </button>
      </form>
    </div>
  );
};

export default Login;