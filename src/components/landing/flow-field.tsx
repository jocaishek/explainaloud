"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's ground: water, simulated rather than drawn.
 *
 * Three backdrops were tried behind this headline before this one and all
 * three failed the same way. A night-shore photograph got the question "why is
 * there an ocean on a rehearsal tool", which is fair, because a photograph is
 * a *place* and a place has to be about something. An abstract still got "it
 * looks AI", also fair, because a large soft blue gradient is exactly what an
 * image model returns for "abstract blue background". Both failed because the
 * field was a picture: fixed, flat, finished before the page loaded.
 *
 * ## The cursor, and why the first three attempts at it were ugly
 *
 * This is the part that took four goes, so the dead ends are worth recording
 * because each one is a plausible idea that produces something visibly wrong.
 *
 * 1. **A radial pull at the cursor.** A falloff around a single point is a
 *    disc by definition, so however it was tuned it read as a circle sliding
 *    around under the picture.
 * 2. **A trail of point samples, each pushed along its heading.** Better in
 *    principle, still discrete: eight samples is eight blobs, and a pointer
 *    moving slowly stacks them on top of each other. Concentric rings. A
 *    bullseye sitting on the page.
 * 3. **Same, with the radial term removed and a shear added.** No longer a
 *    bullseye, still eight lumps, because the underlying representation was
 *    still eight independent points. Nothing continuous can be built out of
 *    a handful of discrete stamps.
 *
 * The mistake common to all three is that they described the disturbance as a
 * *shape computed from where the pointer is*. Water does not work like that.
 * A disturbance in water is a quantity that exists in the water, gets carried
 * along by the current, spreads, and fades. It has history. It keeps moving
 * after the hand has stopped, and it moves along the flow rather than staying
 * where it was put.
 *
 * So this version stores it. There is a second, low-resolution buffer holding
 * "how disturbed is the water here", and every frame it is:
 *
 * - **advected** — each pixel reads from where its water came from a moment
 *   ago, which is what carries the wake downstream and is the single thing
 *   that makes it flow rather than sit,
 * - **injected** along the *segment* the pointer travelled this frame, not at
 *   the point it landed, so a fast flick leaves a continuous stroke instead of
 *   a dotted line,
 * - **spread** slightly into its neighbours, so the stroke softens the way a
 *   real one does,
 * - **decayed**, so it dies out over a couple of seconds.
 *
 * That buffer then refracts the caustics in the visible pass. Because it is a
 * field rather than a formula, it can hold a shape the cursor is no longer
 * anywhere near, which is exactly what "it should flow" means.
 *
 * ## What is being drawn
 *
 * Deep water: a slow body of light turning over underneath, and a fast sharp
 * net of caustics riding on top of it. Caustics are the thin bright veins
 * light makes when it is focused through a rippled surface, and they are what
 * separates water from marble: in marble the light sits in broad areas, in
 * water it lives in lines.
 *
 * ## What it costs
 *
 * The simulation runs at a quarter of the canvas on each axis, so a sixteenth
 * of the pixels, and it is three texture reads and some arithmetic. The
 * visible pass is one fullscreen quad. Both stop entirely when the hero is off
 * screen or the tab is hidden, which is most of a session. No library: this is
 * WebGL 1 against three.js's 150KB.
 *
 * ## When it does not run
 *
 * Reduced motion, no WebGL, a failed compile or a lost context all leave the
 * canvas empty and the CSS field underneath shows through. That fallback is a
 * real composition rather than a blank rectangle, which is what makes it safe
 * to ship something this conditional behind the one headline that has to work
 * everywhere.
 */

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

/* Shared by both passes: value noise and the fractal sum of it. */
const NOISE = `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

/* Three octaves, not five.
   This is the hottest function on the page by a wide margin: the visible pass
   calls it seven times per pixel and the curl in the sim calls it four times
   more. At five octaves and full retina resolution that measured 53fps on a
   fast laptop, which means a bad time on anything else.

   Octaves four and five add detail at a scale finer than the blur, the
   dither and the caustic power curve, so the field was paying to generate
   frequencies it immediately destroyed. Removing them is not a quality
   trade; it is deleting work that had no output. */
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

/* The direction the water is moving at a point.
 *
 * Curl of a noise field, which is divergence free: the flow circulates instead
 * of piling up in sinks, so an advected quantity keeps travelling rather than
 * collecting in a few spots and staining them. Both passes call this, and they
 * must agree exactly, or the wake drifts in a direction the caustics are not
 * moving and the whole thing comes apart. */
vec2 flowAt(vec2 p, float t) {
  float e = 0.06;
  float n1 = fbm(p + vec2(0.0, e) + vec2(0.0, t * 0.05));
  float n2 = fbm(p - vec2(0.0, e) + vec2(0.0, t * 0.05));
  float n3 = fbm(p + vec2(e, 0.0) + vec2(0.0, t * 0.05));
  float n4 = fbm(p - vec2(e, 0.0) + vec2(0.0, t * 0.05));
  return vec2(n1 - n2, n4 - n3) / (2.0 * e);
}
`;

/**
 * The simulation pass. Renders the disturbance field into a texture.
 *
 * Everything here is one channel of a low-resolution buffer holding a single
 * number per pixel: how disturbed this bit of water is.
 */
const SIM_FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform sampler2D u_prev;
uniform float u_time;
uniform float u_dt;
/* The segment the pointer covered this frame: xy is where it started, zw
   where it ended. A segment and not a point, because injecting at the landing
   position alone leaves a dotted line whenever the pointer moves further in
   one frame than the brush is wide. */
uniform vec4 u_seg;
uniform float u_strength;
${NOISE}

/* Distance from a point to a line segment. The capsule this produces is what
   makes a fast flick a continuous stroke. */
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  /* Advection. Read from where this water came from, not from here: step
     backwards along the flow and sample the previous frame there. This one
     line is the difference between a wake that travels and a stain that sits
     where it was painted. */
  vec2 vel = flowAt(p * 1.5, u_time) * 0.22;

  /* The wake does NOT steer its own advection.
     A term here fed the disturbance's own gradient back into the velocity, on
     the reasoning that a hand should stir the water it is in. It is positive
     feedback: a steeper wake makes a faster flow, which piles the wake up
     steeper still. Byte textures hid it by clamping every intermediate value;
     on the half-float buffer there is no such floor and it ran away within a
     second or two of a stroke, which is what "glitching" was.

     The circulation is done in the visible pass instead, where it is read-only
     and cannot compound. */

  vec2 back = uv - vel * u_dt;
  float prev = texture2D(u_prev, back).r;

  /* Spread, as a cheap four-tap blur. Real diffusion would be an iterative
     solve; at this resolution, over a field this soft, one blur per frame
     accumulates into the same thing and costs four reads. */
  vec2 px = 1.5 / u_res;
  float blur =
    texture2D(u_prev, back + vec2(px.x, 0.0)).r +
    texture2D(u_prev, back - vec2(px.x, 0.0)).r +
    texture2D(u_prev, back + vec2(0.0, px.y)).r +
    texture2D(u_prev, back - vec2(0.0, px.y)).r;
  prev = mix(prev, blur * 0.25, 0.26);

  /* Decay. About two seconds from a full stroke to nothing, which is long
     enough that the tail is still visible while the head is being drawn. */
  prev *= 0.976;

  /* Injection along this frame's segment. */
  vec2 a = vec2(u_seg.x * aspect, u_seg.y);
  vec2 b = vec2(u_seg.z * aspect, u_seg.w);
  float d = segDist(p, a, b);
  float brush = smoothstep(0.17, 0.0, d) * u_strength;

  gl_FragColor = vec4(clamp(prev + brush, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`;

/** The visible pass. */
const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform sampler2D u_sim;
${NOISE}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = u_time * 0.085;

  /* The disturbance, and its slope.
     The slope is what actually bends the light: a flat disturbance refracts
     nothing, and it is the *edges* of the wake that distort what is behind
     them. Taking the gradient means the effect is strongest along the sides of
     the stroke and vanishes in its middle, which is how a real disturbance in
     water reads. */
  /* Three texels apart, not one. A one-texel difference is the noisiest
     possible estimate of a direction: it swings with every ripple in the
     buffer, and since it steers a displacement that noise becomes visible
     jitter. A wider stencil is a low-pass filter for free. */
  vec2 px = 3.0 / u_res;
  float wake = texture2D(u_sim, uv).r;
  float wx =
    texture2D(u_sim, uv + vec2(px.x, 0.0)).r -
    texture2D(u_sim, uv - vec2(px.x, 0.0)).r;
  float wy =
    texture2D(u_sim, uv + vec2(0.0, px.y)).r -
    texture2D(u_sim, uv - vec2(0.0, px.y)).r;
  vec2 slope = vec2(wx, wy);

  /* The water flows around the hand.
     Four earlier versions pushed the domain *away* from the disturbance, and
     every one of them looked like a disc sliding under the picture. The fifth
     gave up and only brightened what was already there, which was honest and
     lifeless: a hand in water does displace it.

     The error in all four was the direction. Pushing radially outward is what
     an expanding balloon does, and a balloon is a circle however it is tuned.
     Water moving past an obstacle goes *around* it — the flow is tangential to
     the disturbance, not normal to it. Rotating the gradient ninety degrees is
     the whole fix: perp is the direction along the contour of the wake
     rather than across it, so the field circulates around the stroke instead
     of being shoved out of it. That circulation cannot form a disc, because it
     never points away from a centre.

     A little radial is kept on top, because a hand does part the water in
     front of it. It is a fifth of the tangential term; any more and the disc
     comes back. */
  vec2 perp = vec2(-slope.y, slope.x);

  /* Gently. The displacement was three times this and it aliased the field
     into dust: moving the sample point a long way between one pixel and its
     neighbour means the noise underneath is read at unrelated coordinates, so
     a smooth caustic line breaks into a scatter of unrelated bright dots. The
     circulation reads just as clearly at a third of the strength, and the
     water stays water. */
  /* Bounded, not scaled.
     Multiplying a gradient by a constant means the displacement is only ever
     as well behaved as the steepest part of the wake, and one sharp stroke is
     enough to push neighbouring pixels far enough apart to alias. Capping the
     magnitude makes that impossible by construction: however steep the field
     gets, the sample point moves at most this far, so the picture can bend but
     it can never shatter. Direction still comes entirely from the field, so
     the circulation is unchanged where the wake is gentle. */
  vec2 push = perp * 2.4 + slope * 0.45;
  float amount = length(push);
  /* A soft limit, not a hard one.
     if (amount > MAX) push *= MAX / amount bounds the magnitude correctly
     and is not differentiable at the threshold: every pixel where it just
     engages sits beside one where it just does not, so the picture creases
     along that boundary. Under a heavy stroke those creases cover the frame
     and the water turns into crumpled foil, which is exactly what it did.

     MAX / (MAX + amount) is the same bound reached smoothly — it leaves
     small pushes almost untouched, approaches MAX asymptotically, and has no
     threshold anywhere to crease along. */
  push *= 0.17 / (0.17 + amount);
  p += push;
  vec2 q = vec2(fbm(p * 1.6 + vec2(0.0, t)), fbm(p * 1.6 + vec2(5.2, -t * 0.8)));
  vec2 r = vec2(
    fbm(p * 1.9 + 4.0 * q + vec2(1.7, 9.2) + t * 0.6),
    fbm(p * 1.9 + 4.0 * q + vec2(8.3, 2.8) - t * 0.5)
  );
  /* 1.7, not 2.3. The higher frequency bought more caustic lines and put the
     field close to one cycle per pixel, where any displacement at all turns
     into aliasing rather than motion. Density comes from the contour count
     below instead, which costs nothing and cannot alias. */
  float f = fbm(p * 1.7 + 2.6 * r);

  /* ── The water. It is the background, all of it, all the time.
     A previous revision gated the caustics behind the cursor so the resting
     hero was silk and the water only appeared where the pointer had been.
     That was a misreading: the background is meant to *be* water and to flow
     on its own, and a hero that is only interesting once you touch it is a
     hero that most readers never see working. The cursor brightens this; it
     is not the source of it. */

  /* The slow body of light turning over under the surface, which is what
     gives the field its large shapes and its sense of a mass of water rather
     than a flat plane with lines on it. */
  float silk = pow(abs(sin(f * 3.14159 * 1.6 + t * 1.2)), 2.4);

  /* Caustics: the thin bright veins light makes when it is focused through a
     rippled surface. They are the single most water-specific thing a shader
     can draw, and they are what separates water from marble. In marble the
     light sits in broad areas; in water it lives in lines.

     Found, not drawn. abs(f - 0.5) is zero exactly where the warped field
     crosses its own midline, so raising its inverse to a high power leaves a
     thin line along a contour that was already there, and the contour drifts
     because f is a function of time. Two sets read off the same sample at
     different offsets, so they cross the way a surface carrying more than one
     wavelength does. */
  /* Broad, not thin.
     These exponents were 8, 10 and 13, and a high power on a contour is what
     makes a *filament*: a hairline of white on near-black, branching, which
     the eye reads as an electrical arc rather than as light in water. Real
     caustics are wide, soft-edged and overlapping — they are the bright parts
     of a continuous surface, not lines drawn on a dark one. Roughly halving
     each exponent widens them into that. */
  float veinA = pow(clamp(1.0 - abs(f - 0.44) * 2.0, 0.0, 1.0), 4.0);
  float veinB = pow(clamp(1.0 - abs(f - 0.58) * 2.2, 0.0, 1.0), 6.0);
  float veinC = pow(clamp(1.0 - abs(f - 0.70) * 2.4, 0.0, 1.0), 8.0);

  vec3 deep = vec3(0.015, 0.04, 0.093);
  vec3 mid  = vec3(0.062, 0.142, 0.272);
  vec3 lit  = vec3(0.220, 0.450, 0.740);
  vec3 hot  = vec3(0.640, 0.820, 0.980);

  /* Depth first. Darker further down, which is what makes everything drawn on
     top of it read as being in something rather than on a flat colour. */
  vec3 col = mix(deep, mid, smoothstep(0.0, 0.95, uv.y));
  col = mix(col, lit, silk * 0.44);
  col += hot * pow(silk, 6.0) * 0.10;
  col += lit * smoothstep(0.22, 0.9, f) * 0.3;

  /* ── The hand, as light rather than geometry.
     wake is how disturbed this water is, and slope is how sharply that
     changes, which is strongest along the sides of a stroke and near zero
     down its middle. Both are spent brightening the veins that already exist
     instead of displacing anything, which is why this cannot produce a disc
     or a ring however hard it is pushed: there are no circles in the field to
     light up. Four earlier versions displaced geometry and all four looked
     invented, because an invented shape never matches the shapes the water
     already has.

     The buffer behind it is advected, so the brightened region keeps
     travelling downstream after the hand has gone, then fades. */
  float edge = length(slope) * 13.0;
  float glow = 1.0 + clamp(wake * 1.15 + edge * 0.45, 0.0, 1.6);

  col += lit * veinA * 0.4 * glow;
  col += lit * veinB * 0.3 * glow;
  col += hot * veinC * 0.16 * glow;
  col += hot * edge * 0.015;
  col += lit * wake * 0.05;

  /* Scaled by aspect, because "the left third" is only a place on a wide
     screen. On a phone the headline is centred over the full width, so the
     same falloff darkens the entire frame and the field disappears. */
  float wide = smoothstep(1.15, 1.7, aspect);
  col *= 1.0 - 0.42 * wide * smoothstep(0.58, 0.0, uv.x);

  /* An overall hold-down, because every headline has to stay readable over
     whatever frame of this the reader lands on. */
  col *= 0.82;

  /* Ordered dither. A dark blue ramp across two thousand pixels is about four
     pixels per eight-bit step, inside the range where contour rings show, and
     a moving field makes them crawl, which is worse than seeing them. One per
     cent of noise is under the threshold of visible grain and over the
     threshold that breaks the rings. */
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    /* Say something. A shader that fails to compile takes the same silent path
       as one that was never wanted, so without this the only symptom is a
       canvas that stays at its default size and never paints. Two separate
       bugs hid here before this line existed. */
    console.warn(
      "FlowField: shader did not compile",
      gl.getShaderInfoLog(shader),
    );
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function link(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
) {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("FlowField: did not link", gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

/** One half of the ping-pong pair. */
type Target = {
  texture: WebGLTexture;
  buffer: WebGLFramebuffer;
};

function makeTarget(
  gl: WebGLRenderingContext,
  width: number,
  height: number,
  type: number,
): Target | null {
  const texture = gl.createTexture();
  const buffer = gl.createFramebuffer();
  if (!texture || !buffer) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    type,
    null,
  );
  /* LINEAR, because advection samples between texels every single frame and
     NEAREST would quantise the wake onto the simulation grid, which shows up
     as stair-stepped edges on the stroke.

     CLAMP_TO_EDGE on both axes, or the flow carries the wake off one side of
     the screen and it reappears on the other. */
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  /* Renderable is a different question from sampleable, and the extensions
     only answer the second one. Plenty of devices advertise half-float
     textures and then refuse to draw into them, which shows up not as an error
     but as a framebuffer that is never complete and a canvas that never
     paints. Ask, and let the caller fall back. */
  const complete =
    gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!complete) {
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(buffer);
    return null;
  }
  return { texture, buffer };
}

export function FlowField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* Read the preference here rather than through `useReducedMotion`, so the
       WebGL context is never created at all for somebody who has asked not to
       be moved. A hook would only stop the animation after paying for it. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* A context that was previously lost stays lost until it is restored, and
       `getContext` hands back the same object rather than a fresh one, so
       without this a canvas that has been through one teardown can never draw
       again. */
    const existing = canvas.getContext("webgl");
    if (existing?.isContextLost()) {
      existing.getExtension("WEBGL_lose_context")?.restoreContext();
    }

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const simProgram = link(gl, VERTEX, SIM_FRAGMENT);
    const drawProgram = link(gl, VERTEX, FRAGMENT);
    if (!simProgram || !drawProgram) return;

    // Two triangles covering clip space. Nothing else is ever drawn.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    for (const program of [simProgram, drawProgram]) {
      const position = gl.getAttribLocation(program, "a_pos");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    }

    const simU = {
      res: gl.getUniformLocation(simProgram, "u_res"),
      prev: gl.getUniformLocation(simProgram, "u_prev"),
      time: gl.getUniformLocation(simProgram, "u_time"),
      dt: gl.getUniformLocation(simProgram, "u_dt"),
      seg: gl.getUniformLocation(simProgram, "u_seg"),
      strength: gl.getUniformLocation(simProgram, "u_strength"),
    };
    const drawU = {
      res: gl.getUniformLocation(drawProgram, "u_res"),
      time: gl.getUniformLocation(drawProgram, "u_time"),
      sim: gl.getUniformLocation(drawProgram, "u_sim"),
    };

    /* The simulation runs at a quarter of the canvas on each axis. The
       disturbance is a soft, low-frequency field with no detail in it, so the
       extra pixels a full-resolution sim would buy are spent representing
       nothing, and the blur it is put through would throw them away anyway. */
    /* A quarter of the canvas on each axis, not a sixteenth.
       The visible pass reads this buffer's *gradient* to bend the caustics,
       and a gradient magnifies whatever quantisation is in its source: at 1/4
       on each axis the wake had visible stair steps in it, which is what
       "pixelated" was. Halving the step is four times the sim pixels, and the
       sim is the cheap pass — three texture reads and some arithmetic against
       the visible pass's seven fractal-noise evaluations per pixel. */
    const SIM_SCALE = 2;

    /* A float buffer if the device has one.
       The disturbance is stored in a texture and the visible pass reads its
       *gradient*, which magnifies whatever quantisation is in the source. In
       eight bits a neighbouring pair can differ by no less than 1/255, so the
       gradient of a smooth field comes out as a field of hard speckle —
       visible as a scatter of bright dots through the wake, which looked like
       dirt rather than water.

       Half float has no such floor, so the gradient is as smooth as the field.
       It is an extension rather than a guarantee, and the linear *filtering*
       of a float texture is a second extension on top: advection samples
       between texels every frame, so without it the wake would stair-step on
       the sim grid instead. Both are checked, and a device with neither falls
       back to bytes and a slightly speckled wake rather than to nothing. */
    const halfFloat = gl.getExtension("OES_texture_half_float");
    const canFilter = gl.getExtension("OES_texture_half_float_linear");
    const texType =
      halfFloat && canFilter
        ? (halfFloat.HALF_FLOAT_OES as number)
        : gl.UNSIGNED_BYTE;
    let targets: [Target, Target] | null = null;
    let simWidth = 0;
    let simHeight = 0;

    const disposeTargets = () => {
      if (!targets) return;
      for (const target of targets) {
        gl.deleteTexture(target.texture);
        gl.deleteFramebuffer(target.buffer);
      }
      targets = null;
    };

    /* 1.5, not `devicePixelRatio`. This is a field of soft gradients with no
       edge in it anywhere, so the pixels a retina ratio buys are spent on
       detail the image does not contain: at 3x it is four times the fragment
       work for a difference nobody can point to. */
    const resize = () => {
      /* Below one CSS pixel per pixel, deliberately.
         The cap used to be 1.5 device pixels, which on a retina screen is
         three million fragments of a shader whose cheapest useful frame is
         still seven noise evaluations deep. There is no edge anywhere in this
         image: it is entirely soft gradients, so the GPU's bilinear upscale
         is indistinguishable from rendering it at full size, and it costs a
         quarter as much. This is the difference between a background and a
         hot laptop. */
      const ratio = Math.min(window.devicePixelRatio || 1, 1) * 0.9;
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width === width && canvas.height === height && targets) return;
      canvas.width = width;
      canvas.height = height;

      disposeTargets();
      simWidth = Math.max(1, Math.round(width / SIM_SCALE));
      simHeight = Math.max(1, Math.round(height / SIM_SCALE));
      /* Try the good buffer, take the plain one if the device will not draw
         into it. A speckled wake is a much better outcome than no field. */
      let a = makeTarget(gl, simWidth, simHeight, texType);
      let b = makeTarget(gl, simWidth, simHeight, texType);
      if ((!a || !b) && texType !== gl.UNSIGNED_BYTE) {
        if (a) {
          gl.deleteTexture(a.texture);
          gl.deleteFramebuffer(a.buffer);
        }
        if (b) {
          gl.deleteTexture(b.texture);
          gl.deleteFramebuffer(b.buffer);
        }
        a = makeTarget(gl, simWidth, simHeight, gl.UNSIGNED_BYTE);
        b = makeTarget(gl, simWidth, simHeight, gl.UNSIGNED_BYTE);
      }
      if (a && b) targets = [a, b];
    };
    resize();

    let frame = 0;
    let visible = true;
    let start = performance.now();
    let elapsed = 0;
    let lastFrame = performance.now();

    /* The pointer, as the segment it covered since the last frame.
       `from` is where it was when the last frame drew and `to` is where it is
       now, so the injection is a stroke rather than a dot and a fast flick
       cannot outrun it. */
    const seg = { fromX: 0.5, fromY: 0.5, toX: 0.5, toY: 0.5 };
    let strength = 0;
    let pending = false;

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      /* Flipped, because `gl_FragCoord` counts up from the bottom and clientY
         counts down from the top. Without this the wake runs the wrong way on
         the vertical axis, which reads as a bug nobody can quite name. */
      const y = 1 - (event.clientY - rect.top) / rect.height;

      if (!pending) {
        seg.fromX = x;
        seg.fromY = y;
      }
      seg.toX = x;
      seg.toY = y;
      pending = true;
    };
    /* On `window`, not on the canvas. The canvas sits under the scrim, the
       headline and the buttons, so pointer events over most of the hero never
       reach it and the field would go dead exactly where the reader is most
       likely to be moving. */
    window.addEventListener("pointermove", onPointer, { passive: true });

    const drawQuad = () => gl.drawArrays(gl.TRIANGLES, 0, 3);
    /* Bound to a local name, because the rules-of-hooks lint matches on any
       callee beginning with `use` and reads `gl.useProgram` as a React hook
       called conditionally. A suppression comment is reported as unused here
       while the rule still fires, so the call is renamed instead. This is the
       WebGL call that binds a linked program; there is no hook involved. */
    const bindProgram = gl.useProgram.bind(gl);

    const draw = (now: number) => {
      resize();
      if (!targets) {
        frame = requestAnimationFrame(draw);
        return;
      }

      /* Clamped. A tab that was throttled hands back a delta of several
         seconds, and advecting by that in one step throws the whole field off
         the screen; the wake would visibly jump on every return to the page. */
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      elapsed = (now - start) / 1000;

      const moved = Math.hypot(seg.toX - seg.fromX, seg.toY - seg.fromY);
      /* Speed sets how hard the stroke is laid down, so a slow drag leaves a
         faint trace and a fast one leaves a strong one. Without the floor, a
         pointer that stops mid-gesture stops writing entirely and the stroke
         ends abruptly instead of tapering. */
      /* Capped well below saturation. A pointer moving continuously wrote
         faster than the field could decay, so the wake filled the whole frame
         and every part of it had a ridge in it — the picture stopped being
         water with a stroke through it and became one uniform disturbance. */
      strength = pending ? Math.min(1, 0.3 + moved * 12) * 0.38 : 0;

      // ── Simulation, into the back buffer.
      const [front, back] = targets;
      bindProgram(simProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, back.buffer);
      gl.viewport(0, 0, simWidth, simHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, front.texture);
      gl.uniform1i(simU.prev, 0);
      gl.uniform2f(simU.res, simWidth, simHeight);
      gl.uniform1f(simU.time, elapsed);
      gl.uniform1f(simU.dt, dt * 60);
      gl.uniform4f(simU.seg, seg.fromX, seg.fromY, seg.toX, seg.toY);
      gl.uniform1f(simU.strength, strength);
      drawQuad();

      // The stroke has been laid down; the next one starts where this ended.
      seg.fromX = seg.toX;
      seg.fromY = seg.toY;
      pending = false;

      // ── Visible pass, reading the buffer just written.
      bindProgram(drawProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, back.texture);
      gl.uniform1i(drawU.sim, 0);
      gl.uniform2f(drawU.res, canvas.width, canvas.height);
      gl.uniform1f(drawU.time, elapsed);
      drawQuad();

      // Swap, so the frame just written becomes the history the next one reads.
      targets = [back, front];

      frame = requestAnimationFrame(draw);
    };

    /* It only runs while it is being looked at. The hero is one screen of a
       long page, so this is off for most of a visit, and a fullscreen fragment
       shader running behind content nobody can see is the difference between a
       background and a battery complaint. `start` and `lastFrame` are rebased
       on resume so the field picks up where it left off instead of jumping. */
    const run = () => {
      if (frame || !visible) return;
      start = performance.now() - elapsed * 1000;
      lastFrame = performance.now();
      frame = requestAnimationFrame(draw);
    };
    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) run();
        else stop();
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stop();
      else run();
    };
    document.addEventListener("visibilitychange", onVisibility);

    /* A lost context is not rare on a laptop that sleeps, and the default
       behaviour is that the canvas goes black, which behind white headline
       type is unreadable rather than merely wrong. Preventing the default lets
       the browser restore it; until it does, the canvas is hidden so the CSS
       field below shows through instead. */
    const onLost = (event: Event) => {
      event.preventDefault();
      stop();
      canvas.style.opacity = "0";
    };
    const onRestored = () => {
      canvas.style.opacity = "";
      run();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    run();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      /* Delete what was allocated. Deliberately *not*
         `WEBGL_lose_context.loseContext()`, which is what used to be here and
         was a real bug rather than tidiness: a canvas has one WebGL context
         for its lifetime and `getContext` returns that same object every
         time, so force-losing it in cleanup permanently poisons the element.
         React runs an effect's cleanup and then the effect again on a
         remount, and on a client side navigation back to this page the second
         run received a context that the first run had destroyed. It compiled
         nothing, drew nothing, and the hero came back with no water in it.
         Measured `isContextLost() === true` on the returning page.

         Freeing the resources is enough. The context goes when the canvas is
         garbage collected, which is exactly when it should. */
      disposeTargets();
      gl.deleteProgram(simProgram);
      gl.deleteProgram(drawProgram);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <div aria-hidden="true" className={className}>
      <canvas
        ref={canvasRef}
        /* `block`, or the canvas sits on the text baseline and leaves a strip
           of the parent showing along the bottom edge. */
        className="block h-full w-full"
      />
    </div>
  );
}
