/**
 * seed-blogs-demo.js — more demo articles for /blog, /recruitment/blog and the About page.
 *
 * Adds 10 seller-authored business articles and 2 employer-authored career guides
 * (fixed ids blog_demo01..blog_demo12), and gives the four original seller articles a
 * cover photo from the local /demo set (the About page only shows articles that have one).
 * All content is fictional demo copy.
 *
 * Idempotent: update-if-present, insert-if-absent. Writes go through lib/pg-store, like
 * scripts/seed-recruitment-demo.js.
 *
 * Run:  node scripts/seed-blogs-demo.js
 */

const store = require("../lib/pg-store");

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const daysAgoIso = (days) => new Date(Date.now() - days * 86400000).toISOString();

const post = (n, authorType, sellerId, title, coverImage, tags, daysAgo, sections) => ({
  id: `blog_demo${String(n).padStart(2, "0")}`,
  sellerId,
  authorType,
  title,
  slug: slugify(title),
  coverImage,
  body: sections.map(([heading, text], i) => (i === 0 ? `${text}\n\n` : `## ${heading}\n\n${text}\n\n`)).join("").trim(),
  categoryId: null,
  tags,
  status: "published",
  views: 20 + n * 17,
  publishedAt: daysAgoIso(daysAgo),
});

const BLOGS = [
  post(1, "seller", "usr_s001", "Reading a fabric spec sheet: GSM, weave and finish", "/demo/textile-2.jpg", ["textiles", "buyer-guide"], 4, [
    ["", "A fabric spec sheet looks dense, but five lines decide most of what you will receive. Read them in this order."],
    ["GSM tells you weight, not quality", "Grams per square metre shows how heavy a fabric is. Two fabrics at 180 GSM can feel completely different depending on the yarn and the weave."],
    ["Ask for the weave and the finish", "Plain, twill and satin weaves behave differently in cutting and wear. Finishes such as mercerised or enzyme-washed change the hand feel and shrinkage."],
    ["Request a swatch before a bulk order", "A 30 cm swatch and a wash test report remove most of the surprises. Good suppliers send both without being asked twice."],
  ]),
  post(2, "seller", "usr_s009", "Five questions to ask before buying an industrial machine", "/demo/machinery-2.jpg", ["machinery", "buyer-guide"], 7, [
    ["", "A machine is a five-to-ten year decision. A short checklist before you pay an advance saves a long argument later."],
    ["What is the real output per shift?", "Rated capacity assumes ideal conditions. Ask for output on your material, at your operating hours."],
    ["Who services it, and how fast?", "Find out where the nearest service engineer is based and what the spare-parts lead time looks like."],
    ["What is included in the price?", "Installation, commissioning, operator training and the first year of consumables are often listed separately."],
    ["Can you speak to a current user?", "A supplier who is confident about the machine will connect you with someone already running it."],
  ]),
  post(3, "seller", "usr_s007", "What to check when sourcing medical consumables", "/demo/medical-2.jpg", ["medical", "compliance"], 9, [
    ["", "Consumables move fast and the paperwork matters as much as the product. Start with the documents."],
    ["Licences and batch records", "Ask for the manufacturing licence, batch number, expiry and storage conditions on every consignment."],
    ["Packaging integrity", "Sterile products need intact seals and clear labelling. Inspect a sample from each batch on delivery."],
    ["Reorder planning", "Agree a minimum stock level and a standing reorder quantity so a single delayed truck never stops a clinic."],
  ]),
  post(4, "seller", "usr_s006", "Choosing drip irrigation for small farms", "/demo/agriculture-3.jpg", ["agriculture", "irrigation"], 12, [
    ["", "Drip irrigation can cut water use sharply, but only when the system is matched to the field."],
    ["Start with the crop and the soil", "Row crops, orchards and vegetables need different emitter spacing and flow rates. Sandy soil drains faster than clay and needs shorter, more frequent cycles."],
    ["Filtration is not optional", "Most drip failures are clogging. Match the filter to your water source, whether borewell, canal or pond."],
    ["Plan for service", "Keep spare emitters and a flushing routine. A system that is maintained lasts many seasons longer."],
  ]),
  post(5, "seller", "usr_s004", "Reading a safety data sheet in five minutes", "/demo/chemical-2.jpg", ["chemicals", "safety"], 15, [
    ["", "A safety data sheet has sixteen sections. You do not need to read them all every time, but you should know where to look."],
    ["Sections 2 and 4: hazards and first aid", "These two answer the first questions anyone on the floor will ask in an emergency."],
    ["Sections 7 and 8: handling and protection", "Storage rules, incompatible materials and the protective equipment required."],
    ["Section 14: transport", "Classification and packing group decide how a consignment can legally move."],
  ]),
  post(6, "seller", "usr_s011", "Virgin or recycled polymer: what buyers should know", "/demo/industry-2.jpg", ["polymers", "sustainability"], 18, [
    ["", "Recycled polymer is no longer a compromise grade, but it is not right for every part either."],
    ["Match grade to application", "Food contact and high-tolerance parts usually need virgin material. Crates, pipes and many moulded goods perform well with recycled content."],
    ["Ask about consistency", "Colour and melt-flow variation between batches is the real risk. Request a batch certificate and a trial lot."],
    ["Price versus total cost", "A lower per-kilo price can disappear if rejects rise. Compare on finished parts, not on raw material alone."],
  ]),
  post(7, "seller", "usr_s013", "Right-sizing a pump: flow, head and efficiency", "/demo/machinery-3.jpg", ["pumps", "buyer-guide"], 21, [
    ["", "An oversized pump wastes power and wears out early. Sizing it well takes three numbers."],
    ["Flow and head", "Work out the flow you need and the total head, including pipe friction, not just the lift."],
    ["Read the efficiency curve", "Choose a pump whose best-efficiency point sits near your duty point, not at the edge of its curve."],
    ["Think about the running cost", "Over five years, electricity usually costs far more than the pump itself."],
  ]),
  post(8, "seller", "usr_s012", "How to brief a handloom supplier for export", "/demo/textile-4.jpg", ["handloom", "export"], 25, [
    ["", "Handloom work is made to order, so the brief is the product. A clear one saves weeks."],
    ["Share references, not adjectives", "A photo, a swatch or a colour code says more than the word elegant ever will."],
    ["Agree tolerances early", "Handmade means small variations. Decide what is acceptable in width, colour and pattern before production starts."],
    ["Plan the timeline backwards", "Count from your shipping date, leaving time for finishing, inspection and documentation."],
  ]),
  post(9, "seller", "usr_s008", "Lead times in textiles: where the weeks go", "/demo/textile-5.jpg", ["textiles", "supply-chain"], 29, [
    ["", "Quoted lead times rarely fail in one place. They slip a few days at a time across several steps."],
    ["Yarn and dyeing", "Availability of the right yarn and a dye-house slot are the two biggest swing factors."],
    ["Testing and approval", "Waiting for lab-dip and wash-test approvals can add a week if nobody owns it."],
    ["Ask for milestones", "A supplier who shares dates for each step can warn you early, instead of explaining late."],
  ]),
  post(10, "seller", "usr_s002", "Sustainable packaging without a price shock", "/demo/packaging-3.jpg", ["packaging", "sustainability"], 33, [
    ["", "Moving to greener packaging does not have to double your cost. The savings are often in the design."],
    ["Right-size the box", "Smaller packs use less board, cost less to ship and need less filler."],
    ["Mono-material wins", "Packs made from one material are easier to recycle and often cheaper than laminates."],
    ["Pilot before you switch", "Run a small batch through your own packing line and delivery route before you commit."],
  ]),
  post(11, "employer", "usr_emp1", "How to read a job description like a hiring manager", "/demo/business-4.jpg", ["Job search", "Interview"], 10, [
    ["", "A job description is a wish list written by several people. Knowing how to read it helps you decide whether to apply."],
    ["Separate must-haves from nice-to-haves", "Requirements near the top and ones repeated in the responsibilities are usually the real priorities."],
    ["Read the verbs", "Own, lead and build describe different jobs from support, assist and maintain."],
    ["Apply if you meet most of it", "Few candidates match every line. A clear note on how your experience fits matters more than a perfect checklist."],
  ]),
  post(12, "employer", "usr_emp3", "What to ask in a first interview", "/demo/business-5.jpg", ["Interview", "Career"], 14, [
    ["", "The questions you ask say as much about you as the answers you give. They also help you decide if the role is right."],
    ["Ask what success looks like", "A good answer names outcomes at thirty, sixty and ninety days."],
    ["Ask about the team", "How many people, how long have they worked together and how are decisions made."],
    ["Ask what happens next", "Knowing the process and timeline means you are not left guessing for a fortnight."],
  ]),
];

const COVERS = {
  blog_001: "/demo/packaging-1.jpg",
  blog_002: "/demo/machinery-1.jpg",
  blog_003: "/demo/electronics-2.jpg",
  blog_004: "/demo/construction-2.jpg",
};

(async () => {
  for (const blog of BLOGS) {
    if (await store.getById("blogs.json", blog.id)) {
      const { id, ...patch } = blog;
      await store.update("blogs.json", id, patch);
    } else {
      await store.insert("blogs.json", blog);
    }
  }
  for (const [id, coverImage] of Object.entries(COVERS)) {
    if (await store.getById("blogs.json", id)) await store.update("blogs.json", id, { coverImage });
  }
  console.log(`Seeded ${BLOGS.length} demo blogs and set covers on ${Object.keys(COVERS).length} originals.`);
  process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
