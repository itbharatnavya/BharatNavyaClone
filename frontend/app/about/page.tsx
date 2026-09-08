import Link from "next/link";

const principles = [
  {
    title: "Evidence before action",
    body: "Company identity, work evidence, role terms and visible next steps should appear before someone is asked to contact or apply.",
  },
  {
    title: "One connected company identity",
    body: "Directory and Recruitment stay distinct, while the company behind the service or role remains recognisable across both journeys.",
  },
  {
    title: "Context that stays visible",
    body: "Freshness, workplace, salary and decision details remain attached to the record instead of disappearing between search and action.",
  },
];

export default function AboutPage() {
  return (
    <div className="counter-public-page counter-about">
      <section className="counter-support-hero is-green">
        <div className="counter-support-shell counter-about-hero-grid">
          <div>
            <h1>Bharat Navya makes company and work decisions easier to inspect.</h1>
            <p>
              Explore credible companies, useful services and transparent roles across India with the context needed to choose a sensible next step.
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
            <h2 id="about-principles-title">What the platform protects.</h2>
            <p>Three principles keep discovery useful without turning Bharat Navya into another thin listing catalogue.</p>
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
            <h2>Start with the decision in front of you.</h2>
            <p>Find a company for the work ahead, or inspect roles with their hiring context intact.</p>
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
