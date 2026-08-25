import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SvgIcon from '../components/Icon'

/* ── Stroke SVG icons ─────────────────────────────────────────────── */
const Icon = ({ children }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const FEATURES = [
  {
    icon: <Icon><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></Icon>,
    title: 'Stock tracking',
    desc: 'Track every item you own — sneakers, Pokémon cards, Lego, clothing and more. Add in seconds, find anything instantly.',
  },
  {
    icon: <Icon><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Icon>,
    title: 'P&L at a glance',
    desc: 'See exactly what you paid, what you sold for, and what you made. Per item, per month, all time — always accurate.',
  },
  {
    icon: <Icon><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></Icon>,
    title: 'Powerful analytics',
    desc: 'Best brands, sell-through rates, ROI charts, monthly trends. Know your business inside out.',
  },
  {
    icon: <Icon><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></Icon>,
    title: 'Break management',
    desc: 'Run live breaks, track spots by buyer, manage payouts. Per-spot P&L built in.',
  },
  {
    icon: <Icon><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Icon>,
    title: 'Composite rankings',
    desc: 'Best & worst performers scored by profit, ROI, and sale speed. Stop guessing what to buy next.',
  },
  {
    icon: <Icon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></Icon>,
    title: 'Completely private',
    desc: 'Every account is fully isolated. Your stock and your numbers are only ever visible to you.',
  },
]

const HOW_STEPS = [
  {
    num: '01',
    title: 'Add your inventory',
    desc: 'Log any item in seconds — purchase price, condition, size, notes. Works for any category.',
    color: '#f59e0b',
  },
  {
    num: '02',
    title: 'Mark it sold',
    desc: 'Record sale price, platform fees and shipping. P&L updates the moment you save.',
    color: '#818cf8',
  },
  {
    num: '03',
    title: 'Own your numbers',
    desc: 'Revenue, profit, ROI, best performers. Every metric you need, always accurate, always private.',
    color: '#34d399',
  },
]

const CONNECTOR_GRADIENTS = [
  'linear-gradient(90deg, #f59e0b, #818cf8)',
  'linear-gradient(90deg, #818cf8, #34d399)',
]

const FAQS = [
  {
    q: 'Do you take a cut of my sales?',
    a: 'No. ITS VAULTED is a flat monthly subscription — never a percentage of what you sell. What you make is 100% yours.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'Your data is always exportable to CSV, any time, on any plan. If you cancel, you keep read access to your history — we never hold your inventory hostage.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes — upgrade or downgrade whenever you like from your account settings. Changes apply on your next billing cycle.',
  },
  {
    q: 'Is my data private?',
    a: 'Completely. Every account is fully isolated at the database level — nobody else can see your stock, prices, or numbers. Not other users, not us.',
  },
  {
    q: 'Does it work for things other than sneakers?',
    a: 'Yes — sneakers, Pokémon and trading cards, Lego, clothing, Topps, and a general "collector" catch-all category. If you resell it, you can track it.',
  },
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
  const [openFaq, setOpenFaq] = useState(0)

  // Scroll reveal — fires once per element when it enters the viewport
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('lp-visible'); obs.unobserve(e.target) }
      }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // Scroll-tracking beacon
  const [scrollPct, setScrollPct] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      const max = scrollHeight - clientHeight
      setScrollPct(max > 0 ? Math.min(scrollTop / max, 1) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="lp">

      {/* ── Continuous background lines ───────────────────── */}
      <div className="lp-bg-lines" aria-hidden="true">
        <div className="lp-bg-line lp-bg-line-l" />
        <div className="lp-bg-line lp-bg-line-r" />
      </div>

      {/* ── Scroll-tracking beacon ────────────────────────── */}
      <div
        className="lp-beacon"
        aria-hidden="true"
        style={{ top: `calc(${scrollPct * 88}vh + 32px)` }}
      >
        <div className="lp-beacon-core" />
        <div className="lp-beacon-ring" />
        <div className="lp-beacon-ring lp-beacon-ring-2" />
        {/* Trailing line above the dot */}
        <div className="lp-beacon-trail" style={{ height: `calc(${scrollPct * 88}vh)` }} />
      </div>

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

        <div className="lp-hero-grid">
          <div className="lp-hero-content">
            <div className="lp-badge lp-reveal"><SvgIcon name="sparkle" size={14} style={{marginRight:6,verticalAlign:'-2px'}} />Built for resellers &amp; collectors</div>

            <h1 className="lp-hero-title lp-reveal">
              Track your stock.<br />
              <span className="lp-gold-text">Know your profit.</span>
            </h1>

            <p className="lp-hero-sub lp-reveal">
              ITS VAULTED is the cleanest way to manage your reselling business. Add items, mark them sold, and watch your P&amp;L update in real time — down to the penny.
            </p>

            <div className="lp-hero-ctas lp-reveal">
              <Link to="/login" className="lp-btn-gold lp-btn-lg">Get started free →</Link>
              <a href="#features" className="lp-btn-ghost lp-btn-lg">See how it works</a>
            </div>

            <p className="lp-hero-note lp-reveal">No credit card required · Free plan available · 60-second setup</p>
          </div>

          {/* Floating product mockup */}
          <div className="lp-mockup-wrap lp-reveal">
            <div className="lp-mockup">
              <div className="lp-mockup-bar">
                <span className="lp-mockup-dot" style={{ background: '#f7768e' }} />
                <span className="lp-mockup-dot" style={{ background: '#e0af68' }} />
                <span className="lp-mockup-dot" style={{ background: '#9ece6a' }} />
                <span className="lp-mockup-title">Dashboard</span>
              </div>
              <div className="lp-mockup-body">
                <div className="lp-mockup-stats">
                  <div className="lp-mockup-stat">
                    <span className="lp-mockup-stat-label">Net P&amp;L</span>
                    <span className="lp-mockup-stat-value lp-mockup-up">+£4,218</span>
                  </div>
                  <div className="lp-mockup-stat">
                    <span className="lp-mockup-stat-label">In stock</span>
                    <span className="lp-mockup-stat-value">86</span>
                  </div>
                  <div className="lp-mockup-stat">
                    <span className="lp-mockup-stat-label">ROI</span>
                    <span className="lp-mockup-stat-value lp-mockup-up">62%</span>
                  </div>
                </div>
                <div className="lp-mockup-rows">
                  {[
                    { name: 'Nike Dunk Low', sub: 'Panda · UK9', profit: '+£38.20', color: '#f59e0b' },
                    { name: 'Charizard VMAX', sub: 'PSA 10', profit: '+£112.00', color: '#818cf8' },
                    { name: 'Air Max 95', sub: 'Neon · UK8', profit: '+£24.75', color: '#34d399' },
                  ].map(row => (
                    <div className="lp-mockup-row" key={row.name}>
                      <span className="lp-mockup-row-swatch" style={{ background: row.color }} />
                      <div className="lp-mockup-row-info">
                        <span className="lp-mockup-row-name">{row.name}</span>
                        <span className="lp-mockup-row-sub">{row.sub}</span>
                      </div>
                      <span className="lp-mockup-row-profit">{row.profit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Floating notification chip */}
            <div className="lp-mockup-toast">
              <span className="lp-mockup-toast-dot" />
              Item sold — P&amp;L updated
            </div>
          </div>
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

      {/* ── Trust strip ───────────────────────────────────── */}
      <section className="lp-trust">
        <div className="lp-container lp-trust-inner">
          {[
            { icon: 'lock', text: 'Encrypted data, per-account isolation' },
            { icon: 'flag', text: 'Built in the UK for UK resellers' },
            { icon: 'zap', text: 'Real-time sync, no refresh needed' },
            { icon: 'ban', text: 'We never sell your data' },
          ].map(t => (
            <div className="lp-trust-item lp-reveal" key={t.text}>
              <span className="lp-trust-icon"><SvgIcon name={t.icon} size={22} /></span>
              <span>{t.text}</span>
            </div>
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
                <div className="lp-feature-icon">{f.icon}</div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section className="lp-how">
        <div className="lp-container">
          <div className="lp-eyebrow lp-reveal lp-center">How it works</div>
          <h2 className="lp-section-title lp-reveal lp-center">
            Simple by design.<br /><span className="lp-gold-text">Powerful by default.</span>
          </h2>

          <div className="lp-how-row">
            {HOW_STEPS.map((step, i) => (
              <React.Fragment key={step.num}>
                <div
                  className="lp-how-step lp-reveal"
                  style={{ transitionDelay: `${i * 0.13}s` }}
                >
                  <div
                    className="lp-how-node"
                    style={{
                      background: `${step.color}14`,
                      border: `1px solid ${step.color}35`,
                      color: step.color,
                      boxShadow: `0 0 20px ${step.color}22`,
                    }}
                  >
                    {step.num}
                  </div>
                  <div className="lp-how-title">{step.title}</div>
                  <div className="lp-how-desc">{step.desc}</div>
                </div>

                {i < 2 && (
                  <div
                    className="lp-how-connector lp-reveal"
                    aria-hidden="true"
                    style={{ transitionDelay: `${i * 0.13 + 0.07}s` }}
                  >
                    {/* static track */}
                    <div className="lp-how-track" />
                    {/* animated pulse bead */}
                    <div
                      className="lp-how-pulse"
                      style={{ background: CONNECTOR_GRADIENTS[i], animationDelay: `${i * 0.9}s` }}
                    />
                  </div>
                )}
              </React.Fragment>
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
            <div className="lp-shop-pill">Pro members save on every order</div>
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
                      <span style={{ color: plan.accent, fontWeight: 700, flexShrink: 0, display: 'inline-flex' }}><SvgIcon name="check" size={16} strokeWidth={2.5} /></span>
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

      {/* ── Founder note ──────────────────────────────────── */}
      <section className="lp-section lp-founder-wrap">
        <div className="lp-container">
          <div className="lp-founder-card lp-reveal">
            <div className="lp-founder-mark">“</div>
            <p className="lp-founder-quote">
              I built ITS VAULTED because every spreadsheet I tried broke the moment my stock crossed a few hundred items. I wanted something that felt as fast as adding a note, but told me exactly what I was actually making — no formulas to maintain, no fees taken from my sales.
            </p>
            <div className="lp-founder-sig">— Built &amp; maintained independently</div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="lp-section" id="faq">
        <div className="lp-container">
          <div className="lp-eyebrow lp-reveal lp-center">FAQ</div>
          <h2 className="lp-section-title lp-reveal lp-center">Questions, answered</h2>
          <p className="lp-section-sub lp-reveal lp-center">Still unsure? Here's what people usually ask before signing up.</p>

          <div className="lp-faq-list">
            {FAQS.map((f, i) => {
              const open = openFaq === i
              return (
                <div key={f.q} className={`lp-faq-item lp-reveal${open ? ' lp-faq-open' : ''}`} style={{ transitionDelay: `${i * 0.05}s` }}>
                  <button className="lp-faq-q" onClick={() => setOpenFaq(open ? -1 : i)} aria-expanded={open}>
                    <span>{f.q}</span>
                    <span className="lp-faq-toggle">{open ? '−' : '+'}</span>
                  </button>
                  <div className="lp-faq-a-wrap" style={{ maxHeight: open ? 200 : 0 }}>
                    <p className="lp-faq-a">{f.a}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA banner ─────────────────────────────── */}
      <section className="lp-final-cta-wrap">
        <div className="lp-container">
          <div className="lp-final-cta lp-reveal">
            <div className="lp-final-cta-glow" />
            <h2 className="lp-final-cta-title">Ready to know your numbers?</h2>
            <p className="lp-final-cta-sub">Set up your first item in under a minute. No card required.</p>
            <Link to="/login" className="lp-btn-gold lp-btn-lg">Get started free →</Link>
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
