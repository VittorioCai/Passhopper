<p align="center"><img src="design/logo/passhopper-banner.png" alt="Passhopper – Plan your Interrail trip. Make the pass pay off." width="100%"></p>

# Passhopper

**Plan your Interrail trip. Make the pass pay off.**

Passhopper is a mobile-first planner for Interrail passes. Build your route, see which days are worth a travel day, keep track of seat reservations, and find out whether the pass actually beats buying tickets. An optional AI assistant (bring your own DeepSeek, Claude or OpenAI-compatible key) can draft and edit your trip. You always see the change before it's applied.

> 🚧 Early stage. Trips, route planning, travel-day planning, seat reservations and the savings comparison work. Pass prices and reservation rules are not yet verified against official sources.

## Status

|                               |                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Design docs (Chinese for now) | [`docs/`](docs/README.md)                                                      |
| Clickable prototype           | [`prototype/index.html`](prototype/index.html), download and open in a browser |
| Logo and brand assets         | [`design/logo/`](design/logo/)                                                 |
| App                           | Not started                                                                    |

## Development

Requires Node 22 and pnpm 10.

```bash
pnpm install
pnpm dev        # start the dev server
pnpm test       # run unit tests
pnpm lint && pnpm typecheck
pnpm build      # production build with offline support
```

## Languages

English first. Simplified Chinese (简体中文) is planned as the second language.

## License

[MIT](LICENSE)

_Passhopper is not affiliated with Interrail / Eurail B.V. "Interrail" and "Eurail" are trademarks of Eurail B.V._
