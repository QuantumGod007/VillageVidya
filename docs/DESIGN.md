# Design decisions

## Reference inspected

The actual [CampusPass site](https://campuspass-rho.vercel.app/) and [source](https://github.com/QuantumGod007/CampusPass) were inspected, including `src/styles/index.css`, `src/components/layout.tsx`, and authentication styles.

Useful principles: #F8F7F4 canvas, #315CFD cobalt, #17191D ink; DM Sans paired with Instrument Serif; thin borders; a quiet header; confident typography; asymmetric content; small purposeful interactions; restrained card lift; and reduced-motion support. Those principles inform this app. CampusPass’s event cards, posters and layouts are not copied.

## Village Vidya’s identity

- The custom wordmark uses an opening book and small rays of possibility.
- The hero’s original SVG/CSS fraction notebook uses a roti analogy. Its button changes 1/2 into 2/4, revealing 3/4; the visual teaches something.
- Sage, warm paper, amber and peach distinguish learning moments while cobalt marks navigation and primary actions. No stock assets or large bitmap downloads are needed.
- The landing narrative progresses from curiosity to how learning works, human connection, asking for another explanation, tutor growth, shared language, connectivity, trust and a next step. Sections use varied compositions.
- Workspaces retain the same typography, borders, palette and visual language. A calmer hierarchy gives learners a next lesson, a peer, and a question rather than a wall of charts.
- Tutor discovery reveals why a person matches. Reports emphasize actionable coaching and source honesty over an unexplained AI score.
- On small screens the layout stacks naturally, the primary menu becomes a native dialog, and the learning room keeps ELIC and the composer within the chat panel.

## Content discipline

Profiles, teaching scores and historical session totals are labelled fictional. No testimonials, real user counts, learning outcomes, latency claims or institutional partnerships are invented. Curated sources are named honestly. Live-service limitations appear where the user needs them, with the detailed engineering baseline in the documentation.

## Assets and motion

All artwork is original vector/code artwork. DM Sans and Instrument Serif are bundled through Fontsource under their included open font licenses. Route screens are lazy loaded. Entrance motion is modest; light mode is the default and suppresses optional entrance motion, while system reduced-motion preference is always respected.
