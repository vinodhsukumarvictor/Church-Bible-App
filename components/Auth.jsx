import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';

export default function Auth() {
  const { user, signIn, signUp, signOut } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleSignIn() {
    setStatus('Signing in…');
    try {
      const { error } = await signIn({ email, password });
      if (error) {
        setStatus(`Error: ${error.message}`);
        return;
      }
      setStatus('Signed in');
      setEmail('');
      setPassword('');
      setTimeout(() => setModalOpen(false), 500);
    } catch (e) {
      setStatus('Sign in failed');
    }
  }

  async function handleSignUp() {
    setStatus('Creating account…');
    try {
      const { error, data } = await signUp({ email, password });
      if (error) {
        setStatus(`Error: ${error.message}`);
        return;
      }
      if (data?.user) {
        try {
          // Create profile entry
          const { supabase } = await import('../lib/supabaseClient');
          const defaultName = email.split('@')[0];
          await supabase.from('profiles').upsert({ id: data.user.id, full_name: defaultName });
        } catch (e) { /* ignore profile creation failure */ }
      }
      setStatus('Account created. Check your email if confirmation is required.');
      setEmail('');
      setPassword('');
    } catch (e) {
      setStatus('Sign up failed');
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setStatus('Signed out');
      setModalOpen(false);
    } catch (e) {
      setStatus('Sign out failed');
    }
  }

  const initial = (user?.user_metadata?.full_name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <>
      {/* Modal */}
      <div id="profileModal" className={`modal ${modalOpen ? 'visible' : ''}`} hidden={!modalOpen}>
        <div className="modal-content">
          <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="profile-info mb-4">
            <div className="profile-avatar text-2xl font-bold w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 text-white flex items-center justify-center">{initial}</div>
            <h2 className="font-semibold mt-3">{user ? (user.user_metadata?.full_name || user.email || 'Signed in') : 'Not signed in'}</h2>
            <p className="text-sm text-muted-foreground">{user ? user.email : 'Sign in or create an account'}</p>
          </div>

          <div className="auth-form space-y-3">
            {!user ? (
              <>
                <div>
                  <label className="small muted" htmlFor="authEmail">Email</label>
                  <input id="authEmail" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field w-full" />
                </div>
                <div>
                  <label className="small muted" htmlFor="authPassword">Password</label>
                  <input id="authPassword" type="password" placeholder="Password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field w-full" />
                </div>
                <div className="auth-actions flex gap-2">
                  <button className="btn primary flex-1" onClick={isSignUp ? handleSignUp : handleSignIn}>
                    {isSignUp ? 'Sign up' : 'Sign in'}
                  </button>
                  <button className="btn flex-1" onClick={() => setIsSignUp(!isSignUp)}>
                    {isSignUp ? 'Back' : 'Create account'}
                  </button>
                </div>
              </>
            ) : (
              <button className="btn warn w-full" onClick={handleSignOut}>Sign out</button>
            )}
            <p id="authStatus" className="small muted" aria-live="polite">{status}</p>
          </div>
        </div>
      </div>

      {/* Profile Button Trigger */}
      <button
        className="profile-btn w-8 h-8 rounded-full font-bold text-white bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center"
        onClick={() => setModalOpen(true)}
        aria-label="Profile"
      >
        {initial}
      </button>
    </>
  );
}
