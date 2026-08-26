import React from 'react'
import Icon from './Icon'

// Shared password strength rules — used on signup and password reset.
// NOTE: client-side validation is UX only. Real enforcement must also be
// enabled in Supabase → Authentication → Policies (min length + required
// characters) and Leaked Password Protection (HaveIBeenPwned).
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: p => p.length >= 8 },
  { id: 'upper', label: 'An uppercase letter', test: p => /[A-Z]/.test(p) },
  { id: 'lower', label: 'A lowercase letter', test: p => /[a-z]/.test(p) },
  { id: 'number', label: 'A number', test: p => /[0-9]/.test(p) },
]

export function validatePassword(p) {
  const failed = PASSWORD_RULES.filter(r => !r.test(p))
  return { valid: failed.length === 0, failed }
}

export default function PasswordChecklist({ password }) {
  if (!password) return null
  return (
    <ul className="pw-checklist">
      {PASSWORD_RULES.map(r => {
        const met = r.test(password)
        return (
          <li key={r.id} className={`pw-rule ${met ? 'met' : ''}`}>
            <Icon name={met ? 'check' : 'x'} size={12} strokeWidth={2.5} />
            {r.label}
          </li>
        )
      })}
    </ul>
  )
}
