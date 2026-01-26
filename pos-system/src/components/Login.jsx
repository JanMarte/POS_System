// src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Notification from './Notification';
import { hashPin } from '../data/repository';

const Login = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  // 💥 State for the shake effect
  const [isShaking, setIsShaking] = useState(false);

  // 🛡️ Theme Sync
  useEffect(() => {
    const savedTheme = localStorage.getItem('pos-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeToApply = savedTheme || (systemDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', themeToApply);
  }, []);

  // 📳 Haptic Feedback Helper
  const hapticFeedback = (duration = 10) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(duration);
    }
  };

  // ⌨️ Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') return;

      if (e.key >= '0' && e.key <= '9') {
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace') {
        hapticFeedback();
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (pin.length === 4) handleSubmit();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, name, loading]); // Added loading to deps to prevent double-firing

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading || pin.length < 4) return;

    setLoading(true);
    setNotification({ message: '', type: '' });
    setIsShaking(false);

    try {
      const hashedPin = await hashPin(pin);
      const { data, error } = await supabase.rpc('verify_user_pin', {
        user_name: name.trim(),
        input_pin: hashedPin
      });

      if (error) throw error;

      if (data) {
        if (data.theme) {
          document.documentElement.setAttribute('data-theme', data.theme);
          localStorage.setItem('pos-theme', data.theme);
        }
        setNotification({ message: `Welcome, ${data.name}!`, type: 'success' });
        setTimeout(() => onLogin(data), 800);
      } else {
        // 💥 Failure: Shake and Vibrate
        setIsShaking(true);
        hapticFeedback([50, 30, 50]); // Double-vibrate for error
        setNotification({ message: 'Invalid Name or PIN', type: 'error' });
        setPin('');
        setLoading(false);

        // Reset shake state after animation ends
        setTimeout(() => setIsShaking(false), 400);
      }
    } catch (err) {
      setNotification({ message: 'Login Error', type: 'error' });
      setLoading(false);
    }
  };

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      hapticFeedback();
      setPin(prev => prev + num);
    }
  };

  const handleClear = () => {
    hapticFeedback();
    setPin('');
  };

  return (
    <div className="pos-container login-layout">
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      {/* 💎 Added conditional class "login-card-shake" */}
      <div className={`glass-panel login-card ${isShaking ? 'login-card-shake' : ''}`}>
        <h2 className="login-title">System Login</h2>

        <form onSubmit={handleSubmit} className="flex-col">
          <div className="login-field-group">
            <div className="flex-col">
              <label className="text-sm text-blue font-bold ml-5 mb-5">STAFF NAME</label>
              <input
                className="input-glass input-login w-100"
                type="text"
                placeholder="Enter Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div className="flex-col">
              <label className="text-sm text-blue font-bold ml-5 mb-5">SECURITY PIN</label>
              <div className="pin-input-wrapper">
                <input
                  className="input-glass input-login w-100 text-center"
                  type={showPin ? "text" : "password"}
                  placeholder="••••"
                  value={pin}
                  readOnly
                  disabled={loading}
                  autoComplete="one-time-code"
                />
                <button
                  type="button"
                  className="btn-show-pin"
                  onClick={() => { hapticFeedback(); setShowPin(!showPin); }}
                >
                  {showPin ? '👁️‍🗨️' : '👁️'}
                </button>
              </div>
            </div>
          </div>

          <div className="login-pin-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                type="button"
                className="btn-glass btn-pin"
                onClick={() => handleNumberClick(num.toString())}
              >
                {num}
              </button>
            ))}
            <button type="button" className="btn-glass btn-pin btn-clear" onClick={handleClear}>C</button>
            <button type="button" className="btn-glass btn-pin" onClick={() => handleNumberClick('0')}>0</button>
            <button
              type="submit"
              className="btn-glass btn-pin btn-go"
              disabled={pin.length < 4 || loading}
            >
              ➔
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;