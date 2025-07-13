// User profile component showing current user info and logout
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function UserProfile({ user, onLogout }) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getUserDisplayName = () => {
    if (user.displayName) {
      return user.displayName;
    }
    // Extract name from email (part before @)
    return user.email.split('@')[0];
  };

  const getInitials = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="user-profile">
      <div className="user-info">
        <div className="user-avatar">
          <span className="avatar-initials">{getInitials()}</span>
        </div>
        <div className="user-details">
          <span className="user-name">{getUserDisplayName()}</span>
          <span className="user-email">{user.email}</span>
        </div>
      </div>
      
      <button 
        onClick={handleLogout}
        className="logout-btn"
        title="Sign Out"
      >
        <span className="btn-icon">🚪</span>
        <span className="btn-text">Sign Out</span>
      </button>
    </div>
  );
}