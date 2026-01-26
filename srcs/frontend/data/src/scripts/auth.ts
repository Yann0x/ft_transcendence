// auth utils for the frontend

const TOKEN_KEY = 'authToken';

// get stored JWT token from sessionStorage
export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

// set the JWT token in sessionStorage
export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

// remove the JWT token from sessionStorage
export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// check if user is logged in (has a valid token)
export function isLoggedIn(): boolean {
  return !!getToken();
}
