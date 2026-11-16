import Link from "next/link";
import { Wordmark } from "../components/Mark";

const tiles = [
  { glyph: "⚡", title: "Automate Work", text: "Get things done while you run your business." },
  { glyph: "🔗", title: "Connect Your Tools", text: "Add the apps you already use, in plain English." },
  { glyph: "👥", title: "Run with Operatives", text: "Give specialized agents whole missions." },
  { glyph: "✎", title: "Talk, Don't Type", text: "Tell SAM what needs doing, in your own words." },
  { glyph: "✓", title: "Built for Real People", text: "Powerful AI, without the tech headaches." },
];

export default function MarketingPage() {
  return (
    <div className="mkt" data-theme="headquarters">
      <div className="wrap">
        <nav className="mkt-nav">
          <Wordmark size={44} />
          <div className="links">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#owners">For Business Owners</a>
            <a href="#pricing">Pricing</a>
            <Link href="/login" className="btn ghost" style={{ color: "#FFF3D6", borderColor: "#C9973F", minHeight: 44 }}>Log In</Link>
            <Link href="/signup" className="btn" style={{ minHeight: 44 }}>Get Started</Link>
          </div>
        </nav>

        <section className="hero">
          <div>
            <div className="display" style={{ fontSize: 92, lineHeight: 0.95, color: "#FFF3D6" }}>SAM</div>
            <h1 style={{ fontSize: 34, color: "#FFF3D6", marginTop: 6 }}>The AI Assistant for the Rest of Us.</h1>
            <p className="sub">Real AI power for real business owners. Automate work, connect your tools, run missions, and get things done, without reading docs.</p>
            <p style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
              <Link href="/signup" className="btn">Get Started Free →</Link>
              <Link href="/login" className="btn ghost" style={{ color: "#FFF3D6", borderColor: "#C9973F" }}>Log In</Link>
            </p>
            <p className="small" style={{ color: "#D9C39A" }}>Free to start with your own AI key. No card to sign up.</p>
          </div>
          <div className="hero-art">
            <img src="/hero.jpg" alt="SAM headquarters: a 1967 mission control room, imagined the way 1967 thought the future would look" />
          </div>
        </section>
      </div>

      <div className="wrap">
        <section className="tiles" id="features" aria-label="What SAM does">
          {tiles.map((t) => (
            <div className="tile" key={t.title}>
              <div className="glyph" aria-hidden="true">{t.glyph}</div>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
            </div>
          ))}
        </section>

        <section className="section" id="how">
          <div className="eyebrow">How It Works</div>
          <h2 className="display" style={{ fontSize: 36 }}>Three steps. No manual.</h2>
          <div className="moods" style={{ marginTop: 20 }}>
            <div className="card" style={{ background: "#3A1E0C", borderColor: "#6B4423" }}>
              <div className="eyebrow">Step 1</div>
              <h3 style={{ color: "#FFF3D6" }}>Get your sign-in link</h3>
              <p style={{ color: "#D9C39A" }}>Type your email. SAM sends you a link. Click it and you are in. No password to invent, none to forget.</p>
            </div>
            <div className="card" style={{ background: "#3A1E0C", borderColor: "#6B4423" }}>
              <div className="eyebrow">Step 2</div>
              <h3 style={{ color: "#FFF3D6" }}>Connect your key</h3>
              <p style={{ color: "#D9C39A" }}>SAM runs on an AI key, like a car runs on its own key. Paste yours in and SAM can think. SAM walks you through it, in plain words.</p>
            </div>
            <div className="card" style={{ background: "#3A1E0C", borderColor: "#6B4423" }}>
              <div className="eyebrow">Step 3</div>
              <h3 style={{ color: "#FFF3D6" }}>Tell SAM the mission</h3>
              <p style={{ color: "#D9C39A" }}>Say what needs doing the way you would say it to a person. SAM gets to work, and asks your approval before anything big happens.</p>
            </div>
          </div>
        </section>

        <section className="section" id="owners" style={{ paddingTop: 0 }}>
          <div className="eyebrow">For Business Owners</div>
          <h2 className="display" style={{ fontSize: 36 }}>You know you need AI. You refuse to become a programmer.</h2>
          <p className="lead" style={{ color: "#E8D5AE" }}>Good. SAM was built for exactly that. Big obvious buttons. Plain words everywhere. Your missions, your approvals, your files, all in rooms you can find again. And when SAM wants to do something that matters, it asks first, in a card that says exactly what will happen.</p>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div style={{ background: "#FFF3D6", borderRadius: 22, padding: "34px 30px", color: "#1D0F06" }}>
            <h2 className="display" style={{ fontSize: 36, textAlign: "center", marginBottom: 4 }}>One Machine. Three Moods.</h2>
            <p style={{ textAlign: "center", marginTop: 0 }}>The same powerful SAM, in the atmosphere you are feeling today. It starts serious, in Command. The groovy rooms are yours to switch on.</p>
            <div className="moods" style={{ marginTop: 22 }}>
              <div className="mood">
                <img src="/hero.jpg" alt="Headquarters: the classic command center" />
                <div className="body"><h3 style={{ color: "#FFF3D6" }}>Headquarters</h3><p style={{ color: "#D9C39A", margin: 0 }}>The classic command center.</p></div>
              </div>
              <div className="mood">
                <img src="/disco.jpg" alt="Discothèque: headquarters after dark" />
                <div className="body"><h3 style={{ color: "#FFF3D6" }}>Discothèque</h3><p style={{ color: "#D9C39A", margin: 0 }}>After-hours energy, same mission.</p></div>
              </div>
              <div className="mood">
                <img src="/swirl.jpg" alt="Swirl Light: the psychedelic pinwheel" />
                <div className="body"><h3 style={{ color: "#FFF3D6" }}>Swirl Light</h3><p style={{ color: "#D9C39A", margin: 0 }}>Bright, clean, and far out.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="pricing" style={{ paddingTop: 0 }}>
          <div className="eyebrow">Pricing</div>
          <h2 className="display" style={{ fontSize: 36 }}>Two ways to power SAM.</h2>
          <div className="paths" style={{ marginTop: 20 }}>
            <div className="path">
              <span className="tag">Open today</span>
              <h3>Bring your own key</h3>
              <p>Connect a key from your own AI account. SAM thinks on your key, and you pay that provider directly for what you use. Your key stays yours: SAM keeps it in a locked vault, never shows it back, and spends it only on your missions.</p>
              <p><Link href="/signup" className="btn">Get Started Free</Link></p>
              <p className="small">Free to start on this path: sign up costs nothing, and your key provider bills only for the thinking SAM actually does.</p>
            </div>
            <div className="path">
              <span className="tag">Not open yet</span>
              <h3>Run it on ours</h3>
              <p>No key hunting at all: SAM runs on our key, with a fair daily limit so nobody can drain it. This door opens once the pricing is set. Until then, the own-key path above is the way in, and SAM walks you through it.</p>
              <p className="small">When this opens, the price will be posted here, in plain sight, before anyone is charged anything.</p>
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="advanced">
            <div className="eyebrow" style={{ color: "#F07F3C" }}>For Developers</div>
            <h2 className="display" style={{ fontSize: 30 }}>The serious engine is right here.</h2>
            <p style={{ color: "#A9EDB8" }}>The friendly face is not a toy version. Underneath sits the full SAM engine: a complete command line, your own API tokens, and a real activity log. Install the CLI and drive the same SAM from your terminal:</p>
            <p className="cmd mono">git clone https://github.com/ReactionLabs/sam.git &amp;&amp; cd sam &amp;&amp; ./scripts/install.sh</p>
            <p style={{ color: "#A9EDB8" }}>Mint an API token in Settings and script your own account: chats, missions, approvals, all plain JSON. Your Intel feed is SAM's own activity ledger, written as it works, the same record the CLI shows locally.</p>
          </div>
        </section>

        <footer>
          <div className="swirl-band" style={{ marginBottom: 34 }} />
          <div className="display" style={{ fontSize: 30, color: "#FFF3D6" }}>Old School Cool. New School Intelligence.</div>
          <p style={{ color: "#D9C39A" }}>SAM, Secret Agent Man. The AI assistant for the rest of us.</p>
          <p><Link href="/signup" className="btn">Get Started Free →</Link></p>
        </footer>
      </div>
    </div>
  );
}
