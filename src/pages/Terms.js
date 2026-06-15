import React from 'react'
import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="legal-wrap">
      <div className="legal-inner">
        <Link to="/" className="legal-back">← Back to StockTrack</Link>
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-date">Last updated: June 2026</p>

        <p>These Terms of Service ("Terms") govern your use of StockTrack ("the Service"). By creating an account you agree to be bound by these Terms. Please read them carefully.</p>

        <h2>1. The Service</h2>
        <p>StockTrack is an inventory and profit-tracking tool designed for resellers and collectors. It allows you to record purchases, sales, and expenses, and visualise your financial performance. The Service is provided by StockTrack, operated as a sole trader in the United Kingdom.</p>

        <h2>2. Eligibility</h2>
        <p>You must be at least 13 years old to use StockTrack. By creating an account you confirm you meet this requirement. If you are using the Service for business purposes, you confirm you have authority to accept these Terms on behalf of that business.</p>

        <h2>3. Account</h2>
        <ul>
          <li>You are responsible for keeping your login credentials secure</li>
          <li>You must provide accurate information when creating your account</li>
          <li>You are responsible for all activity that occurs under your account</li>
          <li>Notify us immediately at hello@stocktrack.app if you suspect unauthorised access</li>
        </ul>

        <h2>4. Plans and billing</h2>
        <p>StockTrack offers a free Collector plan and a paid Reseller plan. Prices and features are shown on our pricing page. When paid plans are available:</p>
        <ul>
          <li>Subscriptions are billed monthly or annually in advance</li>
          <li>You may cancel at any time; access continues until the end of the paid period</li>
          <li>Refunds are not provided for partial periods except where required by law</li>
          <li>We reserve the right to change pricing with 30 days' notice to existing subscribers</li>
        </ul>

        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose or in breach of any regulations</li>
          <li>Attempt to access another user's data or circumvent security measures</li>
          <li>Scrape, reverse-engineer, or reproduce any part of the Service</li>
          <li>Upload malicious code or attempt to disrupt the Service</li>
          <li>Use the AI description feature to generate misleading or fraudulent listings</li>
        </ul>

        <h2>6. Your data</h2>
        <p>You own all inventory and financial data you enter into StockTrack. You grant us a limited licence to store and process that data solely for the purpose of providing the Service. See our <Link to="/privacy">Privacy Policy</Link> for full details.</p>

        <h2>7. No financial advice</h2>
        <p><strong>StockTrack is a record-keeping tool, not a financial adviser.</strong> The profit/loss figures, tax summaries, and metrics it displays are based solely on the data you enter. They do not constitute financial, tax, or investment advice. You are responsible for verifying your own figures and for your own tax obligations. We strongly recommend consulting a qualified accountant for tax advice.</p>

        <h2>8. Intellectual property</h2>
        <p>The StockTrack brand, software, and design are our intellectual property. Nothing in these Terms grants you any right to use our trademarks or reproduce our software.</p>

        <h2>9. Availability and changes</h2>
        <p>We aim to keep the Service available but do not guarantee uninterrupted access. We may modify, suspend, or discontinue features with reasonable notice. We will give at least 30 days' notice before discontinuing the Service entirely, and provide a way to export your data.</p>

        <h2>10. Limitation of liability</h2>
        <p>To the fullest extent permitted by law, StockTrack is not liable for any indirect, incidental, or consequential loss arising from your use of the Service, including but not limited to loss of profits, data loss, or business interruption. Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.</p>

        <h2>11. Termination</h2>
        <p>You may delete your account at any time from Account Settings. We may suspend or terminate your account if you breach these Terms, with notice where practical. On termination, your data is deleted in accordance with our Privacy Policy.</p>

        <h2>12. Governing law</h2>
        <p>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

        <h2>13. Changes to these Terms</h2>
        <p>We may update these Terms from time to time. We will notify you by email before material changes take effect. Continued use of the Service after the effective date constitutes acceptance of the updated Terms.</p>

        <h2>14. Contact</h2>
        <p>Questions about these Terms? Email us at <strong>hello@stocktrack.app</strong>.</p>
      </div>
    </div>
  )
}
