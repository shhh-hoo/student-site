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

type IconComponent = React.ComponentType<{ className?: string; strokeWidth?: number }>;

type Feature = {
  title: string;
  description: string;
  icon: IconComponent;
  accent: string;
  glow: string;
};

type Resource = {
  title: string;
  type: string;
  tag: string;
  icon: IconComponent;
  accent: string;
  glow: string;
};

const features: Feature[] = [
  {
    title: "Curated Notes",
    description: "Revision packs, summaries, and guided notes for core chemistry topics.",
    icon: BookOpen,
    accent: "bg-[#1B1630]",
    glow: "shadow-[0_0_0_3px_#7CFFB2,0_0_28px_rgba(124,255,178,0.42)]",
  },
  {
    title: "Interactive Tools",
    description: "Topic maps, code-based modules, and visual learning pathways.",
    icon: Sparkles,
    accent: "bg-[#24152B]",
    glow: "shadow-[0_0_0_3px_#FF6BDE,0_0_28px_rgba(255,107,222,0.38)]",
  },
  {
    title: "Practical Skills",
    description: "Experiment technique cards, observation logic, and planning support.",
    icon: FlaskConical,
    accent: "bg-[#162234]",
    glow: "shadow-[0_0_0_3px_#6ED8FF,0_0_28px_rgba(110,216,255,0.4)]",
  },
];

const resources = [
  {
    title: "Reaction Pathway Atlas",
    type: "Interactive",
    tag: "Popular",
    icon: Layers3,
    accent: "bg-[#231632]",
    glow: "shadow-[0_0_0_3px_#FF6BDE,0_0_20px_rgba(255,107,222,0.35)]",
  },
  {
    title: "Acidity Comparison Pack",
    type: "PDF",
    tag: "9701",
    icon: FileText,
    accent: "bg-[#2B2113]",
    glow: "shadow-[0_0_0_3px_#FFD86E,0_0_20px_rgba(255,216,110,0.3)]",
  },
  {
    title: "Qualitative Analysis Viewer",
    type: "HTML",
    tag: "Practical",
    icon: PlayCircle,
    accent: "bg-[#142334]",
    glow: "shadow-[0_0_0_3px_#6ED8FF,0_0_20px_rgba(110,216,255,0.34)]",
  },
  {
    title: "Organic Mechanism Cards",
    type: "Notes",
    tag: "AS",
    icon: BookOpen,
    accent: "bg-[#1C2B1B]",
    glow: "shadow-[0_0_0_3px_#7CFFB2,0_0_20px_rgba(124,255,178,0.3)]",
  },
  {
    title: "Data Booklet Shortcuts",
    type: "Guide",
    tag: "Exam",
    icon: FileText,
    accent: "bg-[#2A1A12]",
    glow: "shadow-[0_0_0_3px_#FF9E6B,0_0_20px_rgba(255,158,107,0.34)]",
  },
  {
    title: "Planning an Investigation",
    type: "Worksheet",
    tag: "Paper 5",
    icon: FlaskConical,
    accent: "bg-[#191D32]",
    glow: "shadow-[0_0_0_3px_#9B8CFF,0_0_20px_rgba(155,140,255,0.34)]",
  },
] as const;

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

function NeonDot({ className, color }: { className: string; color: string }) {
  return <div className={cx("absolute rounded-full border-[3px] border-white/90", color, className)} />;
}

function NeonBar({ className, color }: { className: string; color: string }) {
  return <div className={cx("absolute rounded-[16px] border-[3px] border-white/90", color, className)} />;
}

function DarkFeatureCard({ item }: { item: Feature }) {
  const Icon = item.icon;

  return (
    <motion.article
      whileHover={{ y: -4 }}
      className={cx(
        "relative rounded-[28px] border-[4px] border-white/90 bg-[#0F1120] p-5 text-white shadow-[8px_8px_0_rgba(0,0,0,0.55)]",
        item.glow
      )}
    >
      <div
        className={cx(
          "absolute left-5 top-[-22px] flex h-20 w-20 items-center justify-center rounded-full border-[4px] border-white/90",
          item.accent,
          item.glow
        )}
      >
        <Icon className="h-9 w-9 text-white" strokeWidth={2.4} />
      </div>
      <div className="pt-12">
        <h3 className="font-sans text-[1.7rem] font-black uppercase leading-none text-white">{item.title}</h3>
        <p className="mt-3 text-sm leading-6 text-white/72">{item.description}</p>
      </div>
      <div className="absolute bottom-0 left-0 h-4 w-full rounded-b-[22px] border-t-[4px] border-white/90 bg-[linear-gradient(90deg,#7CFFB2_0%,#6ED8FF_45%,#FF6BDE_100%)]" />
    </motion.article>
  );
}

function DarkResourceCard({ item }: { item: (typeof resources)[number] }) {
  const Icon = item.icon;

  return (
    <motion.article
      whileHover={{ y: -3 }}
      className={cx(
        "relative rounded-[22px] border-[4px] border-white/90 bg-[#101322] p-4 text-white shadow-[7px_7px_0_rgba(0,0,0,0.55)]",
        item.glow
      )}
    >
      <div
        className={cx("absolute left-0 top-0 h-full w-5 rounded-l-[18px] border-r-[4px] border-white/90", item.accent)}
      />
      <div className="ml-7 flex items-start gap-4">
        <div
          className={cx(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border-[3px] border-white/90",
            item.accent,
            item.glow
          )}
        >
          <Icon className="h-7 w-7 text-white" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-white/55">{item.type}</div>
          <h3 className="mt-1 text-xl font-black leading-tight text-white">{item.title}</h3>
          <div className="mt-3 inline-flex rounded-[12px] border-[3px] border-white/90 bg-black/40 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white">
            {item.tag}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function ResourceBankHomepageJ2DarkVariant() {
  return (
    <div className="min-h-screen bg-[#090B14] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,107,222,0.14),transparent_18%),radial-gradient(circle_at_90%_10%,rgba(110,216,255,0.16),transparent_22%),radial-gradient(circle_at_10%_80%,rgba(124,255,178,0.12),transparent_18%),linear-gradient(180deg,#090B14_0%,#101322_52%,#0A0D18_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:34px_34px] opacity-40" />

        <NeonDot
          className="left-[3%] top-[18%] h-20 w-20 bg-[#2B1842] shadow-[0_0_28px_rgba(255,107,222,0.35)]"
          color=""
        />
        <NeonDot
          className="left-[14%] top-[29%] h-12 w-12 bg-[#132A42] shadow-[0_0_24px_rgba(110,216,255,0.32)]"
          color=""
        />
        <NeonDot
          className="right-[8%] top-[15%] h-16 w-16 bg-[#2C2111] shadow-[0_0_24px_rgba(255,216,110,0.28)]"
          color=""
        />
        <NeonDot
          className="right-[14%] top-[33%] h-10 w-10 bg-[#162C20] shadow-[0_0_22px_rgba(124,255,178,0.3)]"
          color=""
        />
        <NeonBar
          className="left-[10%] top-[34%] h-12 w-40 -rotate-[16deg] bg-[#291915] shadow-[0_0_26px_rgba(255,158,107,0.3)]"
          color=""
        />
        <NeonBar
          className="right-[18%] top-[26%] h-12 w-36 rotate-[12deg] bg-[#15263A] shadow-[0_0_26px_rgba(110,216,255,0.28)]"
          color=""
        />

        <div className="relative mx-auto max-w-[1380px] px-6 pb-20 pt-6 md:px-10">
          <header className="flex items-center justify-between gap-6 border-b-[5px] border-white/90 pb-5">
            <div className="flex items-center gap-8">
              <div className="rounded-[22px] border-[4px] border-white/90 bg-[#241A10] px-5 py-3 shadow-[4px_4px_0_rgba(0,0,0,0.55),0_0_22px_rgba(255,216,110,0.28)]">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-[#FFE081]" strokeWidth={2.5} />
                  <span className="text-2xl font-black uppercase tracking-tight text-white">Resource Hub</span>
                </div>
              </div>
              <nav className="hidden items-center gap-10 text-2xl font-black uppercase lg:flex">
                <a href="#" className="text-white/92">
                  Courses
                </a>
                <a href="#" className="text-white/92">
                  Books
                </a>
                <a href="#" className="text-white/92">
                  Tutorials
                </a>
                <a href="#" className="text-white/92">
                  Community
                </a>
                <a href="#" className="text-white/92">
                  About
                </a>
              </nav>
            </div>

            <div className="hidden items-center gap-5 md:flex">
              <div className="flex h-14 w-[320px] items-center gap-3 rounded-[18px] border-[4px] border-white/90 bg-[#111525] px-4 shadow-[4px_4px_0_rgba(0,0,0,0.55),0_0_20px_rgba(110,216,255,0.2)]">
                <Search className="h-6 w-6 text-[#6ED8FF]" strokeWidth={2.4} />
                <span className="text-xl font-black uppercase text-white/45">Search...</span>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-[4px] border-white/90 bg-[#1E1732] shadow-[3px_3px_0_rgba(0,0,0,0.55),0_0_20px_rgba(255,107,222,0.24)]">
                <User className="h-7 w-7 text-[#FF6BDE]" strokeWidth={2.4} />
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
                <div className="relative mx-auto max-w-[760px] rotate-[-3deg] rounded-[26px] border-[6px] border-white/90 bg-[linear-gradient(90deg,#25163A_0%,#132C3C_48%,#2A1B15_100%)] px-8 py-12 shadow-[12px_12px_0_rgba(0,0,0,0.62),0_0_36px_rgba(155,140,255,0.22)] md:px-12 md:py-14">
                  <div className="absolute -left-6 bottom-10 h-24 w-24 rotate-[18deg] border-[5px] border-white/90 bg-[#15263A] shadow-[0_0_24px_rgba(110,216,255,0.28)]" />
                  <div className="absolute left-[8%] top-[-22px] h-12 w-40 -rotate-[9deg] rounded-[10px] border-[4px] border-white/90 bg-[#1A2D20] shadow-[0_0_24px_rgba(124,255,178,0.26)]" />
                  <div className="absolute right-[-18px] top-10 h-20 w-20 rotate-[16deg] border-[5px] border-white/90 bg-[#2B1916] shadow-[0_0_24px_rgba(255,158,107,0.28)]" />
                  <div className="absolute right-[6%] bottom-[-18px] h-24 w-24 rounded-[22px] border-[5px] border-white/90 bg-[#231632] shadow-[0_0_24px_rgba(255,107,222,0.25)] [clip-path:polygon(25%_0%,100%_0%,100%_75%,75%_100%,0%_100%,0%_25%)]" />

                  <div className="relative z-10">
                    <div className="max-w-[640px]">
                      <div className="text-sm font-black uppercase tracking-[0.26em] text-white/62">
                        A-Level Chemistry Library
                      </div>
                      <h1 className="mt-5 text-5xl font-black uppercase leading-[0.95] text-white md:text-7xl">
                        Unlock your knowledge. Build a resource library that glows at night.
                      </h1>
                      <p className="mt-6 max-w-[560px] text-lg font-semibold leading-8 text-white/72 md:text-xl">
                        The same bold paper-cut structure as J2, but translated into a midnight palette with neon edges,
                        luminous tags, and stronger contrast for dark mode.
                      </p>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-4">
                      <button className="rounded-[18px] border-[4px] border-white/90 bg-[#291915] px-8 py-4 text-2xl font-black uppercase text-white shadow-[6px_6px_0_rgba(0,0,0,0.55),0_0_22px_rgba(255,158,107,0.32)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_rgba(0,0,0,0.55),0_0_16px_rgba(255,158,107,0.28)]">
                        Explore Resources
                      </button>
                      <button className="rounded-[18px] border-[4px] border-white/90 bg-[#15263A] px-8 py-4 text-2xl font-black uppercase text-white shadow-[6px_6px_0_rgba(0,0,0,0.55),0_0_22px_rgba(110,216,255,0.3)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_rgba(0,0,0,0.55),0_0_16px_rgba(110,216,255,0.26)]">
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
                    <DarkFeatureCard item={item} />
                  </motion.div>
                ))}
              </div>
            </section>

            <section>
              <div className="rounded-[28px] border-[5px] border-white/90 bg-[#0E1120] p-6 shadow-[8px_8px_0_rgba(0,0,0,0.6),0_0_30px_rgba(155,140,255,0.16)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.24em] text-white/50">
                      Popular documents
                    </div>
                    <h2 className="mt-2 text-4xl font-black uppercase leading-none text-white">Top picks</h2>
                  </div>
                  <button className="inline-flex items-center rounded-[16px] border-[4px] border-white/90 bg-[#241A10] px-5 py-3 text-lg font-black uppercase text-white shadow-[4px_4px_0_rgba(0,0,0,0.55),0_0_20px_rgba(255,216,110,0.28)]">
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
                      <DarkResourceCard item={item} />
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 rounded-[24px] border-[4px] border-white/90 bg-[#121B30] p-5 shadow-[5px_5px_0_rgba(0,0,0,0.55),0_0_22px_rgba(110,216,255,0.18)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-black uppercase tracking-[0.24em] text-white/50">
                        Manual code integration
                      </div>
                      <div className="mt-2 text-2xl font-black uppercase leading-tight text-white">
                        Interactive resources stay separate from documents.
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/72">
                        The project logic stays the same in dark mode: documents display directly, while code-based
                        assets enter through isolated interactive routes.
                      </p>
                    </div>
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border-[4px] border-white/90 bg-[#15263A] shadow-[0_0_18px_rgba(110,216,255,0.22)]">
                      <Download className="h-7 w-7 text-[#6ED8FF]" strokeWidth={2.4} />
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
