import React from "react";
import { motion } from "framer-motion";
import {
  Search,
  User,
  BookOpen,
  FlaskConical,
  PlayCircle,
  FileText,
  ChevronRight,
  Download,
  Layers3,
  Sparkles,
} from "lucide-react";

type IconComponent = React.ComponentType<{ className?: string }>;

type Feature = {
  title: string;
  description: string;
  icon: IconComponent;
  accent: string;
};

type Resource = {
  title: string;
  type: string;
  tag: string;
  icon: IconComponent;
  accent: string;
};

const features: Feature[] = [
  {
    title: "Curated Notes",
    description: "Clean revision packs, summaries, and guided notes for core chemistry topics.",
    icon: BookOpen,
    accent: "bg-[#FFE081]",
  },
  {
    title: "Interactive Tools",
    description: "Visual pathways, topic maps, and code-based learning tools with clear entry points.",
    icon: Sparkles,
    accent: "bg-[#FFB27D]",
  },
  {
    title: "Practical Skills",
    description: "Experiment technique cards, analysis support, and observation checklists.",
    icon: FlaskConical,
    accent: "bg-[#AEE4B6]",
  },
];

const resources: Resource[] = [
  {
    title: "Reaction Pathway Atlas",
    type: "Interactive",
    tag: "Popular",
    icon: Layers3,
    accent: "bg-[#FFD86E]",
  },
  {
    title: "Acidity Comparison Pack",
    type: "PDF",
    tag: "9701",
    icon: FileText,
    accent: "bg-[#FFB27D]",
  },
  {
    title: "Qualitative Analysis Viewer",
    type: "HTML",
    tag: "Practical",
    icon: PlayCircle,
    accent: "bg-[#A8D7FF]",
  },
  {
    title: "Organic Mechanism Cards",
    type: "Notes",
    tag: "AS",
    icon: BookOpen,
    accent: "bg-[#E7B7FF]",
  },
  {
    title: "Data Booklet Shortcuts",
    type: "Guide",
    tag: "Exam",
    icon: FileText,
    accent: "bg-[#FFE081]",
  },
  {
    title: "Planning an Investigation",
    type: "Worksheet",
    tag: "Paper 5",
    icon: FlaskConical,
    accent: "bg-[#BDECC5]",
  },
];

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function runStaticChecks(): void {
  console.assert(features.length === 3, "Expected three feature cards.");
  console.assert(resources.length === 6, "Expected six resource cards.");
  console.assert(
    resources.every(item => item.tag.length > 0),
    "Each resource needs a tag."
  );
}

runStaticChecks();

function PaperDot({ className, color }: { className: string; color: string }) {
  return <div className={cx("absolute rounded-full border-[3px] border-black/95", color, className)} />;
}

function PaperBar({ className, color }: { className: string; color: string }) {
  return <div className={cx("absolute rounded-[16px] border-[3px] border-black/95", color, className)} />;
}

function J2FeatureCard({ item }: { item: Feature }) {
  const Icon = item.icon;

  return (
    <motion.article
      whileHover={{ y: -4 }}
      className="relative rounded-[28px] border-[4px] border-black bg-[#FFF9F0] p-5 shadow-[6px_6px_0_#000]"
    >
      <div
        className={cx(
          "absolute left-5 top-[-22px] flex h-20 w-20 items-center justify-center rounded-full border-[4px] border-black",
          item.accent
        )}
      >
        <Icon className="h-9 w-9 text-black" strokeWidth={2.4} />
      </div>
      <div className="pt-12">
        <h3 className="font-sans text-[1.7rem] font-black uppercase leading-none text-black">{item.title}</h3>
        <p className="mt-3 text-sm leading-6 text-black/75">{item.description}</p>
      </div>
      <div
        className={cx("absolute bottom-0 left-0 h-4 w-full rounded-b-[22px] border-t-[4px] border-black", item.accent)}
      />
    </motion.article>
  );
}

function J2ResourceCard({ item }: { item: Resource }) {
  const Icon = item.icon;

  return (
    <motion.article
      whileHover={{ y: -3 }}
      className="relative rounded-[22px] border-[4px] border-black bg-[#FFF9F0] p-4 shadow-[5px_5px_0_#000]"
    >
      <div
        className={cx("absolute left-0 top-0 h-full w-5 rounded-l-[18px] border-r-[4px] border-black", item.accent)}
      />
      <div className="ml-7 flex items-start gap-4">
        <div
          className={cx(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border-[3px] border-black",
            item.accent
          )}
        >
          <Icon className="h-7 w-7 text-black" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-black/55">{item.type}</div>
          <h3 className="mt-1 text-xl font-black leading-tight text-black">{item.title}</h3>
          <div className="mt-3 inline-flex rounded-[12px] border-[3px] border-black bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-black">
            {item.tag}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function ResourceBankHomepageJ2Variant() {
  return (
    <div className="min-h-screen bg-[#F9F3E7] text-black">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,224,129,0.18),transparent_22%),radial-gradient(circle_at_90%_10%,rgba(231,183,255,0.18),transparent_22%),linear-gradient(180deg,#F9F3E7_0%,#FBF6ED_100%)]" />

        <PaperDot className="left-[3%] top-[18%] h-20 w-20" color="bg-[#E7B7FF]" />
        <PaperDot className="left-[14%] top-[29%] h-12 w-12" color="bg-[#A8D7FF]" />
        <PaperDot className="right-[8%] top-[15%] h-16 w-16" color="bg-[#FFB27D]" />
        <PaperDot className="right-[14%] top-[33%] h-10 w-10" color="bg-[#BDECC5]" />
        <PaperBar className="left-[10%] top-[34%] h-12 w-40 -rotate-[16deg]" color="bg-[#FFB27D]" />
        <PaperBar className="right-[18%] top-[26%] h-12 w-36 rotate-[12deg]" color="bg-[#A8D7FF]" />

        <div className="relative mx-auto max-w-[1380px] px-6 pb-20 pt-6 md:px-10">
          <header className="flex items-center justify-between gap-6 border-b-[5px] border-black pb-5">
            <div className="flex items-center gap-8">
              <div className="rounded-[22px] border-[4px] border-black bg-[#FFE081] px-5 py-3 shadow-[4px_4px_0_#000]">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-black" strokeWidth={2.5} />
                  <span className="text-2xl font-black uppercase tracking-tight">Resource Hub</span>
                </div>
              </div>
              <nav className="hidden items-center gap-10 text-2xl font-black uppercase lg:flex">
                <a href="#">Courses</a>
                <a href="#">Books</a>
                <a href="#">Tutorials</a>
                <a href="#">Community</a>
                <a href="#">About</a>
              </nav>
            </div>

            <div className="hidden items-center gap-5 md:flex">
              <div className="flex h-14 w-[320px] items-center gap-3 rounded-[18px] border-[4px] border-black bg-[#FFF9F0] px-4 shadow-[4px_4px_0_#000]">
                <Search className="h-6 w-6 text-black" strokeWidth={2.4} />
                <span className="text-xl font-black uppercase text-black/55">Search...</span>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-[4px] border-black bg-[#FFD98A] shadow-[3px_3px_0_#000]">
                <User className="h-7 w-7 text-black" strokeWidth={2.4} />
              </div>
            </div>
          </header>

          <main className="mt-10 grid gap-10 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
            <section>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="relative"
              >
                <div className="relative mx-auto max-w-[760px] rotate-[-3deg] rounded-[26px] border-[6px] border-black bg-[linear-gradient(90deg,#DDB8FF_0%,#F8DC7B_100%)] px-8 py-12 shadow-[12px_12px_0_#000] md:px-12 md:py-14">
                  <div className="absolute -left-6 bottom-10 h-24 w-24 rotate-[18deg] border-[5px] border-black bg-[#A8D7FF]" />
                  <div className="absolute left-[8%] top-[-22px] h-12 w-40 -rotate-[9deg] rounded-[10px] border-[4px] border-black bg-[#A8D7FF]" />
                  <div className="absolute right-[-18px] top-10 h-20 w-20 rotate-[16deg] border-[5px] border-black bg-[#FFB27D]" />
                  <div className="absolute right-[6%] bottom-[-18px] h-24 w-24 rounded-[22px] border-[5px] border-black bg-[#A8D7FF] [clip-path:polygon(25%_0%,100%_0%,100%_75%,75%_100%,0%_100%,0%_25%)]" />

                  <div className="relative z-10">
                    <div className="max-w-[640px]">
                      <div className="text-sm font-black uppercase tracking-[0.26em] text-black/70">
                        A-Level Chemistry Library
                      </div>
                      <h1 className="mt-5 text-5xl font-black uppercase leading-[0.95] text-black md:text-7xl">
                        Unlock your knowledge. Build a resource library that feels alive.
                      </h1>
                      <p className="mt-6 max-w-[560px] text-lg font-semibold leading-8 text-black/72 md:text-xl">
                        A strong visual homepage for documents, revision packs, practical notes, and interactive tools —
                        with brand memory first, not generic ed-tech UI.
                      </p>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-4">
                      <button className="rounded-[18px] border-[4px] border-black bg-[#FFB27D] px-8 py-4 text-2xl font-black uppercase shadow-[6px_6px_0_#000] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#000]">
                        Explore Resources
                      </button>
                      <button className="rounded-[18px] border-[4px] border-black bg-[#BDECC5] px-8 py-4 text-2xl font-black uppercase shadow-[6px_6px_0_#000] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#000]">
                        Open Interactive
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="mt-14 grid gap-8 md:grid-cols-3">
                {features.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.08 * (index + 1) }}
                  >
                    <J2FeatureCard item={item} />
                  </motion.div>
                ))}
              </div>
            </section>

            <section>
              <div className="rounded-[28px] border-[5px] border-black bg-[#FFF9F0] p-6 shadow-[8px_8px_0_#000]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.24em] text-black/55">
                      Popular documents
                    </div>
                    <h2 className="mt-2 text-4xl font-black uppercase leading-none">Top picks</h2>
                  </div>
                  <button className="inline-flex items-center rounded-[16px] border-[4px] border-black bg-[#FFE081] px-5 py-3 text-lg font-black uppercase shadow-[4px_4px_0_#000]">
                    View all
                    <ChevronRight className="ml-2 h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  {resources.map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.06 * index }}
                    >
                      <J2ResourceCard item={item} />
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 rounded-[24px] border-[4px] border-black bg-[#FFF3D6] p-5 shadow-[5px_5px_0_#000]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-black uppercase tracking-[0.24em] text-black/55">
                        Manual code integration
                      </div>
                      <div className="mt-2 text-2xl font-black uppercase leading-tight">
                        Interactive resources stay separate from documents.
                      </div>
                      <p className="mt-3 text-sm leading-6 text-black/72">
                        This version keeps the current project logic: documents display directly, while code-based
                        assets enter through isolated interactive routes.
                      </p>
                    </div>
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border-[4px] border-black bg-[#A8D7FF]">
                      <Download className="h-7 w-7 text-black" strokeWidth={2.4} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
