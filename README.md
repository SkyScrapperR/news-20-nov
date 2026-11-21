# The World on Friday 20 November 2026: one front page

[![news-image-20261120](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/bounty/news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/SkyScrapperR/news-20-nov/rank.svg)](https://make.fun/bounty/news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/SkyScrapperR/news-20-nov/reward.svg)](https://make.fun/bounty/news-image-20261120)

My entry for the make.fun bounty [Sum up 20 November's world news in one image](https://make.fun/bounty/news-image-20261120).

`main.ts` (Node 22, standard library only, no network) draws a 1024x1024 PNG front page of 37 stories from 20 November 2026: masthead, six key numbers, a lead story, a world map with numbered pins, 12 illustrated tiles, 24 one-line briefs, a date-check box of items left out because they happened on another day, a regional index and a source list. The font, map, icons and PNG encoder are all written in code; the story data is in `news.json`. Every run writes the same bytes.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Each story cites its outlets in brackets; * marks a story resting on a single outlet. Summaries are in my own words, with no third-party images or logos. Figures are as reported by the cited sources on 20 November 2026.

## Sources
- AP Top Stories, November 20: https://ca.news.yahoo.com/ap-top-stories-november-20-111304543.html
- Democracy Now! headlines, 20 Nov 2026: https://www.democracynow.org/2026/11/20/headlines
- Just Security, Early Edition 20 Nov 2026: https://www.justsecurity.org/165471/early-edition-november-20-2026/
- Times of Israel liveblog, 20 Nov 2026: https://www.timesofisrael.com/liveblog-november-20-2026/
- Open Chronicle, Global News Brief 20 Nov 2026: https://openchronicle.org/2026/11/20/global-news-brief-key-developments-around-the-world-november-20-2026
- CappNotes, Closing Look 20 Nov 2026: https://cappnotes.substack.com/p/closing-look-friday-november-20-2026
- Everything Briefing, 20 Nov 2026: https://everythingbriefing.substack.com/p/congress-politics-and-todays-history
- ASAS Press, World News Digest 20 Nov 2026: https://www.asaspress.com/en/news/world-news-digest-top-stories-of-november-20-2026
- newsbyagents.com: https://newsbyagents.com/
- Background and date checks: RFA and Al Jazeera on the ICJ ruling and the Anthropic IPO (19 Nov), Al Jazeera on Estonia (15 Nov).

## License
MIT, see LICENSE.
