// Authentication form component for login and signup
import { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '../firebase';

export default function AuthForm({ isLogin, onToggleMode, onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      
      if (onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          setError('No account found with this email address');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        case 'auth/email-already-in-use':
          setError('An account with this email already exists');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later');
          break;
        default:
          setError('Authentication failed. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setError('');
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to send password reset email');
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h1 className="auth-title">
          {isLogin ? 'Welcome Back' : 'Join Lexcelerate'}
        </h1>
        <p className="auth-subtitle">
          {isLogin 
            ? 'Sign in to continue your vocabulary journey' 
            : 'Create your account to start learning'
          }
        </p>

        {error && (
          <div className="auth-error">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        {resetEmailSent && (
          <div className="auth-success">
            <span className="success-icon">✓</span>
            <span className="success-text">Password reset email sent! Check your inbox.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-fields">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-icon">⏳</span>
                <span className="btn-text">
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </span>
              </>
            ) : (
              <>
                <span className="btn-icon">{isLogin ? '🔑' : '✨'}</span>
                <span className="btn-text">
                  {isLogin ? 'Sign In' : 'Create Account'}
                </span>
              </>
            )}
          </button>
        </form>

        <div className="auth-actions">
          {isLogin && (
            <button 
              type="button" 
              className="forgot-password-btn"
              onClick={handlePasswordReset}
              disabled={loading}
            >
              Forgot your password?
            </button>
          )}

          <div className="auth-toggle">
            <span className="toggle-text">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button 
              type="button" 
              className="toggle-btn"
              onClick={onToggleMode}
              disabled={loading}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}