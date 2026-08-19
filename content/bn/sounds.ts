// -*- coding: utf-8 -*-
/**
 * Pronunciation guide, written for an English speaker.
 *
 * This exists because of a specific gap. A learner who only wants to speak
 * sees romanization and nothing else — no script, and until recordings
 * exist, no audio either. Romanization alone is not enough: `t` and `ṭ`
 * are different sounds, and the diacritic means nothing to someone who has
 * never been told what it is.
 *
 * The dental/retroflex pair is the one worth getting right early. English
 * `t` is articulated close to the Bangla *retroflex* ট, so an English
 * speaker reading `t` will instinctively produce ট — exactly the wrong
 * one. Said wrong from day one, it is hard to unlearn.
 *
 * Same provenance caveat as the rest of the course: drafted, not yet
 * checked by a native speaker.
 */

export interface SoundNote {
  /** Romanization as it appears in the course. */
  roman: string;
  /** The Bangla letter(s) this covers — shown small, as reference only. */
  script: string;
  ipa: string;
  /** One-line description an English speaker can act on. */
  tip: string;
  /** The mistake an English speaker will make by default. */
  pitfall?: string;
  /** Words in the course that use it. Filled in at build time. */
  examples?: string[];
}

export interface SoundGroup {
  id: string;
  title: string;
  /** Why this group matters, in one or two sentences. */
  intro: string;
  /** Ranked: 1 is "get this right first". */
  priority: 1 | 2 | 3;
  sounds: SoundNote[];
}

export const SOUND_GROUPS: SoundGroup[] = [
  {
    id: 'dental-retroflex',
    title: 'Two kinds of t and d',
    priority: 1,
    intro:
      'The single most useful thing to fix early. Bangla has two t sounds and two d sounds, and English has neither of them in the right place — English t sits between the two, and closest to the one written ṭ. So reading `t` with an English t gives you the wrong letter.',
    sounds: [
      {
        roman: 't', script: 'ত', ipa: 't̪',
        tip: 'Tongue flat against the back of your top teeth. Softer and duller than English t, closer to the t in a French or Spanish accent.',
        pitfall: 'Using an English t here — that produces ট, a different letter.'
      },
      {
        roman: 'ṭ', script: 'ট', ipa: 'ʈ',
        tip: 'Tongue curled back to the ridge behind your teeth. This is the one that sounds like an English t, only harder.',
        pitfall: 'Treating the dot as decoration and saying it the same as t.'
      },
      {
        roman: 'd', script: 'দ', ipa: 'd̪',
        tip: 'Tongue on the teeth, like the d in Spanish "donde".'
      },
      {
        roman: 'ḍ', script: 'ড', ipa: 'ɖ',
        tip: 'Tongue curled back. Closer to an English d.'
      },
      {
        roman: 'n', script: 'ন', ipa: 'n',
        tip: 'Tongue on the teeth, not the ridge. A softer n than English.'
      }
    ]
  },
  {
    id: 'aspiration',
    title: 'The puff of air',
    priority: 1,
    intro:
      'An h after a consonant is not a separate sound — it means you release a breath with it. English does this without noticing (the p in "pin" is aspirated, the p in "spin" is not), but in Bangla it changes the word, so it has to be deliberate.',
    sounds: [
      { roman: 'kh', script: 'খ', ipa: 'kʰ', tip: 'k with a strong puff, like the c in "cat" exaggerated.' },
      { roman: 'gh', script: 'ঘ', ipa: 'gʱ', tip: 'g with breath pushed through it. No English equivalent — practise on ঘর (ghor, "room").' },
      { roman: 'chh', script: 'ছ', ipa: 'tʃʰ', tip: 'ch with a puff. Compare ছেলে (chhele, "boy").' },
      { roman: 'th', script: 'থ', ipa: 't̪ʰ', tip: 'Dental t with a puff. NOT the th of "think" — that sound does not exist in Bangla.', pitfall: 'Saying the th of "the" or "think".' },
      { roman: 'dh', script: 'ধ', ipa: 'd̪ʱ', tip: 'Dental d with breath. As in ধন্যবাদ (dhonnobad, "thank you").' },
      { roman: 'ph', script: 'ফ', ipa: 'pʰ', tip: 'p with a puff — and in Bangladesh usually just said as English f.' },
      { roman: 'bh', script: 'ভ', ipa: 'bʱ', tip: 'b with breath — in Bangladesh often close to English v. As in ভালো (bhalo, "good").' },
      { roman: 'jh', script: 'ঝ', ipa: 'dʒʱ', tip: 'j with breath pushed through it, as in ঝাল (jhal, "chilli heat").' }
    ]
  },
  {
    id: 'vowels',
    title: 'The vowel that is not an a',
    priority: 1,
    intro:
      'The most common single mistake. Bangla\'s first vowel is written অ and transliterated `o` in this course, because that is what it sounds like — but older books write it "a", which sends English speakers wrong.',
    sounds: [
      {
        roman: 'o', script: 'অ / ও', ipa: 'ɔ ~ o',
        tip: 'Like the o in "off" (অ) or "go" (ও). Never the a of "cat".',
        pitfall: 'Reading kotha as "KAH-tha" instead of "KO-tha".'
      },
      { roman: 'a', script: 'আ', ipa: 'a', tip: 'Open, like the a in "father".' },
      { roman: 'e', script: 'এ', ipa: 'e', tip: 'Like the e in "bed", a little tighter.' },
      { roman: 'i', script: 'ই', ipa: 'i', tip: 'Like the ee in "see", but short.' },
      { roman: 'u', script: 'উ', ipa: 'u', tip: 'Like the oo in "book".' }
    ]
  },
  {
    id: 'r-sounds',
    title: 'Three r-like sounds',
    priority: 2,
    intro: 'None of them are the English r. Getting these approximately right makes a large difference to how natural you sound.',
    sounds: [
      { roman: 'r', script: 'র', ipa: 'r', tip: 'A tapped r — the tongue flicks once, like the r in Spanish "pero".', pitfall: 'The English r, which curls the tongue and never touches.' },
      { roman: 'ṛ', script: 'ড়', ipa: 'ɽ', tip: 'A flap made with the tongue curled back, then flicked forward. Close to the middle of American "butter".' },
      { roman: 'y', script: 'য়', ipa: 'j', tip: 'A glide, like the y in "yes".' }
    ]
  },
  {
    id: 'sibilants',
    title: 'Why so many words have "sh"',
    priority: 2,
    intro:
      'Bangla writes three different letters — শ, ষ, স — that mostly all come out as "sh". This is a spelling distinction, not a pronunciation one, which is good news if you are only speaking.',
    sounds: [
      { roman: 'sh', script: 'শ / ষ', ipa: 'ʃ', tip: 'Like the sh in "ship". This is the default s-sound in Bangla.' },
      { roman: 's', script: 'স', ipa: 's ~ ʃ', tip: 'Usually also "sh". A true English s only survives in some clusters, like স্কুল (skul, "school").' }
    ]
  },
  {
    id: 'endings',
    title: 'Word endings go quiet',
    priority: 3,
    intro:
      'Bangla consonants carry a built-in short o. At the end of a word it is usually dropped or barely voiced, so words look longer written than they sound.',
    sounds: [
      { roman: '(final o)', script: '—', ipa: '(ə)', tip: 'ভালো is closer to "bhalo" with a very light final vowel; বলল is "bollo" with the last o almost swallowed.' },
      { roman: 'ng', script: 'ং', ipa: 'ŋ', tip: 'Like the ng in "sing". Nasalises what comes before it.' },
      { roman: '̃', script: 'ঁ', ipa: '◌̃', tip: 'Nasalises the vowel — air through the nose, as in হ্যাঁ (hê, "yes").' }
    ]
  }
];

/** Sounds worth flagging on a card because English speakers get them wrong. */
export const TRICKY = new Set([
  't', 'ṭ', 'd', 'ḍ', 'th', 'dh', 'kh', 'gh', 'bh', 'ph', 'chh', 'jh',
  'ṛ', 'r', 'o'
]);
