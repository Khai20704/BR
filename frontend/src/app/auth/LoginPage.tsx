import { Navigate } from 'react-router'
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Waves,
  History,
  Sparkles,
  LockKeyhole,
} from 'lucide-react'
import { useAuth } from '@/core/auth/context'
import { firebaseConfigured } from '@/core/firebase/client'
import './login.css'

export function LoginPage() {
  const { user, loading, error, login } = useAuth()
  if (user) return <Navigate to="/" replace />
  return (
    <main className="login-shell">
      <header className="login-header">
        <a className="login-brand" href="/login" aria-label="Br home">
          <span className="login-monogram">
            Br<span>.</span>
          </span>
          <span>
            BREAK THE RULES
            <span className="login-brand-sub">THERMAL INTELLIGENCE</span>
          </span>
        </a>
        <span className="login-header-note">
          <span /> A different kind of energy thinking.
        </span>
      </header>
      <div className="login-layout">
        <section className="login-story" aria-labelledby="login-headline">
          <div className="login-kicker">
            <span /> WASTE HEAT. NEW POSSIBILITIES.
          </div>
          <h1 id="login-headline">
            Good energy.
            <br />
            Better <em>possibilities.</em>
          </h1>
          <p className="login-intro">
            Explore how waste heat can dry spent coffee grounds. Model the
            process, compare your options, and make your next move with clarity.
          </p>
          <div
            className="login-visual"
            role="img"
            aria-label="Illustration of waste heat flowing from an AC source into a drying scenario"
          >
            <div className="login-visual-top">
              <span>
                <Waves size={14} /> HEAT INTO POSSIBILITY
              </span>
              <span>CONCEPT VIEW</span>
            </div>
            <svg viewBox="0 0 640 215" fill="none" aria-hidden="true">
              <defs>
                <linearGradient
                  id="heat-flow"
                  x1="90"
                  y1="100"
                  x2="550"
                  y2="100"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#efaa72" />
                  <stop offset="0.55" stopColor="#b3caa1" />
                  <stop offset="1" stopColor="#59dcb4" />
                </linearGradient>
              </defs>
              {Array.from({ length: 9 }, (_, i) => (
                <path
                  key={i}
                  d={`M 95 ${68 + i * 10} C 240 ${-50 + i * 26}, 360 ${260 - i * 26}, 545 ${68 + i * 10}`}
                  stroke="url(#heat-flow)"
                  strokeWidth={i === 4 ? 2 : 1}
                  opacity={i === 4 ? 0.9 : 0.25 + i * 0.035}
                />
              ))}
              <circle
                cx="95"
                cy="108"
                r="41"
                fill="#1d2424"
                stroke="#ac7953"
                strokeOpacity=".5"
              />
              <circle
                cx="95"
                cy="108"
                r="30"
                stroke="#edac78"
                strokeDasharray="2 5"
              />
              <path
                d="M85 96C100 102 85 112 100 120M95 93C110 100 95 110 110 117"
                stroke="#efb386"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect
                x="509"
                y="72"
                width="72"
                height="72"
                rx="22"
                fill="#152925"
                stroke="#56d9ae"
                strokeOpacity=".5"
              />
              <path
                d="M529 96H561M529 108H561M529 120H561"
                stroke="#75dfbb"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="321" cy="108" r="5" fill="#bddec1" />
              <circle
                cx="321"
                cy="108"
                r="12"
                stroke="#bddec1"
                strokeOpacity=".25"
              />
            </svg>
            <div className="login-visual-labels">
              <span>
                AC waste heat<small>Available source</small>
              </span>
              <span>
                Drying scenario<small>Modelled outcome</small>
              </span>
            </div>
          </div>
          <div className="login-story-bottom">
            <span>01 / UNDERSTAND</span>
            <span>02 / SIMULATE</span>
            <span>03 / ADAPT</span>
          </div>
        </section>
        <section className="login-access" aria-labelledby="login-title">
          <div className="login-card">
            <div className="login-card-icon">
              <ArrowUpRight size={27} strokeWidth={1.5} />
            </div>
            <div className="login-kicker">YOUR NEXT EXPERIMENT STARTS HERE</div>
            <h2 id="login-title">Welcome to Br.</h2>
            <p className="login-card-intro">
              A little curiosity. A new perspective.
              <br />
              Your own space to explore both.
            </p>
            <ul className="login-benefits">
              <li>
                <Waves size={18} />
                <span>Build your thermal scenarios</span>
              </li>
              <li>
                <Sparkles size={18} />
                <span>Explore AI-assisted drying plans</span>
              </li>
              <li>
                <History size={18} />
                <span>Pick up where you left off</span>
              </li>
            </ul>
            {loading ? (
              <div className="login-restoring" role="status">
                <span className="login-spinner" />
                Restoring your session...
              </div>
            ) : (
              <>
                <button
                  className="login-google"
                  disabled={!firebaseConfigured}
                  onClick={() => void login()}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="19"
                    height="19"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
                    />
                  </svg>
                  Continue with Google
                  <ArrowRight size={17} />
                </button>
                <div className="login-fallback">
                  <span>Popup not opening?</span>
                  <button
                    disabled={!firebaseConfigured}
                    onClick={() => void login(true)}
                  >
                    Continue with redirect
                  </button>
                </div>
              </>
            )}
            {!firebaseConfigured && (
              <p className="login-error" role="alert">
                Firebase configuration is missing. Contact the workspace
                administrator.
              </p>
            )}
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}
            <div className="login-private">
              <ShieldCheck size={16} />
              <span>Your workspace is private to your account.</span>
            </div>
          </div>
          <p className="login-access-note">
            <LockKeyhole size={13} /> Google sign-in. No separate password to
            remember.
          </p>
        </section>
      </div>
      <footer className="login-footer">
        <span>RETHINK WHAT HEAT CAN DO.</span>
        <p>
          Model predictions, not measured savings. No hardware control
          connected.
        </p>
        <span>Br / EXPLORE RESPONSIBLY</span>
      </footer>
    </main>
  )
}
