/**
 * Romanization table for the Bengali script, tuned to bn-BD pronunciation.
 *
 * This is a *learner's* romanization, not a scholarly transliteration: it
 * favours how a Dhaka speaker actually says a letter over a reversible
 * one-to-one mapping. অ is written "o" because that is what it sounds
 * like, not "a" as strict ISO 15919 would have it.
 *
 * Bangla has several letters that merged phonetically but stayed distinct
 * in spelling — শ/ষ/স and জ/য and ি/ী. The `note` field is what the UI
 * shows so learners understand why a "new" letter sounds identical to one
 * they already know.
 */

export interface GlyphSpec {
  roman: string;
  ipa?: string;
  name?: string;
  note?: string;
}

export const CONSONANT_ROMAN: Record<string, GlyphSpec> = {
  'ক': { roman: 'k', ipa: 'k' },
  'খ': { roman: 'kh', ipa: 'kʰ' },
  'গ': { roman: 'g', ipa: 'g' },
  'ঘ': { roman: 'gh', ipa: 'gʱ' },
  'ঙ': { roman: 'ng', ipa: 'ŋ', note: 'Never starts a word.' },
  'চ': { roman: 'ch', ipa: 'tʃ' },
  'ছ': { roman: 'chh', ipa: 'tʃʰ' },
  'জ': { roman: 'j', ipa: 'dʒ' },
  'ঝ': { roman: 'jh', ipa: 'dʒʱ' },
  'ঞ': { roman: 'n', ipa: 'n', note: 'Appears almost only inside conjuncts.' },
  'ট': { roman: 'ṭ', ipa: 'ʈ', note: 'Retroflex — tongue curled back.' },
  'ঠ': { roman: 'ṭh', ipa: 'ʈʰ' },
  'ড': { roman: 'ḍ', ipa: 'ɖ' },
  'ঢ': { roman: 'ḍh', ipa: 'ɖʱ' },
  'ণ': { roman: 'n', ipa: 'n', note: 'Sounds identical to ন in modern Bangla; spelling only.' },
  'ত': { roman: 't', ipa: 't̪', note: 'Dental — tongue on the teeth, softer than English t.' },
  'থ': { roman: 'th', ipa: 't̪ʰ' },
  'দ': { roman: 'd', ipa: 'd̪' },
  'ধ': { roman: 'dh', ipa: 'd̪ʱ' },
  'ন': { roman: 'n', ipa: 'n' },
  'প': { roman: 'p', ipa: 'p' },
  'ফ': { roman: 'ph', ipa: 'pʰ', note: 'Often said like English f in Bangladesh.' },
  'ব': { roman: 'b', ipa: 'b' },
  'ভ': { roman: 'bh', ipa: 'bʱ', note: 'Often said like English v in Bangladesh.' },
  'ম': { roman: 'm', ipa: 'm' },
  'য': { roman: 'j', ipa: 'dʒ', note: 'Same sound as জ. Called অন্তঃস্থ য.' },
  'র': { roman: 'r', ipa: 'r' },
  'ল': { roman: 'l', ipa: 'l' },
  'শ': { roman: 'sh', ipa: 'ʃ', note: 'The default s-sound in Bangla is "sh".' },
  'ষ': { roman: 'sh', ipa: 'ʃ', note: 'Also "sh" — distinct in spelling only.' },
  'স': { roman: 's', ipa: 's', note: 'Usually "sh" too, except in some clusters.' },
  'হ': { roman: 'h', ipa: 'h' },
  'ড়': { roman: 'ṛ', ipa: 'ɽ', note: 'A flapped r — ড with a dot beneath.' },
  'ঢ়': { roman: 'ṛh', ipa: 'ɽʱ' },
  'য়': { roman: 'y', ipa: 'j', note: 'য with a dot beneath. Glides like English y.' },
  'ৎ': { roman: 't', ipa: 't̪', name: 'খণ্ড ত', note: 'A "half" t that ends a syllable.' }
};

export const INDEPENDENT_VOWEL_ROMAN: Record<string, GlyphSpec> = {
  'অ': { roman: 'o', ipa: 'ɔ', note: 'Written "a" in older books but said "o".' },
  'আ': { roman: 'a', ipa: 'a' },
  'ই': { roman: 'i', ipa: 'i' },
  'ঈ': { roman: 'i', ipa: 'i', note: 'Same sound as ই — "long i" is spelling only.' },
  'উ': { roman: 'u', ipa: 'u' },
  'ঊ': { roman: 'u', ipa: 'u', note: 'Same sound as উ.' },
  'ঋ': { roman: 'ri', ipa: 'ri' },
  'এ': { roman: 'e', ipa: 'e' },
  'ঐ': { roman: 'oi', ipa: 'oi̯' },
  'ও': { roman: 'o', ipa: 'o' },
  'ঔ': { roman: 'ou', ipa: 'ou̯' }
};

/** কার — vowel signs. `prebase` is computed by the analyzer, not here. */
export const VOWEL_SIGN_ROMAN: Record<string, GlyphSpec> = {
  'া': { roman: 'a', ipa: 'a', name: 'আ-কার' },
  'ি': { roman: 'i', ipa: 'i', name: 'ই-কার', note: 'Written BEFORE its consonant.' },
  'ী': { roman: 'i', ipa: 'i', name: 'ঈ-কার', note: 'Same sound as ই-কার.' },
  'ু': { roman: 'u', ipa: 'u', name: 'উ-কার', note: 'Hangs below the consonant.' },
  'ূ': { roman: 'u', ipa: 'u', name: 'ঊ-কার' },
  'ৃ': { roman: 'ri', ipa: 'ri', name: 'ঋ-কার' },
  'ে': { roman: 'e', ipa: 'e', name: 'এ-কার', note: 'Written BEFORE its consonant.' },
  'ৈ': { roman: 'oi', ipa: 'oi̯', name: 'ঐ-কার', note: 'Written BEFORE its consonant.' },
  'ো': { roman: 'o', ipa: 'o', name: 'ও-কার', note: 'Wraps around both sides.' },
  'ৌ': { roman: 'ou', ipa: 'ou̯', name: 'ঔ-কার', note: 'Wraps around both sides.' }
};

export const DIACRITIC_ROMAN: Record<string, GlyphSpec> = {
  'ং': { roman: 'ng', ipa: 'ŋ', name: 'অনুস্বার' },
  'ঁ': { roman: '̃', ipa: '̃', name: 'চন্দ্রবিন্দু', note: 'Nasalises the vowel.' },
  'ঃ': { roman: 'h', ipa: '', name: 'বিসর্গ', note: 'Usually silent; lengthens slightly.' },
  '্': { roman: '', name: 'হসন্ত', note: 'Kills the inherent vowel; joins letters.' }
};

/** Conjuncts whose shape hides their parts — these need explicit teaching. */
export const OPAQUE_CONJUNCTS: Record<string, GlyphSpec> = {
  'ক্ষ': { roman: 'kkh', ipa: 'kkʰ', note: 'ক + ষ, but said "kkh". Shape gives no hint.' },
  'জ্ঞ': { roman: 'gg', ipa: 'gg', note: 'জ + ঞ, but said "gg". Completely opaque.' },
  'ঞ্চ': { roman: 'nch', ipa: 'ntʃ' },
  'ঙ্গ': { roman: 'ngg', ipa: 'ŋg' },
  'ত্র': { roman: 'tr', ipa: 't̪r' },
  'দ্ধ': { roman: 'ddh', ipa: 'd̪ʱ' },
  'দ্ব': { roman: 'db', ipa: 'd̪b' },
  'ন্ন': { roman: 'nn', ipa: 'nn' },
  'হ্ম': { roman: 'mh', ipa: 'mʱ', note: 'হ + ম, but said "mh" — order flips.' },
  'শ্চ': { roman: 'shch', ipa: 'ʃtʃ' },
  'প্র': { roman: 'pr', ipa: 'pr' },
  'চ্চ': { roman: 'chch', ipa: 'tʃtʃ' },
  'য্য': { roman: 'jj', ipa: 'dʒdʒ', note: 'য + য, said "jj" — সাহায্য is "shahajjo".' },
  'শ্ন': { roman: 'shn', ipa: 'ʃn' },
  'ব্য': { roman: 'bb', ipa: 'bb', note: 'ব + য, said "bb" — the য goes silent.' },
  'স্য': { roman: 'ss', ipa: 'ss', note: 'স + য, said "ss" — সমস্যা is "shomossha".' },
  'স্প': { roman: 'sp', ipa: 'sp' },
  'র্থ': { roman: 'rth', ipa: 'rt̪ʰ', note: 'রেফ: a র before a consonant becomes a small hook ABOVE it, not a letter beside it. Easy to miss entirely.' },
  'ধ্য': { roman: 'dd', ipa: 'd̪d̪', note: 'ধ + য, said "dd" — the য goes silent, as in মধ্যে.' },
  'ন্ধ': { roman: 'ndh', ipa: 'nd̪ʱ' },
  'গ্র': { roman: 'gr', ipa: 'gr' },
  'স্ত': { roman: 'st', ipa: 'st̪' },
  'ন্ড': { roman: 'nḍ', ipa: 'nɖ' },
  'প্ত': { roman: 'pt', ipa: 'pt̪' },
  'ণ্ট': { roman: 'nṭ', ipa: 'nʈ' },
  'স্ত্র': { roman: 'str', ipa: 'st̪r', note: 'Three consonants stacked: স + ত + র.' },
  'স্ব': { roman: 'sh', ipa: 'ʃ', note: 'স + ব, but the ব is silent: স্বাধীনতা = "shadhinota".' },
  'ন্ধ্য': { roman: 'ndh', ipa: 'nd̪ʱ', note: 'Three-part: ন + ধ + য, as in সন্ধ্যা.' },
  'ক্ত': { roman: 'kt', ipa: 'kt̪' },
  'ম্ব': { roman: 'mb', ipa: 'mb' },
  'ক্ল': { roman: 'kl', ipa: 'kl' },
  'ন্দ': { roman: 'nd', ipa: 'nd̪' },
  'স্ক': { roman: 'sk', ipa: 'sk', note: 'One of the few places স is a true "s".' },
  'শ্ব': { roman: 'shsh', ipa: 'ʃʃ', note: 'শ + ব, but the ব goes silent: বিশ্ব = "bishsho".' },
  'দ্য': { roman: 'dd', ipa: 'd̪d̪', note: 'দ + য, but said "dd" — the য goes silent.' },
  'ন্ত': { roman: 'nt', ipa: 'nt̪' },
  'ন্য': { roman: 'nn', ipa: 'nn', note: 'ন + য, but said "nn" — the য goes silent.' },
  'চ্ছ': { roman: 'chchh', ipa: 'tʃtʃʰ' },
  'হ্য': { roman: 'hy', ipa: 'ɦj', note: 'হ + য. In হ্যাঁ it is simply "h".' },
  'ষ্ট': { roman: 'ṣṭ', ipa: 'ʃʈ' },
  'স্থ': { roman: 'sth', ipa: 'st̪ʰ' }
};

export function lookup(text: string): GlyphSpec | undefined {
  return (
    CONSONANT_ROMAN[text] ??
    INDEPENDENT_VOWEL_ROMAN[text] ??
    VOWEL_SIGN_ROMAN[text] ??
    DIACRITIC_ROMAN[text] ??
    OPAQUE_CONJUNCTS[text]
  );
}
