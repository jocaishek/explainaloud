"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  LockKeyhole,
  Mic2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExplainaloudMark } from "~/components/explainaloud-mark";

const YRI_URL = "https://yriscience.com?ref=EXPLAINALOUD";

/* Heights for the equalizer in the recorder row. Fixed values, not random
 * ones: the bars animate scaleY in CSS, and a deterministic list keeps
 * server and client markup identical. */
const WAVE = [
  38, 62, 46, 78, 54, 88, 40, 68, 92, 58, 74, 44, 82, 60, 36, 70, 50, 84, 64,
  42,
] as const;

/* The two subject cards in the strip under the hero. Authored example
 * output, marked exactly as the grader marks. */
const SUBJECT_CARDS = [
  {
    id: "physics",
    code: "PHY",
    title: "Physics 101",
    topic: "Newton's third law",
    quote:
      "Every action has an equal and opposite reaction. The forces cancel each other out.",
    verdict: "vague",
    verdictLabel: "Review this",
    note: "The forces act on different objects.",
  },
  {
    id: "history",
    code: "HIS",
    title: "World History",
    topic: "The French Revolution",
    quote:
      "The Third Estate demanded representation and formed the National Assembly.",
    verdict: "missing",
    verdictLabel: "You skipped",
    note: "Add the Tennis Court Oath.",
  },
] as const;

const STEPS = [
  {
    id: "upload",
    title: "Upload your notes",
    body: "PDFs, slides, or handwritten pages become the source of truth.",
  },
  {
    id: "explain",
    title: "Explain out loud",
    body: "Talk from memory for about three minutes. No script, no typing.",
  },
  {
    id: "review",
    title: "See what landed",
    body: "Every sentence graded against your own material.",
  },
] as const;

export function LandingDesk() {
  const rootRef = useRef<HTMLElement>(null);
  const heroParam = useSearchParams().get("hero");
  const variant =
    heroParam === "type" || heroParam === "photo" ? heroParam : "vapor";

  /* Whether this device gets the hero video at all. The mp4 is 1.6MB of
   * near-42Mbps loop, and on phones it was the single heaviest thing on the
   * page — so on coarse pointers, small screens and under reduced motion the
   * <video> is never mounted (a display:none video still downloads), and the
   * static gradient layer underneath carries the look instead. False on the
   * server and for the hydration pass, so the video only ever appears via a
   * post-hydration client render on devices that opted in. */
  const [heavyHero, setHeavyHero] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      "(pointer: fine) and (min-width: 48rem) and (prefers-reduced-motion: no-preference)",
    );
    const update = () => setHeavyHero(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /* The vapor's own motion, mounted only alongside the video: a 0.3s
   * kaleidoscope stretched to a slow breath, a pointer lean, and an
   * IntersectionObserver that stops both the tween and the decode the
   * moment the hero scrolls out of view. */
  useEffect(() => {
    if (!heavyHero) return;
    const root = rootRef.current;
    const hero = root?.querySelector<HTMLElement>(".ld-hero");
    const vapor = root?.querySelector<HTMLVideoElement>(".ld-vapor");
    if (!hero || !vapor) return;

    vapor.playbackRate = 0.25;

    const breathe = gsap.to(vapor, {
      scale: 1.14,
      duration: 26,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });

    const vaporTo = {
      x: gsap.quickTo(vapor, "x", { duration: 0.9, ease: "power3.out" }),
      y: gsap.quickTo(vapor, "y", { duration: 0.9, ease: "power3.out" }),
    };
    const onPointerMove = (e: PointerEvent) => {
      vaporTo.x((e.clientX / window.innerWidth - 0.5) * 34);
      vaporTo.y((e.clientY / window.innerHeight - 0.5) * 26);
    };
    if (window.matchMedia("(hover: hover)").matches) {
      hero.addEventListener("pointermove", onPointerMove);
    }

    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        breathe.resume();
        vapor.play().catch(() => {});
      } else {
        breathe.pause();
        vapor.pause();
      }
    });
    io.observe(hero);

    return () => {
      io.disconnect();
      hero.removeEventListener("pointermove", onPointerMove);
      breathe.kill();
      gsap.set(vapor, { clearProps: "x,y,scale" });
    };
  }, [heavyHero]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    /* The hero is 100dvh, so every URL-bar collapse on mobile used to fire a
     * full ScrollTrigger refresh mid-scroll. Only genuine resizes matter. */
    ScrollTrigger.config({ ignoreMobileResize: true });
    const mm = gsap.matchMedia(rootRef);

    /* ── Touch devices get the calm cut: one entrance, opacity reveals,
     * and none of the scrubbed parallax — scrub work off native touch
     * scroll is exactly what made the page feel broken on phones. At rest
     * everything below is simply visible, so dropping a tween costs
     * nothing visually. ── */
    mm.add(
      "(prefers-reduced-motion: no-preference) and (pointer: coarse)",
      () => {
        gsap.from(
          ".ld-hero-copy h1 > span, .ld-hero-foot p, .ld-privacy, .ld-pill, .ld-link-quiet",
          {
            y: 24,
            opacity: 0,
            duration: 0.7,
            stagger: 0.06,
            ease: "power2.out",
          },
        );

        for (const el of gsap.utils.toArray<HTMLElement>("[data-reveal]")) {
          gsap.from(el, {
            opacity: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 88%" },
          });
        }
      },
    );

    mm.add(
      "(prefers-reduced-motion: no-preference) and (pointer: fine)",
      () => {
        const ease = "expo.out";

        /* ── The entrance: three clean line rises, nothing fighting the
         * line-balancer, then the foot settles. ── */
        const enter = gsap.timeline({ defaults: { ease } });
        enter
          .from(
            ".ld-hero-copy h1 > span",
            { y: 70, opacity: 0, duration: 1.1, stagger: 0.12 },
            0.1,
          )
          .from(
            ".ld-hero-foot p, .ld-privacy",
            { y: 18, opacity: 0, duration: 0.8, stagger: 0.1 },
            0.55,
          )
          .from(
            ".ld-pill, .ld-link-quiet",
            {
              scale: 0.88,
              opacity: 0,
              duration: 0.8,
              stagger: 0.08,
              ease: "back.out(1.7)",
            },
            0.7,
          );

        /* ── The field answers the pointer: the ghost mark leans away, and
         * the type variant's letters duck under the cursor. (The vapor's own
         * lean lives in the video effect above, because the video mounts a
         * render later than this context runs.) ── */
        const hero = rootRef.current?.querySelector<HTMLElement>(".ld-hero");
        if (hero && window.matchMedia("(hover: hover)").matches) {
          const ghostTo = {
            x: gsap.quickTo(".ld-hero-ghost", "x", {
              duration: 1.2,
              ease: "power3.out",
            }),
            y: gsap.quickTo(".ld-hero-ghost", "y", {
              duration: 1.2,
              ease: "power3.out",
            }),
          };
          const letters = gsap.utils.toArray<HTMLElement>(".ld-type-l");
          const lifts = letters.map((l) => ({
            el: l,
            y: gsap.quickTo(l, "y", { duration: 0.5, ease: "power3.out" }),
            r: gsap.quickTo(l, "rotation", {
              duration: 0.6,
              ease: "power3.out",
            }),
          }));
          hero.addEventListener("pointermove", (e) => {
            const nx = e.clientX / window.innerWidth - 0.5;
            const ny = e.clientY / window.innerHeight - 0.5;
            ghostTo.x(nx * -52);
            ghostTo.y(ny * -38);
            for (const lift of lifts) {
              const r = lift.el.getBoundingClientRect();
              const d = Math.hypot(
                e.clientX - (r.left + r.width / 2),
                e.clientY - (r.top + r.height / 2),
              );
              const power = Math.max(0, 1 - d / 240);
              lift.y(power * -30);
              lift.r(power * (nx > 0 ? -7 : 7));
            }
          });
        }

        /* ── The hero hands off as you leave (the field's breathing lives in
         * the video effect, paused whenever the hero is offscreen) ── */
        gsap.to(".ld-hero-field", {
          yPercent: 14,
          ease: "none",
          scrollTrigger: {
            trigger: ".ld-hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
        gsap.to(".ld-hero-ghost", {
          yPercent: -30,
          rotation: 8,
          ease: "none",
          scrollTrigger: {
            trigger: ".ld-hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
        gsap.to(".ld-hero-copy", {
          yPercent: -8,
          opacity: 0.4,
          ease: "none",
          scrollTrigger: {
            trigger: ".ld-hero",
            start: "60% bottom",
            end: "bottom top",
            scrub: true,
          },
        });

        /* ── The window grades its take as it passes through your view ──
         * No pin, no overlay: the transcript lines brighten as if spoken and
         * paint their verdicts, driven by the scene's passage. At rest and
         * without JS the window is simply a finished, graded session. */
        const lines = gsap.utils.toArray<HTMLElement>(".ld-tr");
        if (lines.length > 0) {
          const grade = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: ".ld-scene",
              start: "top 70%",
              end: "center 42%",
              scrub: 0.4,
            },
          });
          let at = 0;
          for (const line of lines) {
            grade
              .fromTo(
                line,
                { opacity: 0.3 },
                { opacity: 1, duration: 0.16 },
                at,
              )
              .fromTo(
                line,
                { "--sweep": 0 },
                { "--sweep": 1, duration: 0.12 },
                at + 0.14,
              );
            at += 0.28;
          }
        }

        /* ── The nav: gone while you read down, back the moment you look up ── */
        const nav = rootRef.current?.querySelector(".ld-nav");
        if (nav) {
          const hide = gsap
            .to(nav, { yPercent: -110, duration: 0.35, ease: "power2.inOut" })
            .pause();
          ScrollTrigger.create({
            start: "80 top",
            end: "max",
            onUpdate: (self) => {
              if (self.direction === 1) hide.play();
              else hide.reverse();
            },
          });
        }

        /* ── The showcase: the window stands up out of the desk ── */
        gsap.fromTo(
          ".ld-window",
          { y: 110, rotateX: 12, opacity: 0 },
          {
            y: 0,
            rotateX: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".ld-scene",
              start: "top 92%",
              end: "top 38%",
              scrub: 0.6,
            },
          },
        );
        gsap.fromTo(
          ".ld-scene-photo",
          { scale: 1.12 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".ld-scene",
              start: "top 95%",
              end: "bottom 30%",
              scrub: true,
            },
          },
        );
        gsap.from(".ld-verdict-rail > *", {
          x: 16,
          opacity: 0,
          duration: 0.7,
          stagger: 0.08,
          ease,
          scrollTrigger: { trigger: ".ld-scene", start: "top 55%" },
        });

        /* ── Subject cards swing in from their own sides ── */
        const subjects = gsap.utils.toArray<HTMLElement>(".ld-subject");
        for (const [i, card] of subjects.entries()) {
          gsap.from(card, {
            x: i === 0 ? -70 : 70,
            rotation: i === 0 ? -4 : 4,
            opacity: 0,
            duration: 1,
            ease,
            scrollTrigger: { trigger: ".ld-strip-row", start: "top 82%" },
          });
        }

        /* ── The hollow numerals drift a beat slower than their steps ── */
        for (const num of gsap.utils.toArray<HTMLElement>(".ld-ghost-num")) {
          gsap.fromTo(
            num,
            { y: 46 },
            {
              y: -26,
              ease: "none",
              scrollTrigger: {
                trigger: num,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        }

        /* ── The boundary statement lands word by word ── */
        const boundary = SplitText.create(".ld-boundary-note p", {
          type: "words",
          mask: "words",
        });
        gsap.from(boundary.words, {
          yPercent: 120,
          duration: 0.8,
          stagger: 0.08,
          ease,
          scrollTrigger: { trigger: ".ld-boundary-note", start: "top 78%" },
        });

        /* ── The sign-off: the wordmark rises out of the page's own edge ── */
        gsap.fromTo(
          ".ld-footer-giant",
          { yPercent: 46 },
          {
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: ".ld-footer-giant",
              start: "top bottom",
              end: "bottom bottom",
              scrub: true,
            },
          },
        );

        /* ── Everything else settles in once, quietly ── */
        for (const el of gsap.utils.toArray<HTMLElement>("[data-reveal]")) {
          gsap.from(el, {
            y: 26,
            opacity: 0,
            duration: 0.9,
            ease,
            scrollTrigger: { trigger: el, start: "top 85%" },
          });
        }

        return () => {
          boundary.revert();
        };
      },
    );

    return () => mm.revert();
  }, []);

  return (
    <main ref={rootRef} className="lp-desk min-h-[100dvh] overflow-x-clip">
      <nav className="ld-nav" aria-label="Main navigation">
        <div className="ld-container">
          <Link href="/" className="ld-brand" aria-label="Explainaloud home">
            <ExplainaloudMark className="ld-brand-mark" />
            <span>explainaloud</span>
          </Link>
          <div className="ld-nav-right">
            <a href="#how-it-works" className="ld-nav-link">
              How it works
            </a>
            <a href="#sources" className="ld-nav-link">
              Sources
            </a>
            <a href="#partnership" className="ld-nav-link">
              Partnership
            </a>
            <Link href="/login" className="ld-nav-link ld-nav-login">
              Log in
            </Link>
            <Link
              href="/signup"
              className="ld-button ld-button-primary ld-button-nav"
            >
              Try it free
            </Link>
          </div>
        </div>
      </nav>

      <section className={`ld-hero ld-hero--${variant}`}>
        {variant === "vapor" && (
          <>
            {/* The field: the vapor at full bleed, hue-shifted into the
             * page's steel, leaning toward the pointer. The still layer is
             * the same weather painted in gradients; on touch and small
             * screens it is the whole field, and the video never mounts —
             * or downloads. */}
            <div className="ld-hero-field" aria-hidden="true">
              <div className="ld-vapor-still" />
              {heavyHero && (
                <video
                  className="ld-vapor"
                  src="/landing/lunar-vapor.mp4"
                  preload="metadata"
                  autoPlay
                  loop
                  muted
                  playsInline
                  tabIndex={-1}
                />
              )}
            </div>
            <ExplainaloudMark className="ld-hero-ghost" strokeWidth={1.5} />
          </>
        )}

        {variant === "photo" && (
          <div className="ld-hero-photo" aria-hidden="true">
            <Image
              src="/landing/explainaloud-study-desk-v1.jpg"
              alt=""
              fill
              sizes="100vw"
            />
          </div>
        )}

        <div className="ld-hero-copy ld-container">
          {variant === "type" ? (
            <h1 aria-label="Say it. Out loud.">
              <span aria-hidden="true">
                {"Say it.".split("").map((ch, i) => (
                  <b
                    // biome-ignore lint/suspicious/noArrayIndexKey: static letters
                    key={i}
                    className="ld-type-l"
                  >
                    {ch === " " ? "\u00A0" : ch}
                  </b>
                ))}
              </span>
              <span aria-hidden="true" className="ld-accent">
                {"Out loud.".split("").map((ch, i) => (
                  <b
                    // biome-ignore lint/suspicious/noArrayIndexKey: static letters
                    key={i}
                    className="ld-type-l"
                  >
                    {ch === " " ? "\u00A0" : ch}
                  </b>
                ))}
              </span>
            </h1>
          ) : (
            <h1>
              <span>The best way to know it</span>
              <span>
                is to <em className="ld-accent">explain it.</em>
              </span>
            </h1>
          )}
          <div className="ld-hero-foot">
            <p>
              Speak from memory. See what landed, what was vague, what you
              missed.
            </p>
            <div className="ld-actions">
              <Link href="/signup" className="ld-button ld-pill">
                Try it free
                <ArrowRight aria-hidden="true" />
              </Link>
              <a href="#how-it-works" className="ld-link-quiet">
                See how it works
              </a>
            </div>
          </div>
          <span className="ld-privacy">
            <LockKeyhole aria-hidden="true" />
            Audio is transcribed, then discarded.
          </span>
        </div>
      </section>

      <section
        className="ld-showcase"
        aria-label="The grading session up close"
      >
        <div className="ld-stage">
          <div className="ld-scene">
            <Image
              src="/landing/explainaloud-study-desk-v1.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="ld-scene-photo"
            />
            <div
              className="ld-window"
              role="img"
              aria-label="Example of a spoken explanation being graded sentence by sentence"
            >
              <div className="ld-demo-head">
                <span className="ld-chrome" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="ld-demo-course">
                  Biology 201 <i>·</i> Cell signaling
                </span>
                <span className="ld-demo-live">Example analysis</span>
              </div>
              <div className="ld-demo-body">
                <div className="ld-demo-main">
                  <p className="ld-demo-kicker">
                    Recall prompt 04 / 08{" "}
                    <span>Lecture 06.pdf · pages 8–14</span>
                  </p>
                  <h2>How does a cell receive a signal?</h2>
                  <p className="ld-demo-task">
                    Explain the pathway from ligand to response.
                  </p>
                  <div className="ld-recorder">
                    <span className="ld-rec-dot">
                      <Mic2 aria-hidden="true" />
                    </span>
                    <div className="ld-wave" aria-hidden="true">
                      {WAVE.map((height, i) => (
                        <i
                          // biome-ignore lint/suspicious/noArrayIndexKey: static list
                          key={i}
                          style={{
                            height: `${height}%`,
                            animationDelay: `${(i % 7) * 0.12}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <ul className="ld-transcript">
                    <li>
                      <span className="ld-tr" data-verdict="correct">
                        The ligand binds to a receptor on the cell surface.
                      </span>
                    </li>
                    <li>
                      <span className="ld-tr" data-verdict="vague">
                        This activates something inside the cell.
                      </span>
                    </li>
                    <li>
                      <span className="ld-tr" data-verdict="correct">
                        The signal eventually changes gene expression.
                      </span>
                    </li>
                  </ul>
                </div>
                <aside className="ld-verdict-rail" aria-label="Verdicts">
                  <p className="ld-rail-title">Your explanation</p>
                  <div data-kind="correct">
                    <strong>
                      <Check aria-hidden="true" /> Correct
                    </strong>
                    <span>Ligand binds to a cell-surface receptor.</span>
                  </div>
                  <div data-kind="vague">
                    <strong>? Vague</strong>
                    <span>Name the intracellular signaling pathway.</span>
                  </div>
                  <div data-kind="missing">
                    <strong>× Missing</strong>
                    <span>You skipped signal amplification.</span>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="ld-strip"
        aria-label="Example sessions across subjects"
      >
        <div className="ld-container">
          <p className="ld-strip-lead" data-reveal>
            It works on whatever you are studying. The grading comes from your
            own files, not a question bank.
          </p>
          <div className="ld-strip-row">
            {SUBJECT_CARDS.map((card) => (
              <article key={card.id} className="ld-subject">
                <header>
                  <span className="ld-class-code">{card.code}</span>
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.topic}</p>
                  </div>
                </header>
                <blockquote>“{card.quote}”</blockquote>
                <footer data-kind={card.verdict}>
                  <strong>{card.verdictLabel}</strong>
                  <span>{card.note}</span>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="ld-how">
        <div className="ld-container">
          <div className="ld-how-head" data-reveal>
            <h2>How it works</h2>
            <p>
              Rereading feels like knowing. Explaining from memory, with the
              page face down, shows whether the idea is actually yours.
            </p>
          </div>
          <ol className="ld-how-cols">
            {STEPS.map((step, i) => (
              <li key={step.id} data-reveal>
                <span className="ld-ghost-num" aria-hidden="true">
                  0{i + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="ld-how-note" data-reveal>
            <FileText aria-hidden="true" />
            Works with PDFs, slides, notes, and readings up to 5&nbsp;MB a file.
          </p>
        </div>
      </section>

      <section id="sources" className="ld-boundary">
        <div className="ld-container ld-boundary-grid">
          <div data-reveal>
            <h2>Your material stays in charge.</h2>
            <p>
              Turn on sources-only mode and Explainaloud will name what your
              files do not cover instead of quietly filling the gap.
            </p>
          </div>
          <div className="ld-boundary-note" data-reveal>
            <span>When the source comes back short</span>
            <p>That is the answer.</p>
            <small>No invented detail. No confident guess.</small>
          </div>
        </div>
      </section>

      <section id="partnership" className="ld-close">
        <div className="ld-container">
          <div className="ld-close-cta" data-reveal>
            <h2>Say it once. Know where to go next.</h2>
            <p>Start with the material already on your desk.</p>
            <Link href="/signup" className="ld-button ld-button-primary">
              Try it free
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div className="ld-partner" data-reveal>
            <p>Built in partnership with</p>
            <a href={YRI_URL} target="_blank" rel="noopener noreferrer">
              <Image
                src="/landing/yri-fellowship-logo-dark.png"
                width={2000}
                height={341}
                sizes="(max-width: 768px) 240px, 320px"
                alt="YRI Fellowship"
              />
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>

          <footer className="ld-footer">
            <div className="ld-footer-row">
              <span className="ld-brand ld-brand-inverse">
                <ExplainaloudMark className="ld-brand-mark" />
                <span>explainaloud</span>
              </span>
              <div>
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
              </div>
            </div>
            <p className="ld-footer-giant" aria-hidden="true">
              explainaloud
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
