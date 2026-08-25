/**
 * Bangla verb paradigms.
 *
 * ⚠ Same provenance caveat as the rest of the course: drafted, not yet
 * checked by a native speaker. Conjugation is the single most likely place
 * for an LLM to be subtly wrong — person and politeness agreement is
 * exactly where drafting drifts — so these rows go into the review export
 * alongside everything else, and a reviewer checking a paradigm once is
 * far more useful than them checking five scattered vocabulary rows.
 *
 * Forms reference lexemes by romanization; the build fails loudly if a
 * referenced form is not in the course, so this file cannot silently
 * drift out of sync with source.ts.
 *
 * Only forms the course actually teaches are listed. These are not full
 * paradigms — Bangla has more persons and tenses than appear here — and
 * the gaps are honest rather than an oversight.
 */

import type { Person, TenseAspect } from '../../src/lib/content/schema.ts';

/**
 * [romanization, person (null for non-finite), tense, flags?]
 *
 * flags: 'irregular' when the form breaks the stem's pattern,
 *        'negative'  when it is a suppletive negative.
 */
export type FormFlag = 'irregular' | 'negative';
export type FormRow = [string, Person | null, TenseAspect, FormFlag?];

export interface VerbSpec {
  form: string;
  roman: string;
  gloss: string;
  stem: string;
  forms: FormRow[];
  note?: string;
}

export const VERBS: VerbSpec[] = [
  {
    form: 'করা', roman: 'kora', gloss: 'to do', stem: 'kor',
    forms: [
      ['kori', '1', 'present'],
      ['kore', '3', 'present'],
      ['koren', '2pol', 'present'],
      ['korchhi', '1', 'present-cont'],
      ['korte', null, 'infinitive'],
      ['korben', '2pol', 'future'],
      ['korun', '2pol', 'imperative']
    ],
    note: 'The workhorse verb. Pairs with a noun to make hundreds of expressions — কাজ করা (to work), চেষ্টা করা (to try).'
  },
  {
    form: 'আসা', roman: 'asha', gloss: 'to come', stem: 'ash',
    forms: [
      ['ashi', '1', 'present'],
      ['asho', '2fam', 'present'],
      ['ashe', '3', 'present'],
      ['ashbo', '1', 'future'],
      ['ashbe', '3', 'future'],
      ['eshechhi', '1', 'present-perfect', 'irregular'],
      ['eshechhen', '2pol', 'present-perfect', 'irregular']
    ],
    note: 'The perfect switches the vowel: আসা but এসেছি, not *আসেছি.'
  },
  {
    form: 'যাওয়া', roman: 'jaoya', gloss: 'to go', stem: 'ja',
    forms: [
      ['jai', '1', 'present'],
      ['jao', '2fam', 'present'],
      ['jay', '3', 'present'],
      ['jabo', '1', 'future'],
      ['jachchhi', '1', 'present-cont'],
      ['gechhi', '1', 'present-perfect', 'irregular']
    ],
    note: 'The perfect uses a completely different stem — গেছি, not *যাছি. Same idea as English go/went.'
  },
  {
    form: 'বলা', roman: 'bola', gloss: 'to say', stem: 'bol',
    forms: [
      ['boli', '1', 'present'],
      ['bole', '3', 'present'],
      ['bolte', null, 'infinitive'],
      ['bollo', '3', 'past'],
      ['bolun', '2pol', 'imperative'],
      ['bolar', null, 'verbal-noun']
    ]
  },
  {
    form: 'থাকা', roman: 'thaka', gloss: 'to stay, to live', stem: 'thak',
    forms: [
      ['thaki', '1', 'present'],
      ['thako', '2fam', 'present'],
      ['thake', '3', 'present'],
      ['thakben', '2pol', 'future']
    ]
  },
  {
    form: 'আছ-', roman: 'achh', gloss: 'to be, to exist', stem: 'achh',
    forms: [
      ['achhi', '1', 'present'],
      ['achho', '2fam', 'present'],
      ['achhe', '3', 'present'],
      ['achhen', '2pol', 'present'],
      ['nei', '3', 'present', 'negative']
    ],
    note: 'Defective — it only exists in the present. Its negative is suppletive: নেই, never *আছে না. For location and possession, not for identity: এটা আমার বই needs no verb at all.'
  },
  {
    form: 'খাওয়া', roman: 'khaoya', gloss: 'to eat, to drink', stem: 'kha',
    forms: [
      ['khai', '1', 'present'],
      ['khay', '3', 'present'],
      ['khabe', '2fam', 'future']
    ],
    note: 'Covers drinking too — চা খাই is "I drink tea", not "I eat tea".'
  },
  {
    form: 'দেখা', roman: 'dekha', gloss: 'to see, to watch', stem: 'dekh',
    forms: [['dekhi', '1', 'present'], ['dekhe', '3', 'present']]
  },
  {
    form: 'শোনা', roman: 'shona', gloss: 'to hear, to listen', stem: 'shun',
    forms: [['shuni', '1', 'present'], ['shone', '3', 'present']],
    note: 'Vowel alternation: শুনি with u, শোনে with o. Regular for this verb class.'
  },
  {
    form: 'লেখা', roman: 'lekha', gloss: 'to write', stem: 'likh',
    forms: [['likhi', '1', 'present'], ['lekhe', '3', 'present']],
    note: 'Same u/o-style alternation as শোনা: লিখি but লেখে.'
  },
  {
    form: 'কেনা', roman: 'kena', gloss: 'to buy', stem: 'kin',
    forms: [['kini', '1', 'present'], ['kene', '3', 'present']],
    note: 'Alternates like লেখা: কিনি but কেনে.'
  },
  {
    form: 'বসা', roman: 'bosha', gloss: 'to sit', stem: 'bosh',
    forms: [['boshi', '1', 'present'], ['boshe', '3', 'present']]
  },
  {
    form: 'ঘুমানো', roman: 'ghumano', gloss: 'to sleep', stem: 'ghuma',
    forms: [['ghumai', '1', 'present'], ['ghumay', '3', 'present']]
  },
  {
    form: 'খেলা', roman: 'khela', gloss: 'to play', stem: 'khel',
    forms: [['kheli', '1', 'present'], ['khele', '3', 'present']]
  },
  {
    form: 'দেওয়া', roman: 'deoya', gloss: 'to give', stem: 'de',
    forms: [['dei', '1', 'present'], ['dey', '3', 'present']]
  },
  {
    form: 'নেওয়া', roman: 'neoya', gloss: 'to take', stem: 'ne',
    forms: [['nii', '1', 'present'], ['ney', '3', 'present'], ['nebo', '1', 'future']]
  },
  {
    form: 'পারা', roman: 'para', gloss: 'to be able to', stem: 'par',
    forms: [['pari', '1', 'present'], ['paro', '2fam', 'present'], ['parini', '1', 'present-perfect']],
    note: 'Follows another verb in its infinitive: বলতে পারি — "I can speak". পারিনি is the negative perfect, "I could not".'
  },
  {
    form: 'জানা', roman: 'jana', gloss: 'to know', stem: 'jan',
    forms: [['jani', '1', 'present'], ['janen', '2pol', 'present']]
  },
  {
    form: 'শেখা', roman: 'shekha', gloss: 'to learn', stem: 'shikh',
    forms: [['shikhchhi', '1', 'present-cont'], ['shikhte', null, 'infinitive']]
  },
  {
    form: 'পড়া', roman: 'pora', gloss: 'to read, to study', stem: 'por',
    forms: [['pori', '1', 'present']]
  },
  {
    form: 'চাওয়া', roman: 'chaoya', gloss: 'to want', stem: 'cha',
    forms: [['chai', '1', 'present'], ['chao', '2fam', 'present']]
  },
  {
    form: 'হওয়া', roman: 'hoya', gloss: 'to be, to become, to happen', stem: 'ho',
    forms: [
      ['hoy', '3', 'present'],
      ['hobo', '1', 'future'],
      ['hobe', '3', 'future'],
      ['hoyechhe', '3', 'present-perfect']
    ],
    note: 'হবে also carries obligation: যেতে হবে is "must go".'
  },
  {
    form: 'বোঝা', roman: 'bojha', gloss: 'to understand', stem: 'bujh',
    forms: [['bujhi', '1', 'present'], ['bujhte', null, 'infinitive']]
  },
  {
    form: 'পাওয়া', roman: 'paoya', gloss: 'to get, to receive', stem: 'pa',
    forms: [['peyechhe', '3', 'present-perfect', 'irregular']]
  },
  {
    form: 'লাগা', roman: 'laga', gloss: 'to feel, to seem, to take (time)', stem: 'lag',
    forms: [['lage', '3', 'present'], ['laglo', '3', 'past']],
    note: 'Used impersonally for liking: আমার ভালো লাগে is literally "to me it feels good".'
  },
  {
    form: 'হাঁটা', roman: 'hata', gloss: 'to walk', stem: 'hat',
    forms: [['hate', '3', 'present']]
  },
  {
    form: 'বানানো', roman: 'banano', gloss: 'to make, to prepare', stem: 'bana',
    forms: [['banay', '3', 'present']]
  },
  {
    form: 'ভালোবাসা', roman: 'bhalobasha', gloss: 'to love', stem: 'bhalobash',
    forms: [['bhalobashi', '1', 'present']]
  },
  {
    form: 'আনা', roman: 'ana', gloss: 'to bring', stem: 'an',
    forms: [['enechhi', '1', 'present-perfect', 'irregular']],
    note: 'Perfect shifts the vowel like আসা: এনেছি, not *আনেছি.'
  },
  {
    form: 'হারানো', roman: 'harano', gloss: 'to lose', stem: 'hara',
    forms: [['hariye', null, 'perfective-participle']],
    note: 'হারিয়ে গেছি — "having lost, I have gone" — is the ordinary way to say "I am lost".'
  }
];
