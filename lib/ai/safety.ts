import anoLines from "@/content/ano-lines.json";

/*
 * Ask Ano's safety rule (CLAUDE.md §5 "Ask Ano safety"): Ano explains the
 * science on screen. A question about the student's own health, or the
 * health of someone they know, gets a warm redirect to a trusted adult or
 * doctor, with no medical information, prediction or survival talk, and it
 * never reaches the model. Checked before anything else, so it works with
 * no key, over a limit or with the provider down.
 */

const PEOPLE = "(mum|mom|mommy|mummy|mother|dad|daddy|father|parent|parents|nan|nana|nanna|gran|granny|grandma|grandmother|grandpa|grandad|granddad|grandfather|grandparent|sister|brother|sibling|aunt|auntie|uncle|cousin|friend|teacher|family|wife|husband|son|daughter|baby|neighbou?r)";

const PERSONAL: RegExp[] = [
  // "my mum has cancer", "will my dad be okay", "is my friend going to die"
  new RegExp(`\\b(my|our)\\s+(best\\s+)?${PEOPLE}\\b`, "i"),
  // "do I have cancer", "could I have", "am I going to get", "will I get"
  /\b(do|could|might|can|will|would)\s+i\s+(have|get|catch|develop)\b/i,
  /\bam\s+i\s+(sick|ill|dying|going to (die|get|be))\b/i,
  /\b(i|i've|i have|i'?m)\s+(got|have|found|feel|noticed|feeling)\s+(a\s+)?(lump|bump|pain|mole|spot|rash|cancer|tumou?r|sick|ill)\b/i,
  /\bmy\s+(lump|mole|pain|skin|hair|body|symptoms?|results?|scan|diagnosis|treatment|chemo)\b/i,
  // "Will she be okay?", "is he going to die?": about a person, not the cells on screen.
  /\b(will|is|are|am|was)\s+(i|he|she|they|we|you)\b.*\b(be (ok|okay|alright|all right|fine)|die|dying|survive|get better)\b/i,
  // Survival and prognosis are never Ano's to answer, whoever they're about.
  /\b(survive|survival|surviving|life expectancy|how long (do|does|will) .* (live|have left)|going to die|gonna die)\b/i,
  /\b(prognosis|terminal|cure me|treat me|should i (worry|see|take|stop|get))\b/i,
];

/** True when a question is about someone's own health rather than the science on screen. */
export function isPersonalHealthQuestion(question: string): boolean {
  return PERSONAL.some((re) => re.test(question));
}

/** Ano's warm redirect, varied by a seed so repeated questions don't read the same. */
export function healthRedirect(seed = 0): string {
  const lines = anoLines.healthRedirect;
  return lines[Math.abs(seed) % lines.length];
}
