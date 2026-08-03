/**
 * Rejects "do my homework" inputs.
 *
 * Explainaloud exists to make a student explain a concept and find out what they don't
 * understand. A specific problem with a specific answer is the opposite use: the
 * student gets the answer and learns nothing, and the tool becomes a homework
 * service.
 *
 * The line is *concept versus instance*. "Integration by parts", "why RuBisCO
 * fixes carbon" and "how to solve quadratic equations" are all concepts and all
 * allowed — a student can explain those back. "Evaluate the integral of 3x^2 dx
 * from 0 to 5" is one instance with one answer, and is refused.
 *
 * **Two inputs, two questions.** The topic is a *request*, so it is read for
 * intent and judged strictly. The notes are *source material*, and material is
 * not a request — a textbook chapter legitimately contains worked examples,
 * "question 7" and a page of integrals, because that is what textbooks have in
 * them. Uploading one is not asking for the answers. So material is judged on
 * whether it is *mostly* a question paper, not on whether it contains one.
 *
 * That distinction is the fix for a real failure: a student pasted ten thousand
 * words of literary criticism and had it refused, because somewhere inside it
 * the phrase "writers do this work" appeared. See `MATERIAL_*` below.
 */

/**
 * Nouns that state the intent outright, whatever the subject. Sufficient alone
 * in a topic: nobody types "my problem set" meaning to explain a concept.
 */
const HOMEWORK_NOUN =
  /\b(?:my|our|this|these|the)?\s*(?:homework|hw|assignment|problem\s*sets?|psets?|worksheets?|take[-\s]?home|graded\s+(?:quiz|test|exam)|answer\s+keys?)\b|\bdue\s+(?:today|tomorrow|tonight|by)\b/i;

/**
 * Numbering that only ever comes off a question paper. Sufficient on its own —
 * nobody asks to understand "question 7".
 */
const PAPER_NUMBERING = /\b(?:question|exercise|q)\s*#?\s*\d+\b/i;

/**
 * Asking somebody else to do the work.
 *
 * These used to sit with the nouns above, as intent stated outright, and they
 * are not: "do this" and "for me" are among the most ordinary phrases in
 * English. `writers do this work`, `professors do this by relying on memory`
 * and `this method works for me` all tripped it, and because that tier needed
 * no corroboration, one such phrase anywhere in a document refused the whole
 * upload.
 *
 * They are real signals, so they stay — but as *corroboration*, alongside an
 * imperative or a concrete expression. "Solve this for me" still refuses.
 * "Foster does this to model a discussion" no longer does.
 */
const DELEGATION = /\bdo\s+(?:my|this|these|it)\b|\bfor\s+me\b/i;

/**
 * Asking for answers, in so many words. Unlike "do this", this one does not
 * occur by accident: prose says "answers this question" or "to answer Foster",
 * not "answer these". Strong enough to stand alone in a typed topic — and it
 * still has to clear the density test in a document, so one occurrence inside
 * a chapter cannot refuse an upload.
 */
const ANSWER_REQUEST = /\banswer\s+(?:these|this|the\s+following)\b/i;

/**
 * Weaker numbering, so it needs corroboration. "Problem 10" is a question on a
 * sheet, but it is also Hilbert's tenth — a genuine topic someone might want to
 * explain.
 */
const LOOSE_NUMBERING =
  /\b(?:problem|prob)\s*#?\s*\d+\b|(?:^|\s)#\s*\d+\b|\bpart\s*\(?[a-d]\)?\s*(?:$|[).,])/i;

/** A concrete expression to be evaluated rather than a idea to be explained. */
const CONCRETE_EXPRESSION = [
  /[∫∑∏√]/, //  maths operators pasted directly
  /\bd[xyzt]\b/i, //  differentials: "dx", "dt"
  /\d\s*[+\-*/^]\s*\d/, //  "3x^2", "12 / 4"
  /=\s*-?\d/, //  "x = 5"
  /\b[a-z]\s*=\s*-?\d/i, //  "y = -3"
  /\bfrom\s+-?\d+\s+to\s+-?\d+\b/i, //  definite integral bounds
  /\(\s*-?\d+\s*,\s*-?\d+\s*\)/, //  coordinate pairs
  /\b\d+\s*(?:cm|mm|km|kg|mol|ml|litres?|liters?|joules?|newtons?|volts?|amps?|ohms?)\b/i,
];

/**
 * Imperatives that ask for an answer. Harmless on their own — "solving
 * quadratics" is a concept — so these only count alongside a concrete
 * expression, question numbering, or a request to have it done for you.
 */
const ANSWER_IMPERATIVE =
  /\b(?:solve|evaluate|compute|calculate|simplify|factor(?:ise|ize)?|integrate|differentiate|derive|prove|graph|plot|convert|round|estimate|find)\b/i;

export const HOMEWORK_MESSAGE =
  "Explainaloud is for explaining ideas, not for answering set problems. Try the concept behind the question instead. For example, “how integration by parts works” rather than a specific integral to evaluate.";

/**
 * Strict read, for a topic somebody typed.
 *
 * A topic is short and is a request, so a single clear signal is enough and a
 * false positive costs one retype.
 */
export function looksLikeHomework(value: string) {
  const text = value.trim();
  if (!text) return false;

  // Stated outright, no corroboration needed.
  if (HOMEWORK_NOUN.test(text)) return true;
  if (PAPER_NUMBERING.test(text)) return true;
  if (ANSWER_REQUEST.test(text)) return true;

  const hasExpression = CONCRETE_EXPRESSION.some((pattern) =>
    pattern.test(text),
  );
  const numbered = LOOSE_NUMBERING.test(text);
  const imperative = ANSWER_IMPERATIVE.test(text);
  const delegated = DELEGATION.test(text);

  // A bare expression is an instance whatever the wording around it, and an
  // imperative plus numbering is a question off a paper. Either alone stays
  // allowed: "find the derivative of a polynomial" is a concept, and a topic
  // that merely contains a number ("the 1918 flu") is not homework.
  if (hasExpression && (imperative || numbered || delegated)) return true;
  if (imperative && (numbered || delegated)) return true;

  return false;
}

/** Below this a paste is a question, not a document, so it is read as a topic. */
const MATERIAL_MIN_WORDS = 60;
/** Fewer trips than this in a whole document is incidental, not a pattern. */
const MATERIAL_MIN_HITS = 3;
/** And they have to be dense enough to be what the document mostly is. */
const MATERIAL_HITS_PER_1000 = 2;

/**
 * Lenient read, for uploaded or pasted material.
 *
 * The question here is not "does this contain a problem" — a chapter of any
 * textbook does — but "is this a question paper". Length is the reason the
 * strict read cannot be reused: across ten thousand words of real prose, some
 * sentence will contain an imperative near a number by chance, and precision
 * that is fine on a six-word topic collapses over a document.
 *
 * So a long paste is judged by density. A problem set trips on most of its
 * lines; a book summary trips on one in three hundred.
 */
export function materialLooksLikeHomework(value: string) {
  const text = value.trim();
  if (!text) return false;

  const words = text.split(/\s+/).length;
  // Short enough to be a pasted question rather than a document.
  if (words < MATERIAL_MIN_WORDS) return looksLikeHomework(text);

  // An answer key or a named problem set is unambiguous at any length.
  if (HOMEWORK_NOUN.test(text)) return true;

  const lines = text
    .split(/[\n.;?!]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const hits = lines.filter((line) => looksLikeHomework(line)).length;

  return (
    hits >= MATERIAL_MIN_HITS && hits / (words / 1000) >= MATERIAL_HITS_PER_1000
  );
}
