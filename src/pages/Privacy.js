import React from 'react'
import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="legal-wrap">
      <div className="legal-inner">
        <Link to="/" className="legal-back">← Back to StockTrack</Link>
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-date">Last updated: June 2026</p>

        <p>StockTrack ("we", "our", or "us") is committed to protecting your personal data. This policy explains what information we collect, how we use it, and your rights under the UK General Data Protection Regulation (UK GDPR).</p>

        <h2>1. Who we are</h2>
        <p>StockTrack is an inventory and profit-tracking tool for resellers and collectors, operated as a sole trader business in the United Kingdom. For data protection queries, contact us at: <strong>hello@stocktrack.app</strong></p>

        <h2>2. What data we collect</h2>
        <ul>
          <li><strong>Account data:</strong> your email address and password (stored securely via Supabase Auth)</li>
          <li><strong>Profile data:</strong> username, display name, VAT registration status</li>
          <li><strong>Inventory data:</strong> item details, purchase prices, sale prices, fees, platforms, and any notes you enter</li>
          <li><strong>Financial data:</strong> profit/loss records, expenses, and break-down data you log</li>
          <li><strong>Usage data:</strong> standard server logs (IP address, browser type, timestamps) retained for up to 30 days</li>
        </ul>
        <p>We do not collect payment card numbers. Payment processing (when available) will be handled by Stripe, who have their own privacy policy.</p>

        <h2>3. How we use your data</h2>
        <ul>
          <li>To provide and maintain the StockTrack service</li>
          <li>To authenticate your account and keep your data secure</li>
          <li>To calculate and display your inventory metrics and profit reports</li>
          <li>To send transactional emails (account confirmation, password reset) — no marketing without your consent</li>
          <li>To generate AI-powered listing descriptions using the item details you provide (processed by Anthropic's API; no data is stored by Anthropic beyond the request)</li>
        </ul>

        <h2>4. Legal basis for processing</h2>
        <ul>
          <li><strong>Contract performance:</strong> processing your inventory and account data is necessary to deliver the service you signed up for</li>
          <li><strong>Legitimate interests:</strong> maintaining security and preventing abuse</li>
          <li><strong>Legal obligation:</strong> retaining records where required by UK law</li>
        </ul>

        <h2>5. Who we share your data with</h2>
        <p>We use the following sub-processors to run the service. Your data is not sold to third parties.</p>
        <ul>
          <li><strong>Supabase</strong> (database and authentication) — EU/US data processing, SOC 2 Type II certified</li>
          <li><strong>Vercel</strong> (hosting and serverless functions) — EU/US infrastructure</li>
          <li><strong>Anthropic</strong> (AI description generation, optional feature) — processes item details you submit; no persistent storage</li>
        </ul>

        <h2>6. Data retention</h2>
        <p>We retain your data for as long as your account is active. If you delete your account, all personal data associated with it is permanently deleted within 30 days. Some data may be retained longer if required by law.</p>

        <h2>7. Your rights</h2>
        <p>Under UK GDPR you have the right to:</p>
        <ul>
          <li><strong>Access</strong> — request a copy of the data we hold about you</li>
          <li><strong>Rectification</strong> — correct inaccurate data</li>
          <li><strong>Erasure</strong> — delete your account and all associated data (available directly in Account Settings)</li>
          <li><strong>Portability</strong> — export your inventory data (CSV export available in the app)</li>
          <li><strong>Object</strong> — object to processing based on legitimate interests</li>
          <li><strong>Restriction</strong> — request we restrict processing in certain circumstances</li>
        </ul>
        <p>To exercise any right not available self-serve in the app, email <strong>hello@stocktrack.app</strong>. We will respond within 30 days.</p>

        <h2>8. Cookies</h2>
        <p>StockTrack uses only functional cookies and browser localStorage to keep you signed in and remember your preferences (e.g. dark mode, view mode). We do not use advertising or analytics cookies.</p>

        <h2>9. Security</h2>
        <p>All data is transmitted over HTTPS. Passwords are hashed and never stored in plain text. Your data is logically isolated — no other user can access your inventory or financial records.</p>

        <h2>10. Children</h2>
        <p>StockTrack is not directed at children under 13. We do not knowingly collect data from anyone under 13. If you believe a child has created an account, contact us and we will delete it.</p>

        <h2>11. Changes to this policy</h2>
        <p>We may update this policy from time to time. We will notify registered users of material changes by email. Continued use of the service after notice constitutes acceptance.</p>

        <h2>12. Complaints</h2>
        <p>If you are unhappy with how we handle your data, you have the right to complain to the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.</p>
      </div>
    </div>
  )
}
