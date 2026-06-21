import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

const FEATURES = [
  { icon: '📦', title: 'Stock tracking', desc: 'Track every item you own — sneakers, Pokémon cards, Lego, clothing and more. Add in seconds, find anything instantly.' },
  { icon: '💰', title: 'P&L at a glance', desc: 'See exactly what you paid, what you sold for, and what you made. Per item, per month, all time — always accurate.' },
  { icon: '📊', title: 'Powerful analytics', desc: 'Best brands, sell-through rates, ROI charts, monthly trends. Know your business inside out.' },
  { icon: '🃏', title: 'Break management', desc: 'Run live breaks, track spots by buyer, manage payouts. Per-spot P&L built in.' },
  { icon: '⚡', title: 'Composite rankings', desc: 'Best & worst performers scored by profit, ROI, and sale speed. Stop guessing what to buy next.' },
  { icon: '🔒', title: 'Completely private', desc: 'Every account is fully isolated. Your stock and your numbers are only ever visible to you.' },
]

const PLANS = [
  {
    name: 'Free',
    price: '£0',
    period: '',
    tagline: 'Dip your toe in',
    accent: '#8890b5',
    features: [
      'Up to 30 items',
      'Collector tab',
      'Notes & condition tracking',
      'No credit card needed',
    ],
    cta: 'Get started free',
  },
  {
    name: 'Core',
    price: '£12',
    period: '/mo',
    tagline: 'For active resellers',
    accent: '#f59e0b',
    badge: 'Most popular',
    highlight: true,
    features: [
      'Unlimited inventory',
      'Full P&L tracking',
      'Finance & expenses',
      'Breaker module',
      'Wishlist',
      'CSV import / export',
    ],
    cta: 'Start Core',
  },
  {
    name: 'Pro',
    price: '£20',
    period: '/mo',
    tagline: 'For serious operators',
    accent: '#34d399',
    features: [
      'Everything in Core',
      'Bulk edit',
      'Monthly PDF reports',
      'eBay CSV import',
      'Team access',
      'Tax summary',
      'AI description generator',
      'SKU lookup',
    ],
    cta: 'Go Pro',
  },
]

export default function Landing({ session }) {
  // Scroll reveal — fires once per element when it enters the viewport
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('lp-visible'); obs.unobserve(e.target) } }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <div className="lp">

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link to="/" className="lp-brand">
            <img src="/logo-dark.svg" alt="ITS VAULTED" className="lp-logo" />
          </Link>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#pricing" className="lp-nav-link">Pricing</a>
            {session
              ? <Link to="/dashboard" className="lp-btn-gold">Dashboard →</Link>
              : <>
                  <Link to="/login" className="lp-nav-link">Sign in</Link>
                  <Link to="/login" className="lp-btn-gold">Get started →</Link>
                </>
            }
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="lp-hero">
        {/* Ambient orbs */}
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />

        <div className="lp-hero-content">
          <div className="lp-badge lp-reveal">Built for resellers &amp; collectors 🏆</div>

          <h1 className="lp-hero-title lp-reveal">
            Track your stock.<br />
            <span className="lp-gold-text">Know your profit.</span>
          </h1>

          <p className="lp-hero-sub lp-reveal">
            ITS VAULTED is the cleanest way to manage your reselling business. Add items, mark them sold, and watch your P&amp;L update in real time.
          </p>

          <div className="lp-hero-ctas lp-reveal">
            <Link to="/login" className="lp-btn-gold lp-btn-lg">Get started free →</Link>
            <a href="#features" className="lp-btn-ghost lp-btn-lg">See how it works</a>
          </div>

          <p className="lp-hero-note lp-reveal">No credit card required · Free plan available</p>
        </div>

        {/* Stats glass card */}
        <div className="lp-stats lp-reveal">
          {[
            { num: '6',         label: 'Item categories' },
            { num: 'Real-time', label: 'P&L updates' },
            { num: '£0',        label: 'To get started' },
            { num: '100%',      label: 'Private data' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <div className="lp-stats-sep" />}
              <div className="lp-stat">
                <span className="lp-stat-num">{s.num}</span>
                <span className="lp-stat-label">{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="lp-section" id="features">
        <div className="lp-container">
          <div className="lp-eyebrow lp-reveal">Features</div>
          <h2 className="lp-section-title lp-reveal">
            Everything you need to<br /><span className="lp-gold-text">run your business</span>
          </h2>
          <p className="lp-section-sub lp-reveal">
            Whether you flip sneakers, sell Pokémon cards, or trade anything in between — ITS VAULTED keeps you on top of it all.
          </p>

          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="lp-feature-card lp-reveal"
                style={{ transitionDelay: `${i * 0.07}s` }}
              >
                <span className="lp-feature-icon">{f.icon}</span>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Shop teaser ───────────────────────────────────── */}
      <section className="lp-shop-wrap">
        <div className="lp-container">
          <div className="lp-shop-card lp-reveal">
            <div>
              <div className="lp-eyebrow">Coming soon</div>
              <h3 className="lp-shop-title">Sneaker care, sorted</h3>
              <p className="lp-shop-desc">Crease protectors, shoe trees, laces, storage boxes and more — all in one place. Pro members get exclusive discounts on every order.</p>
            </div>
            <div className="lp-shop-pill">🛍️ Pro members save on every order</div>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────── */}
      <section className="lp-section" id="pricing">
        <div className="lp-container">
          <div className="lp-eyebrow lp-reveal">Pricing</div>
          <h2 className="lp-section-title lp-reveal">Simple, transparent pricing</h2>
          <p className="lp-section-sub lp-reveal">Start free. Upgrade when you're ready to get serious about your numbers.</p>

          <div className="lp-pricing-grid">
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                className={`lp-pricing-card lp-reveal${plan.highlight ? ' lp-pricing-highlight' : ''}`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                {plan.badge && <div className="lp-pricing-badge">{plan.badge}</div>}
                <div className="lp-pricing-name" style={{ color: plan.accent }}>{plan.name}</div>
                <div className="lp-pricing-price">
                  {plan.price}
                  {plan.period && <span className="lp-pricing-period">{plan.period}</span>}
                </div>
                <div className="lp-pricing-tagline">{plan.tagline}</div>
                <div className="lp-pricing-rule" style={{ background: plan.accent }} />
                <ul className="lp-pricing-list">
                  {plan.features.map(f => (
                    <li key={f} className="lp-pricing-item">
                      <span style={{ color: plan.accent, fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className="lp-pricing-cta"
                  style={plan.highlight
                    ? { background: `linear-gradient(135deg, #f7b731, ${plan.accent}, #d97706)`, color: '#0d0d0d', boxShadow: `0 2px 16px rgba(245,158,11,0.35)` }
                    : { border: `1px solid ${plan.accent}33`, color: plan.accent }
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <img src="/logo-dark.svg" alt="ITS VAULTED" className="lp-footer-logo" />
          <p className="lp-footer-note">Built for resellers. © 2026 ITS VAULTED.</p>
          <div className="lp-footer-links">
            <Link to="/privacy" className="lp-footer-link">Privacy Policy</Link>
            <span className="lp-footer-sep">·</span>
            <Link to="/terms" className="lp-footer-link">Terms of Service</Link>
            <span className="lp-footer-sep">·</span>
            <a href="mailto:hello@its-vaulted.com" className="lp-footer-link">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
