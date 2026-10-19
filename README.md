# Pawtner

A Tencent Cloud AI CAN DO IT Hackathon Singapore 2026 prototype for seniors who take medicine every day: a knitted dog named Buddy on their phone, and a calm page for the family who cares for them.

**[Try Pawtner](https://pawtner.edgeone.dev)** · **[Watch the demo](https://youtu.be/xlip3x6tUjk)**

All people and data in the demo are fictional. Thresholds are demo values, not clinical advice.

## Why this problem

My mom's normal blood pressure is about 160. With her medicine, it comes down to 137/75. That is why Pawtner opens with two words: "For Mom".

Taking medicine on time, every day, is quiet and lonely work. Families want to help without hovering, and reminders that only beep are easy to ignore.

## What Rose sees

Rose opens the app to her garden and her dog.

<a href="https://github.com/whansel007/Pawtner/blob/main/docs/screenshots/readme/cover.jpg"><img src="https://raw.githubusercontent.com/whansel007/Pawtner/main/docs/screenshots/readme/cover.jpg" alt="Pawtner cover" width="390"></a>

Home shows Buddy, today's hearts and the next medicine. Each heart comes from something she did today.

<a href="https://github.com/whansel007/Pawtner/blob/main/docs/screenshots/readme/home.jpg"><img src="https://raw.githubusercontent.com/whansel007/Pawtner/main/docs/screenshots/readme/home.jpg" alt="Home with Buddy and the next dose" width="390"></a>

Drag the card up and the whole screen becomes her medicines for today, in large type. Drag it down for Buddy alone.

<a href="https://github.com/whansel007/Pawtner/blob/main/docs/screenshots/readme/full-form.jpg"><img src="https://raw.githubusercontent.com/whansel007/Pawtner/main/docs/screenshots/readme/full-form.jpg" alt="Today's medicines on the full screen" width="390"></a>

Buddy alone keeps the next medicine in sight on a slim strip.

<a href="https://github.com/whansel007/Pawtner/blob/main/docs/screenshots/readme/buddy-only.jpg"><img src="https://raw.githubusercontent.com/whansel007/Pawtner/main/docs/screenshots/readme/buddy-only.jpg" alt="Buddy on the full screen with the next dose strip" width="390"></a>

Blood pressure is compared with her own first reading, and "How do you feel?" uses tick boxes, so she never has to think of the right words.

<a href="https://github.com/whansel007/Pawtner/blob/main/docs/screenshots/readme/health.jpg"><img src="https://raw.githubusercontent.com/whansel007/Pawtner/main/docs/screenshots/readme/health.jpg" alt="Logging blood pressure" width="390"></a>

## What Jamie sees

Jamie, her caregiver, gets a gentle web page: how many of today's activities are done, the week as hearts, and the latest reading Rose chose to share. It never names a medicine.

[![This week on the caregiver's page](https://raw.githubusercontent.com/whansel007/Pawtner/main/docs/screenshots/readme/care-week.jpg)](https://github.com/whansel007/Pawtner/blob/main/docs/screenshots/readme/care-week.jpg)

Jamie decides when to be told: check-ins on or off, and after how many days in a row with a missed dose.

[![Check-in preferences](https://raw.githubusercontent.com/whansel007/Pawtner/main/docs/screenshots/readme/care-alerts.jpg)](https://github.com/whansel007/Pawtner/blob/main/docs/screenshots/readme/care-alerts.jpg)

## How it works

1. **At the dose time**, if the medicine isn't taken, Buddy barks once and a message says it's time. The time comes from her saved schedule.

   <a href="https://github.com/whansel007/Pawtner/blob/main/docs/screenshots/readme/reminder.jpg"><img src="https://raw.githubusercontent.com/whansel007/Pawtner/main/docs/screenshots/readme/reminder.jpg" alt="The dose-time reminder" width="390"></a>

2. **If it's still not taken**, Buddy nudges 60 minutes later, and once more 60 minutes after that. Never more than twice.
3. **Hearts carry over.** Each of three activities earns one, up to four: all of the day's medicines, a blood-pressure reading, a walk with Buddy. Every 12 hours without a new heart, Buddy loses one, never below one. Our first version gave a heart for one medicine out of three; we changed it so all of them count.
4. **Each reading is compared with her first one.** About the same or lower says "Keep at it", 120/80 or below says "Good job", and more than 5 points above it, or any ticked emergency sign, shows a calm Warning.

   <a href="https://github.com/whansel007/Pawtner/blob/main/docs/screenshots/readme/bp-reading.jpg"><img src="https://raw.githubusercontent.com/whansel007/Pawtner/main/docs/screenshots/readme/bp-reading.jpg" alt="A reading compared with her first one: Keep at it" width="390"></a>

5. **Jamie hears only what Rose allows.** A check-in goes out once per missed day, after the number of days Jamie chose. Sharing blood pressure is Rose's switch.

   [![A gentle check-in on Jamie's page](https://raw.githubusercontent.com/whansel007/Pawtner/main/docs/screenshots/readme/care-checkin.jpg)](https://github.com/whansel007/Pawtner/blob/main/docs/screenshots/readme/care-checkin.jpg)

Evidence, as of 16 Oct 2026: 175 unit tests pass (`npm run test:unit`) without a database, a model or a network, covering these rules, the hearts and the reminders. The live demo runs on the hosted database.

## By the numbers

As of 16 Oct 2026, built from 13 Oct:

- 302 commits and 75 merged pull requests
- 5,511 registered medicines searchable when adding a medicine

## Built with

William built the API, the agent rules and the hosting; I built the phone app and the caregiver's page. We use CodeBuddy and Miora for this project; Miora is the backdrop and the pet dog companion. Claude Code helped with fixes and reviews. Screenshots of the CodeBuddy chats are in [`proof/`](proof/), and the full chat histories in [`proof/chat-history/`](proof/chat-history/).

React 19, TypeScript, Vite 6, Tailwind CSS 4 and i18next for the app; a TypeScript API on Tencent EdgeOne Pages cloud functions; PostgreSQL on Supabase.

Medicine data: HSA *Listing of Registered Therapeutic Products* from data.gov.sg (Open Data Licence).

## Run it locally

Requirements: Node.js 24+, npm, and a PostgreSQL database.

```sh
git clone https://github.com/whansel007/Pawtner.git
cd Pawtner
npm install
npm --prefix mobile install
cp .env.example .env
```

In `.env`, set `DATABASE_URL` and `DATABASE_URL_DIRECT` to your database. The `LLM_*` values are optional: without them every message uses its pre-written wording.

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

In a second terminal:

```sh
npm run dev:mobile
```

Open the address Vite prints. The phone app is at `/`, the caregiver's page at `/care`. Checks: `npm run typecheck` and `npm run test:unit`.

## Why it matters

Medicine works only if it is taken. Pawtner makes the daily routine a little warmer for the person taking it, and a little lighter for those who love them.

**[Try Pawtner](https://pawtner.edgeone.dev)**
