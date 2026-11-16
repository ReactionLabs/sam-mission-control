import Link from "next/link";
import "./groovy.css";
import { Wordmark } from "../components/Mark";
import GroovyFX from "../components/GroovyFX";
import HeroSection from "../components/HeroSection";
import MarketingNav from "../components/MarketingNav";
import MissionDemo from "../components/MissionDemo";
import ThemePreview from "../components/ThemePreview";

// Operation Groovy: the marketing page as the movie trailer.
// The psychedelic environment (GroovyFX) lives behind solid,
// readable surfaces. Auth, signup, and the app are untouched.

function Icon({ d, fill }) {
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"}
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const FEATURES = [
  {
    title: "Automate Work",
    text: "Get routine tasks moving while you run your business.",
    icon: <Icon fill d="M13 2 4.5 13.5H11L9.8 22 19 9.8h-6.5L13 2z" />,
  },
  {
    title: "Connect Your Tools",
    text: "Bring the applications you already use into one place.",
    icon: <Icon d="M10 14a5 5 0 0 0 7.1 0l2.4-2.4a5 5 0 0 0-7.1-7.1L11 5.9M14 10a5 5 0 0 0-7.1 0L4.5 12.4a5 5 0 0 0 7.1 7.1L13 18.1" />,
  },
  {
    title: "Run Missions",
    text: "Give SAM a goal and follow its progress.",
    icon: <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z M12 12.6a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8z" />,
  },
  {
    title: "Stay in Control",
    text: "Review important actions before they happen.",
    icon: <Icon d="M12 3l7 2.6V11c0 4.6-3 7.7-7 9.5C9 18.7 5 15.6 5 11V5.6L12 3z M9 11.6l2.2 2.2L15.4 9.6" />,
  },
  {
    title: "Built for Real People",
    text: "Serious AI capability without the technical headache.",
    icon: <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8.6 10h.01M15.4 10h.01 M8.2 14.2c1 1.3 2.3 2 3.8 2s2.8-.7 3.8-2" />,
  },
];

function GridHorizon() {
  const rays = [0, 150, 300, 450, 540, 600, 660, 750, 900, 1050, 1200];
  return (
    <svg className="g-grid" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {rays.map((x) => (
        <line key={x} x1="600" y1="0" x2={x === 600 ? 600 : x * 1.6 - 360} y2="200" stroke="#33E0FF" strokeWidth="1.6" opacity=".45" />
      ))}
      {[26, 58, 100, 150, 200].map((y, i) => (
        <line key={y} x1="0" y1={y} x2="1200" y2={y} stroke="#33E0FF" strokeWidth="1.6" opacity={.25 + i * .14} />
      ))}
      <line x1="0" y1="2" x2="1200" y2="2" stroke="#FF3EA5" strokeWidth="3" opacity=".8" />
    </svg>
  );
}

function SpyCar() {
  return (
    <svg className="g-car" viewBox="0 0 600 170" aria-hidden="true" focusable="false">
      <path
        d="M18 122 C28 106 72 98 124 93 C172 88 214 58 284 50 C352 43 424 57 474 84 C524 92 566 101 580 113 C589 121 586 133 574 134 L542 134 A27 27 0 0 0 488 134 L182 134 A27 27 0 0 0 128 134 L36 134 C22 134 12 130 18 122 Z"
        fill="#1B0B26" stroke="rgba(255,243,214,.35)" strokeWidth="1.5"
      />
      <path
        d="M238 63 C264 54 302 49 332 51 C362 53 392 62 412 77 C362 70 292 69 238 63 Z"
        fill="#F5E663" opacity=".85"
      />
      <circle cx="155" cy="134" r="25" fill="#0D0714" stroke="#C9973F" strokeWidth="3" />
      <circle cx="155" cy="134" r="9" fill="#C9973F" />
      <circle cx="515" cy="134" r="25" fill="#0D0714" stroke="#C9973F" strokeWidth="3" />
      <circle cx="515" cy="134" r="9" fill="#C9973F" />
      <rect x="566" y="106" width="14" height="6" rx="3" fill="#F5E663" />
    </svg>
  );
}

export default function MarketingPage() {
  return (
    <div className="groovy" data-scene="hero">
      <GroovyFX />
      <div className="groovy-main">
        <MarketingNav />

        <main>
          {/* ---------- Hero: Welcome to Headquarters ---------- */}
          <HeroSection />

          {/* ---------- Interactive mission demo ---------- */}
          <section className="g-section" id="demo" data-scene="demo" style={{ paddingTop: 20 }}>
            <div className="wrap">
              <div className="g-panel" data-reveal>
                <div className="g-eyebrow">See It Work</div>
                <h2 className="g-h2">Give SAM a Mission.</h2>
                <p className="g-lead">
                  Pick a job you would hand a good employee. Then watch how SAM takes it:
                  step by step, with your approval standing between him and anything that matters.
                </p>
                <MissionDemo />
              </div>
            </div>
          </section>

          <div className="groovy-band" aria-hidden="true" />

          {/* ---------- Features ---------- */}
          <section className="g-section" id="features" data-scene="features">
            <div className="wrap">
              <div data-reveal>
                <div className="g-eyebrow">Capabilities</div>
                <h2 className="g-h2">Meet Your New Secret Weapon</h2>
                <p className="g-lead">Five things SAM does well, in plain words.</p>
              </div>
              <div className="g-feats">
                {FEATURES.map((f) => (
                  <article className="g-feat" key={f.title} data-reveal>
                    <span className="g-icon">{f.icon}</span>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ---------- How it works ---------- */}
          <section className="g-section" id="how" data-scene="how" style={{ paddingTop: 10 }}>
            <div className="wrap">
              <div data-reveal>
                <div className="g-eyebrow">How It Works</div>
                <h2 className="g-h2">Three Steps. No Manual.</h2>
              </div>
              <div className="g-steps">
                <svg className="g-signal" viewBox="0 0 1160 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                  <path d="M40 46 C 300 4, 560 58, 800 22 C 950 2, 1060 20, 1130 30" />
                </svg>
                <div className="g-step" data-reveal>
                  <div className="num">01</div>
                  <h3>Enter Headquarters</h3>
                  <p>Create your account with one email link. No password to invent, none to forget.</p>
                </div>
                <div className="g-step" data-reveal>
                  <div className="num">02</div>
                  <h3>Connect Your AI</h3>
                  <p>Bring your own model API key. SAM walks you through it in plain words, and keeps the key in a locked vault, never shown back.</p>
                </div>
                <div className="g-step" data-reveal>
                  <div className="num">03</div>
                  <h3>Give SAM a Mission</h3>
                  <p>Describe what you need in ordinary language. SAM gets to work and reports back as it goes.</p>
                </div>
              </div>
            </div>
          </section>

          <div className="groovy-band" aria-hidden="true" />

          {/* ---------- Business owners ---------- */}
          <section className="g-section" id="owners" data-scene="owners">
            <div className="wrap">
              <div data-reveal>
                <div className="g-eyebrow">For Business Owners</div>
                <h2 className="g-h2">You know you need AI. You refuse to become a programmer.</h2>
                <p className="g-lead">
                  Good. SAM gives you one place for your missions, tools, conversations, and
                  approvals, without a single line of developer vocabulary. Big obvious buttons.
                  Rooms you can find again. And a paper trail for everything, because it is
                  your business on the line.
                </p>
              </div>
              <div className="g-folders">
                <article className="g-folder" data-reveal>
                  <div className="tagline">Example: a print shop</div>
                  <h3>Quotes stop slipping</h3>
                  <p>New inquiries land in one list. SAM drafts the follow-ups, the owner approves them with one tap, and nothing sits in a forgotten inbox.</p>
                </article>
                <article className="g-folder" data-reveal>
                  <div className="tagline">Example: a pool service</div>
                  <h3>The morning sorts itself</h3>
                  <p>Overnight inquiries are sorted before the truck rolls: new customers here, schedule changes there, one approval waiting on the owner.</p>
                </article>
                <article className="g-folder" data-reveal>
                  <div className="tagline">Example: a tree crew</div>
                  <h3>Storm calls, tamed</h3>
                  <p>A weekend of storm calls becomes one tidy mission list on Monday, in the order the owner would have written it.</p>
                </article>
              </div>
            </div>
          </section>

          {/* ---------- One Machine. Three Moods. ---------- */}
          <section className="g-section" id="moods" data-scene="moods" style={{ paddingTop: 10 }}>
            <div className="wrap">
              <div className="g-moods-panel" data-reveal>
                <h2 className="g-h2">One Machine. Three Moods.</h2>
                <p className="g-sub">
                  The same powerful SAM, in the atmosphere you are feeling today. It starts
                  serious, in Command. The groovy rooms are yours to switch on. Try them:
                </p>
                <ThemePreview />
              </div>
            </div>
          </section>

          {/* ---------- Pricing ---------- */}
          <section className="g-section" id="pricing" data-scene="pricing" style={{ paddingTop: 10 }}>
            <div className="wrap">
              <div data-reveal>
                <div className="g-eyebrow">Pricing</div>
                <h2 className="g-h2">Two Ways to Power SAM</h2>
                <p className="g-lead">No invented numbers, no fine print games. Here is exactly how it works today.</p>
              </div>
              <div className="g-paths">
                <div className="g-path" data-reveal>
                  <span className="tag">Open today</span>
                  <h3>Bring Your Own Key</h3>
                  <p>You supply a key from your own AI provider account, and you pay that provider directly for the thinking SAM does. SAM keeps your key in a locked vault, never shows it back, and spends it only on your missions.</p>
                  <p><Link href="/signup" className="btn">Get Started Free</Link></p>
                  <p className="small">Free to start on this path: signing up costs nothing, and your key provider bills only for the thinking SAM actually does.</p>
                </div>
                <div className="g-path g-path--ours" data-reveal>
                  <span className="tag">Not open yet</span>
                  <h3>Run It on Ours</h3>
                  <p>No key hunting at all: SAM runs on our key, with a fair daily limit so nobody can drain it. This path opens once the pricing is set and published here, in plain sight, before anyone is charged anything.</p>
                  <p className="small">Until then, the own-key path is the way in, and SAM walks you through it step by step.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- Developers ---------- */}
          <section className="g-section" data-scene="dev" style={{ paddingTop: 10 }}>
            <div className="wrap">
              <div className="g-crt" data-reveal>
                <div className="g-eyebrow">For Developers</div>
                <h2 className="g-h2">The Serious Engine Is Right Here</h2>
                <p>
                  The friendly face is not a toy version. Underneath sits the full SAM engine:
                  a complete command line, local execution on your own machine, model
                  configuration with your own key, tools with owner approvals, and a real
                  activity history, written as SAM works.
                </p>
                <p className="cmd">git clone https://github.com/ReactionLabs/sam.git &amp;&amp; cd sam &amp;&amp; ./scripts/install.sh<span className="cursor" aria-hidden="true" /></p>
                <ul>
                  <li>Drive the same SAM from your terminal: chats, missions, approvals, all plain JSON.</li>
                  <li>Mint an API token in Settings and script your own account.</li>
                  <li>Every action lands in the activity ledger, the same record the CLI shows locally.</li>
                </ul>
                <p>
                  Source: <a href="https://github.com/ReactionLabs/sam" target="_blank" rel="noreferrer">github.com/ReactionLabs/sam</a>
                </p>
              </div>
            </div>
          </section>

          {/* ---------- Final scene ---------- */}
          <section className="g-section" data-scene="finale" style={{ paddingTop: 10 }}>
            <div className="wrap">
              <div className="g-finale" data-reveal>
                <div className="g-sun" aria-hidden="true" />
                <GridHorizon />
                <SpyCar />
                <h2>Old School Cool.<br />New School Intelligence.</h2>
                <p className="g-sub2">Your mission. His problem.</p>
                <Link href="/signup" className="btn">Get Started Free</Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="g-footer">
          <div className="wrap">
            <div className="swirl-band" style={{ marginBottom: 34 }} />
            <Wordmark size={40} />
            <p style={{ marginTop: 14 }}>SAM, Secret Agent Man. The AI assistant for the rest of us.</p>
            <div className="links">
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <Link href="/login">Log In</Link>
              <Link href="/signup">Get Started</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
