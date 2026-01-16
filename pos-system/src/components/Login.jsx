// src/components/Login.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Notification from './Notification'; // Keeping your notification system!

const Login = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotification({ message: '', type: '' });

    try {
      // 👇 1. Call the SECURE database function
      const { data, error } = await supabase.rpc('verify_user_pin', {
        user_name: name.trim(), // Trim spaces just in case
        input_pin: pin
      });

      if (error) throw error;

      if (data) {
        // ✅ Success!
        setNotification({ message: `Welcome, ${data.name}!`, type: 'success' });

        // Small delay so they see the success message
        setTimeout(() => {
          onLogin(data);
        }, 1000);
      } else {
        // ❌ Fail (User verification returned null)
        setNotification({ message: 'Invalid Name or PIN', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setNotification({ message: 'Login Error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Styles to keep it looking like your dark theme
  const styles = {
    container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#222', color: 'white' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px', width: '300px', padding: '30px', background: '#333', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' },
    input: { padding: '15px', fontSize: '1.2rem', borderRadius: '5px', border: '1px solid #555', background: '#222', color: 'white', textAlign: 'center' },
    button: { padding: '15px', fontSize: '1.2rem', borderRadius: '5px', border: 'none', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', fontWeight: 'bold' }
  };

  return (
    <div style={styles.container}>
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

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
        />

        <input
          style={styles.input}
          type="password"
          placeholder="PIN"
          maxLength="4"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={loading}
          style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Verifying...' : 'LOGIN'}
        </button>
      </form>
    </div>
  );
};

export default Login;