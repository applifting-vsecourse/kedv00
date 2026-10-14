# Plan — US-2 Polls

Story: `USER-STORIES.md` → US-2. Follows the quack pattern: schema → seed → repository → service → controller/DTO → zod schema → query hook → UI.

## 0. Clean up leftover database state (before anything else)

An earlier attempt left the local DB out of sync with the repo:

- `_prisma_migrations` records `20261013151637_add_polls` as applied, and the DB has `poll_option` + `poll_vote` tables (0 votes).
- The repo only has an **empty, untracked** `prisma/migrations/20261013151637_add_polls/` folder. Its SQL is gone, and `schema.prisma` has no poll models.

Fix: drop the two tables, delete that row from `_prisma_migrations`, and remove the empty folder. Then slice 1 creates a fresh, committed migration. (`prisma migrate reset` would also work, but it wipes and reseeds all local data.) **This needs your OK.**

## Data model

A poll is not its own table. A quack **is a poll when it has options**. This keeps "a poll is a quack with answers" literal, and the feed, search and mood work unchanged.

```prisma
model PollOption {
  id       String     @id @default(cuid())
  quack    Quack      @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId  String
  text     String     @db.VarChar(80)
  position Int        // 0..3, the order the asker entered
  votes    PollVote[]

  @@unique([quackId, position])
  @@unique([id, quackId])   // target of the composite FK below
  @@map("poll_option")
}

model PollVote {
  quack     Quack      @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId   String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  option    PollOption @relation(fields: [optionId, quackId], references: [id, quackId], onDelete: Cascade)
  optionId  String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @default(now()) @updatedAt

  @@id([quackId, userId])   // one person, one vote per poll — enforced by Postgres
  @@index([optionId])
  @@map("poll_vote")
}
```

`Quack` gets `pollOptions PollOption[]` and `pollVotes PollVote[]`. `User` gets `pollVotes PollVote[]`.

How the story's guarantees map onto the model:

| Story rule                                               | Where it's enforced                                                                                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One person, one vote                                     | Primary key `(quackId, userId)`. A second vote can't be inserted, only updated.                                                                                                 |
| Changing a vote                                          | Update `optionId` on the same row (upsert).                                                                                                                                     |
| Removing a vote                                          | Delete the row.                                                                                                                                                                 |
| A vote's answer belongs to that poll                     | Composite FK `(optionId, quackId) → poll_option(id, quackId)`. A vote can't point at another poll's option.                                                                     |
| Numbers right for everyone                               | Counts are **never stored**. They are `COUNT(*)` per option at read time, so there's no counter that can drift.                                                                 |
| 2–4 answers, ≤80 chars, no duplicates (case-insensitive) | DTO validation + service. Options are written once, in the same transaction as the quack, and never change, so a DB constraint adds nothing. `VarChar(80)` backs up the length. |
| Answer order                                             | `position`, unique per quack.                                                                                                                                                   |
| No edit / delete                                         | No endpoints for it. Cascades only matter if a user or quack is removed some other way.                                                                                         |

Decisions to check here:

- **No `Poll` table.** The alternative is a 1:1 `Poll` row, which only pays off once polls get their own fields (deadline, closed, multi-choice). Those are all out of scope.
- **No DB check for 2–4 options or case-insensitive uniqueness.** Prisma can't express a `lower(text)` unique index without hand-edited SQL that it then reports as drift.

## API

All endpoints sit under the existing `AuthenticatedUserGuard`. The voter is always taken from the session.

**`POST /api/quacks`**: the existing endpoint, with an optional body field:

```json
{
  "text": "Lunch?",
  "mood": null,
  "poll": { "options": ["Pizza", "Thai", "Salad"] }
}
```

- Each option is trimmed and must be 1–80 chars. 2–4 options. Case-insensitive duplicates → `400`.
- The quack and its options are created in one transaction.
- `201` → `QuackResponseDto`, which now includes `poll` (all counts 0).

**`GET /api/quacks`**: unchanged, except each quack now carries:

```json
"poll": null | {
  "options": [{ "id": "…", "text": "Pizza", "votes": 3 }],   // by position
  "totalVotes": 7,
  "myOptionId": "…" | null
}
```

`myOptionId` depends on who's asking, so the repository receives the viewer's id. Counts come from one grouped count over `poll_vote` for the quacks on the page, not one query per poll.

**`PUT /api/quacks/:quackId/vote`**: `{ "optionId": "…" }`

- Upsert on `(quackId, userId)`. Calling it twice is the same as calling it once, so the last request wins.
- `404` if the quack doesn't exist or has no poll. `400` if the option isn't one of this poll's.
- `200` → the fresh `PollResponseDto` (same shape as `poll` above), so the client can confirm its optimistic state against the server.

**`DELETE /api/quacks/:quackId/vote`**

- Deletes the caller's vote if there is one (`deleteMany`, so calling it again is harmless).
- `404` if the quack doesn't exist or has no poll.
- `200` → fresh `PollResponseDto`.

Concurrency: Prisma runs this upsert as `INSERT … ON CONFLICT` (compound unique where, no nested writes), so two tabs voting at once can't both insert. If Postgres still raises `P2002`, retry once.

## Frontend

- `quackSchemas.ts`: add `pollSchema` and `poll: pollSchema.nullable()` on the quack. The add-quack request gets optional `poll.options`.
- `components/PollResults.tsx`: answers in order, each as a button with a share bar, count and %. The voter's pick is marked with an icon and text, not only colour (`aria-pressed`). Shows "N votes" / "1 vote" / "0 votes". Rendered inside `QuackItem` under the text.
- `QuackForm.tsx`: an "Add poll" toggle (an existing `toggle` from the kit) shows 2 answer inputs, with "Add answer" up to 4 and a remove button above 2. Validation goes through the existing zod + react-hook-form setup, so errors show next to the field. Turning the poll off drops the answers.
- `hooks/useVote.ts`: one mutation for vote/unvote (the component decides which: clicking your current pick unvotes).
  - `onMutate`: cancel quack queries, snapshot, and patch the poll in **every** cached list (`setQueriesData` on `quackKeys.lists()`, since search results are cached separately).
  - `scope: { id: "poll-vote-<quackId>" }`: TanStack Query runs mutations in the same scope one after another, so the server sees clicks in click order and the last click wins.
  - `onError`: restore the snapshot and set the per-poll error "Your vote didn't go through. Try again." The error clears on the next vote.
  - `onSettled`: invalidate `quackKeys.all()` once the last pending vote for that poll settles, so the counts come from the server.
- Shadows: none on the poll (it's inline content, see DESIGN.md).

## Build order (one commit per slice)

1. **Model + migration + seed.** Add the Prisma models, run `pnpm backend prisma:migrations:run` (new `add_polls` migration), and seed 2 polls with a few votes.
2. **Create poll (backend).** `CreatePollDto` validation, repository transaction, response includes `poll`. DTO spec + service spec + repository spec.
3. **Read polls (backend).** `GET` returns `poll` with counts and `myOptionId` for the viewer. Repository spec for the grouped count, plus a service spec.
4. **Vote / unvote (backend).** `PUT`/`DELETE …/vote` with 404/400 cases. Service specs for switching, removing, foreign option and no-poll.
5. **Show results (frontend).** zod schema + `PollResults`, read-only. Tests: bars, counts and %, my pick marked, 0 votes, singular "1 vote".
6. **Create poll (frontend).** Form toggle and answer fields. Tests: add/remove limits, validation messages, payload shape, toggling off.
7. **Vote (frontend).** `useVote` + clickable answers. Tests: optimistic update, switch, unvote, rollback + error message on failure.
8. `pnpm check-all` once at the end.
