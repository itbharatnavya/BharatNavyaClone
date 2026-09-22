import Link from "next/link";

const principles = [
  {
    title: "Discover the businesses behind the market",
    body: "Explore companies across industries, understand what they offer, and find the products, services, and capabilities that match your search.",
  },
  {
    title: "Give businesses a stronger presence",
    body: "Create a meaningful company presence with space to showcase offerings, capabilities, and business identity to a wider B2B audience.",
  },
  {
    title: "Keep business and talent connected",
    body: "Move between business discovery and recruitment without losing sight of the company behind the opportunity.",
  },
];

export default function AboutPage() {
  return (
    <div className="counter-public-page counter-about">
      <section className="counter-support-hero is-green">
        <div className="counter-support-shell counter-about-hero-grid">
          <div>
            <h1>Building a better way to navigate the business market.</h1>
            <p>
              Bharat Navya brings businesses, products, services, roles, and opportunities into one connected B2B platform—making it easier to discover what exists, understand what matters, and choose the right next step.
            </p>
          </div>
          <nav className="counter-route-board" aria-label="Explore Bharat Navya">
            <Link className="is-directory" href="/directory">
              <span>Directory</span>
              <strong>Companies, capabilities and work evidence</strong>
              <b aria-hidden>→</b>
            </Link>
            <Link className="is-recruitment" href="/recruitment">
              <span>Recruitment</span>
              <strong>Roles, workplaces and hiring context</strong>
              <b aria-hidden>→</b>
            </Link>
          </nav>
        </div>
      </section>

      <section className="counter-support-section" aria-labelledby="about-principles-title">
        <div className="counter-support-shell">
          <header className="counter-support-heading">
            <h2 id="about-principles-title">Designed for a more connected business platform.</h2>
            <p>Discover what’s available. Understand who’s behind it. Find what fits. Take the next step.</p>
          </header>
          <div className="counter-principles">
            {principles.map((principle) => (
              <article key={principle.title}>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="counter-about-close">
        <div className="counter-support-shell">
          <div>
            <h2>Explore what comes next.</h2>
            <p>Whether you need a business, product, service, or professional opportunity, Bharat Navya gives you clear ways to continue.</p>
          </div>
          <div className="counter-support-actions">
            <Link href="/directory">Explore Directory <span aria-hidden>→</span></Link>
            <Link href="/recruitment">Explore Recruitment <span aria-hidden>→</span></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
