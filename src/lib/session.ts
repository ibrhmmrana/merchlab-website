// Session token management for branding selections
export function getOrCreateSessionToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  const key = 'merchlab_session_token';
  let token = localStorage.getItem(key);
  
  if (!token) {
    // Generate a new session token (UUID-like format)
    token = `ml_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(key, token);
  }
  
  return token;
}

