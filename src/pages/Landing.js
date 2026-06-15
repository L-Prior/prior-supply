import React from 'react'
import { Link } from 'react-router-dom'

const features = [
  { icon: '📦', title: 'Stock tracking', desc: 'Track every item you own — sneakers, Pokémon cards, Lego, clothing and more. Add in seconds, find instantly.' },
  { icon: '💰', title: 'P&L at a glance', desc: 'See exactly what you paid, what you sold for, and what you made. Per item, per month, all time.' },
  { icon: '📊', title: 'Powerful metrics', desc: 'Charts and insights that show your best brands, sell-through rates, and monthly profit trends.' },
  { icon: '🗂️', title: 'Batch management', desc: 'Bought 5 pairs of the same shoe? Add them in one go, sell them individually, track every unit.' },
  { icon: '🔒', title: 'Your data, private', desc: 'Every account is completely isolated. No one else can see your stock or your numbers.' },
  { icon: '⚡', title: 'Built for resellers', desc: 'Category-specific forms mean you only fill in what matters for each type of item.' },
]

const plans = [
  {
    name: 'Collector',
    price: 'Free',
    desc: 'For those who collect for the love of it',
    features: [
      'Catalogue your collection (up to 30 items)',
      'Sneakers, Pokémon, Lego & more',
      'Notes and condition tracking',
      'No credit card required',
    ],
    cta: 'Get started free',
    href: '/login',
    highlight: false,
  },
  {
    name: 'Reseller',
    price: '£9.99',
    period: '/mo',
    desc: 'For those turning passion into profit',
    features: [
      'Everything in Collector',
      'Full P&L tracking',
      'Revenue and cost analytics',
      'Metrics dashboard with charts',
      'Batch unit management',
      'Sell-through rate tracking',
    ],
    cta: 'Start free trial',
    href: '/login',
    highlight: true,
  },
]

export default function Landing({ session }) {
  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <span className="brand-mark" />
            StockTrack
          </div>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#shop" className="landing-nav-link">Shop</a>
            <a href="#pricing" className="landing-nav-link">Pricing</a>
            {session
              ? <Link to="/dashboard" className="btn primary sm">Dashboard</Link>
              : <>
                  <Link to="/login" className="landing-nav-link">Sign in</Link>
                  <Link to="/login" className="btn primary sm">Get started</Link>
                </>
            }
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-container">
          <div className="hero-badge">Built for resellers & collectors</div>
          <h1 className="hero-title">
            Track your stock.<br />
            Know your profit.
          </h1>
          <p className="hero-sub">
            StockTrack is the simplest way to manage your reselling business. Add items, mark them sold, and watch your P&L update in real time.
          </p>
          <div className="hero-ctas">
            <Link to="/login" className="btn primary hero-cta">Get started free</Link>
            <a href="#features" className="btn hero-cta">See how it works</a>
          </div>
          <div className="hero-note">No credit card required · Free plan available</div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-section" id="features">
        <div className="landing-container">
          <div className="section-label">Features</div>
          <h2 className="section-title">Everything you need to run your reselling business</h2>
          <p className="section-sub">Whether you flip sneakers, sell Pokémon cards, or trade anything in between — StockTrack keeps you on top of it all.</p>
          <div className="features-grid">
            {features.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop */}
      <section className="landing-section" id="shop">
        <div className="landing-container">
          <div className="section-label">Shop</div>
          <h2 className="section-title">Sneaker care, sorted</h2>
          <p className="section-sub">Everything you need to keep your collection fresh. Pro members get an exclusive discount on every order.</p>
          <div className="shop-coming-soon">
            <div className="shop-coming-soon-icon">🛍️</div>
            <div className="shop-coming-soon-title">Coming soon</div>
            <p className="shop-coming-soon-desc">Crease protectors, shoe trees, laces, storage boxes and more — all in one place. Pro members save on every order.</p>
            <div className="hero-note" style={{marginTop:16}}>🔒 Pro members get exclusive discounts</div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="landing-section landing-section-alt" id="pricing">
        <div className="landing-container">
          <div className="section-label">Pricing</div>
          <h2 className="section-title">Simple, transparent pricing</h2>
          <p className="section-sub">Start free as a collector. Upgrade when you're ready to track profit.</p>
          <div className="pricing-grid">
            {plans.map(plan => (
              <div key={plan.name} className={`pricing-card ${plan.highlight ? 'highlight' : ''}`}>
                {plan.highlight && <div className="pricing-badge">Most popular</div>}
                <div className="pricing-name">{plan.name}</div>
                <div className="pricing-price">
                  {plan.price}
                  {plan.period && <span className="pricing-period">{plan.period}</span>}
                </div>
                <div className="pricing-desc">{plan.desc}</div>
                <ul className="pricing-features">
                  {plan.features.map(f => (
                    <li key={f} className="pricing-feature">
                      <span className="pricing-check">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={plan.href} className={`btn ${plan.highlight ? 'primary' : ''} pricing-cta`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-brand" style={{justifyContent:'center'}}>
            <span className="brand-mark" style={{width:20,height:20}} />
            StockTrack
          </div>
          <div className="footer-note">Built for resellers. © 2026 StockTrack.</div>
          <div className="footer-links">
            <Link to="/privacy" className="footer-link">Privacy Policy</Link>
            <span className="footer-sep">·</span>
            <Link to="/terms" className="footer-link">Terms of Service</Link>
            <span className="footer-sep">·</span>
            <a href="mailto:hello@stocktrack.app" className="footer-link">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}