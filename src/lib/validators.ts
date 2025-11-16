// File: src/lib/validators.ts
// allow letters, spaces, apostrophes, hyphens; min 2 total visible chars
export const nameOk = (s: string) => /^[A-Za-z][A-Za-z\s'-]{1,119}$/.test(s.trim());

export const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// keep password rule
export const pwdOk = (s: string) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,512}$/.test(s);

export const mobileOk = (s: string) => /^[\+\d][\d\s\-()]{7,}$/.test(s.trim());
