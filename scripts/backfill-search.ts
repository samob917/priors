import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Pre-generated rich search metadata for each prior
const SEARCH_DATA: Record<string, string> = {
  "postgresql-is-the-best-default-database-choice":
    "postgresql postgres db database sql relational rdbms which database should I use best database for web apps default database choice data storage persistent data mysql vs postgres mongo vs postgres sqlite vs postgres nosql vs sql database comparison database recommendation backend database server database cloud database managed database supabase neon planetscale cockroachdb aurora rds data layer orm prisma drizzle sequelize knex query performance scalability reliability json jsonb full-text search acid transactions",

  "nextjs-is-the-best-full-stack-framework-for-new-web-apps":
    "nextjs next.js react framework fullstack full-stack web app best framework for new project which framework should I use frontend backend ssr server-side rendering static site generation app router pages router vercel deployment remix vs next nuxt vs next sveltekit vs next astro vs next web development javascript typescript react framework comparison single page app spa server components rsc meta-framework tech stack saas starter",

  "typescript-is-worth-the-overhead-for-most-projects":
    "typescript ts javascript js type safety typed language static types should I use typescript is typescript worth it typescript vs javascript type checking compile time errors developer experience dx tooling autocomplete intellisense refactoring maintainability code quality large codebase team collaboration type annotations interfaces generics type inference build step compilation overhead tsconfig strict mode any type productivity",

  "us-enters-recession-by-end-of-2027":
    "recession economy economic downturn gdp gross domestic product negative growth united states us america will there be a recession economic forecast inflation interest rates federal reserve fed monetary policy unemployment jobs market consumer spending fiscal policy economic indicators yield curve inverted bear market stock market crash financial crisis 2027 economic outlook wall street main street stagflation soft landing hard landing",

  "remote-work-improves-developer-productivity":
    "remote work wfh work from home distributed team hybrid office return to office rto productivity developer software engineer is remote work better remote vs office work from home productivity telecommute flexible work async asynchronous communication focus time deep work commute collaboration culture hiring talent retention employee satisfaction burnout work life balance home office coworking",

  "llms-will-replace-most-junior-dev-tasks-by-2028":
    "llm large language model ai artificial intelligence gpt claude copilot cursor coding assistant will ai replace programmers junior developer entry level software engineer automation code generation ai coding pair programming machine learning ml natural language processing nlp chatbot agent autonomous coding ai software development future of programming developer jobs career impact vibe coding devin",

  "react-remains-the-dominant-frontend-framework-through-2028":
    "react reactjs frontend front-end ui user interface component library will react stay popular react vs vue react vs angular react vs svelte react vs solid jsx hooks state management redux zustand context api virtual dom server components react 19 meta facebook web development framework comparison npm downloads job market ecosystem community adoption next.js remix gatsby",

  "bitcoin-exceeds-dollar200k-by-end-of-2026":
    "bitcoin btc crypto cryptocurrency price prediction will bitcoin go up bitcoin price forecast digital currency blockchain ethereum eth altcoin crypto market bull run bear market halving mining hash rate institutional adoption etf spot bitcoin etf store of value digital gold inflation hedge decentralized finance defi web3 satoshi 200k 200000 price target moon",
};

async function main() {
  const priors = await prisma.prior.findMany({
    where: { searchText: "" },
  });

  console.log(`Backfilling searchText for ${priors.length} priors...`);

  for (const prior of priors) {
    const enrichment = SEARCH_DATA[prior.slug];
    const searchText = enrichment
      ? `${prior.claim} ${prior.description ?? ""} ${prior.category} ${enrichment}`.toLowerCase()
      : `${prior.claim} ${prior.description ?? ""} ${prior.category}`.toLowerCase();

    await prisma.prior.update({
      where: { id: prior.id },
      data: { searchText },
    });

    console.log(`  ✓ ${prior.claim.slice(0, 60)}`);
  }

  console.log("Done!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
