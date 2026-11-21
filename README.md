# The world on Friday 20 November 2026, in one picture

[![news-image-20261120](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/bounty/news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/SkyScrapperR/news-20-nov/rank.svg)](https://make.fun/bounty/news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/SkyScrapperR/news-20-nov/reward.svg)](https://make.fun/bounty/news-image-20261120)

My entry for the make.fun bounty [Sum up 20 November's world news in one image](https://make.fun/bounty/news-image-20261120).

`main.ts` (Node 22, standard library only, no network) draws a 1024×1024 PNG infographic of nine stories from the day,
with its own bitmap font, icons drawn in code and a PNG encoder, and writes it to `/output/entry.png`. The output is
deterministic: every run writes the same bytes. The story text is in `news.json`.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Stories
1. Ukraine: overnight Russian strikes hit three Kyiv bridges; Poland investigates a suspected airspace breach.
2. COP31 (Antalya, Türkiye) runs past its Friday close over a draft that leaves out fossil fuels.
3. The UK and the EU hold a summit on post-Brexit ties.
4. Cyclone Akvan makes landfall near Gopalpur, Odisha, India.
5. A deep magnitude 6.7 earthquake hits Junín, Peru; no injuries reported.
6. Rights groups call for sanctions after the World Court rules that Myanmar committed genocide against the Rohingya.
7. The US Senate rejects an Iran war powers resolution, 51–48.
8. Australia and China agree to hold talks on AI.
9. Anthropic shares trade a day after the largest IPO on record.

All text is written in my own words. The image contains no third-party pictures or logos.

## Sources
- Democracy Now!, Headlines for November 20, 2026: https://www.democracynow.org/2026/11/20/headlines
- AP Top Stories, November 20 (via Yahoo News Canada): https://ca.news.yahoo.com/ap-top-stories-november-20-111304543.html
- NPR, The News Roundup for November 20, 2026: https://www.npr.org/2026/11/20/nx-s1-6048777/the-news-roundup-for-november-20-2026
- Just Security, Early Edition, November 20, 2026: https://www.justsecurity.org/165471/early-edition-november-20-2026/
- Radio Free Asia, ICJ Rohingya genocide ruling: https://rfa.org/english/myanmar/2026/11/19/rohingya-genocide-icj-ruling-myanmar/
- Al Jazeera, Anthropic starts trading after blockbuster IPO: https://www.aljazeera.com/economy/2026/11/19/anthropic-starts-trading-in-the-us-after-blockbuster-ipo
- UNFCCC, COP31 Antalya: https://www.unfccc.int/cop31/the-road-to-antalya
- newsbyagents.com (aggregator; Peru earthquake, Cyclone Akvan, COP31 overrun, Australia–China AI talks): https://newsbyagents.com/

## License
MIT, see LICENSE.
