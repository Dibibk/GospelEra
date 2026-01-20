/**
 * Password Validation for Account Creation
 * 
 * Rules enforced:
 * 1. Length: 8-64 characters
 * 2. At least one uppercase letter (A-Z)
 * 3. At least one lowercase letter (a-z)
 * 4. At least one number (0-9)
 * 5. At least one special character
 * 6. No character repeated more than 3 times in a row
 * 7. No common patterns (password, 123456, qwerty, admin, gospelera)
 * 8. No leading or trailing spaces
 * 
 * Long passphrases like "BlueSky!Prayer2026" are allowed
 */

// Banned common patterns (case-insensitive)
const BANNED_PATTERNS = [
  'password',
  '123456',
  'qwerty',
  'admin',
  'gospelera'
];

// Special characters that satisfy the requirement
const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;

interface PasswordValidationResult {
  valid: boolean;
  error: string | null;
}

/**
 * Validates a password for account creation
 * Returns { valid: true } if password meets all requirements
 * Returns { valid: false, error: "..." } with user-friendly message if invalid
 */
export function validatePassword(password: string): PasswordValidationResult {
  // Rule 8: No leading or trailing spaces
  if (password !== password.trim()) {
    return {
      valid: false,
      error: "Password must be 8–64 characters and include uppercase, lowercase, a number, and a special character. Avoid common words and repeated characters."
    };
  }

  // Rule 1: Length check (8-64 characters)
  if (password.length < 8 || password.length > 64) {
    return {
      valid: false,
      error: "Password must be 8–64 characters and include uppercase, lowercase, a number, and a special character. Avoid common words and repeated characters."
    };
  }

  // Rule 2: At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must be 8–64 characters and include uppercase, lowercase, a number, and a special character. Avoid common words and repeated characters."
    };
  }

  // Rule 3: At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must be 8–64 characters and include uppercase, lowercase, a number, and a special character. Avoid common words and repeated characters."
    };
  }

  // Rule 4: At least one number
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must be 8–64 characters and include uppercase, lowercase, a number, and a special character. Avoid common words and repeated characters."
    };
  }

  // Rule 5: At least one special character
  if (!SPECIAL_CHARS.test(password)) {
    return {
      valid: false,
      error: "Password must be 8–64 characters and include uppercase, lowercase, a number, and a special character. Avoid common words and repeated characters."
    };
  }

  // Rule 6: No character repeated more than 3 times in a row
  // This checks for patterns like "aaaa", "1111", "!!!!"
  if (hasExcessiveRepetition(password)) {
    return {
      valid: false,
      error: "Password must be 8–64 characters and include uppercase, lowercase, a number, and a special character. Avoid common words and repeated characters."
    };
  }

  // Rule 7: No common patterns (case-insensitive)
  if (containsBannedPattern(password)) {
    return {
      valid: false,
      error: "Password must be 8–64 characters and include uppercase, lowercase, a number, and a special character. Avoid common words and repeated characters."
    };
  }

  // All checks passed
  return { valid: true, error: null };
}

/**
 * Checks if password has any character repeated more than 3 times consecutively
 * Examples that fail: "aaaa", "1111", "@@@@"
 * Examples that pass: "aaa", "111", "aaa1bbb"
 */
function hasExcessiveRepetition(password: string): boolean {
  for (let i = 0; i < password.length - 3; i++) {
    const char = password[i];
    // Check if the next 3 characters are the same
    if (password[i + 1] === char && password[i + 2] === char && password[i + 3] === char) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if password contains any banned pattern (case-insensitive)
 * Patterns: password, 123456, qwerty, admin, gospelera
 */
function containsBannedPattern(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  return BANNED_PATTERNS.some(pattern => lowerPassword.includes(pattern));
}
