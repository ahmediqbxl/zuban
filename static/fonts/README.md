# Fonts

**The Bengali font is vendored deliberately — do not fall back to system fonts.**

System Bengali coverage varies enormously. Many iOS and Android builds ship
a font that cannot shape the conjuncts this course teaches, and Bengali does
not degrade gracefully: a missing ligature makes a word unreadable rather
than merely ugly.

## Required

Place `NotoSansBengali-Regular.woff2` and `NotoSansBengali-Medium.woff2`
here, subset to the Bengali block (U+0980–U+09FF) plus Latin basics.

```bash
# from google/fonts, then subset with fonttools
pyftsubset NotoSansBengali-Regular.ttf \
  --unicodes="U+0000-007F,U+0980-09FF,U+200C-200D" \
  --layout-features="*" \
  --flavor=woff2 --output-file=NotoSansBengali-Regular.woff2
```

`--layout-features="*"` is not optional. Bengali shaping depends on
`akhn`, `blwf`, `half`, `pstf`, `vatu` and `rphf`; dropping them silently
breaks conjuncts while leaving simple text looking fine.

## Known upstream bugs

Noto Sans Bengali has open issues that affect real words:

- `স্কুল` ("school") — ল wrongly ligates with the ু vowel sign, rendering
  the word illegible.
- `হ্ন` / `হ্ণ` — the two ligatures are reported swapped.

Verify against `/script` in the app after any font change, on real devices
rather than a desktop browser. If Noto's bugs prove blocking, Hind Siliguri
and Kalpurush are the usual alternatives.
