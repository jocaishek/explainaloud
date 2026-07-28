/**
 * Rejects "do my homework" inputs.
 *
 * Ropes exists to make a student explain a concept and find out what they don't
 * understand. A specific problem with a specific answer is the opposite use: the
 * student gets the answer and learns nothing, and the tool becomes a homework
 * service.
 *
 * The line is *concept versus instance*. "Integration by parts", "why RuBisCO
 * fixes carbon" and "how to solve quadratic equations" are all concepts and all
 * allowed — a student can explain those back. "Evaluate the integral of 3x^2 dx
 * from 0 to 5" is one instance with one answer, and is refused.
 */

/** Nouns that state the intent outright, whatever the subject. */
const HOMEWORK_INTENT =
  /\b(?:my|our|this|these|the)?\s*(?:homework|hw|assignment|problem\s*sets?|psets?|worksheets?|take[-\s]?home|graded\s+(?:quiz|test|exam)|answer\s+keys?)\b|\bdo\s+(?:my|this|these|it)\b|\banswer\s+(?:these|this|the\s+following)\b|\bfor\s+me\s+(?:please|now)?\b|\bdue\s+(?:today|tomorrow|tonight|by)\b/i;

/**
 * Numbering that only ever comes off a question paper. Sufficient on its own —
 * nobody asks to understand "question 7".
 */
const PAPER_NUMBERING = /\b(?:question|exercise|q)\s*#?\s*\d+\b/i;

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
 * expression or question numbering.
 */
const ANSWER_IMPERATIVE =
  /\b(?:solve|evaluate|compute|calculate|simplify|factor(?:ise|ize)?|integrate|differentiate|derive|prove|graph|plot|convert|round|estimate|find)\b/i;

export const HOMEWORK_MESSAGE =
  "Ropes is for explaining ideas, not for answering set problems. Try the concept behind the question instead — for example, “how integration by parts works” rather than a specific integral to evaluate.";

export function looksLikeHomework(value: string) {
  const text = value.trim();
  if (!text) return false;

  // Stated outright, no corroboration needed.
  if (HOMEWORK_INTENT.test(text)) return true;
  if (PAPER_NUMBERING.test(text)) return true;

  const hasExpression = CONCRETE_EXPRESSION.some((pattern) =>
    pattern.test(text),
  );
  const numbered = LOOSE_NUMBERING.test(text);
  const imperative = ANSWER_IMPERATIVE.test(text);

  // A bare expression is an instance whatever the wording around it, and an
  // imperative plus numbering is a question off a paper. Either alone stays
  // allowed: "find the derivative of a polynomial" is a concept, and a topic
  // that merely contains a number ("the 1918 flu") is not homework.
  if (hasExpression && (imperative || numbered)) return true;
  if (imperative && numbered) return true;

  return false;
}
