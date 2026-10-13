# User Stories

## US-1 — Search quacks by text or author

**As a** signed-in Quacker user
**I want to** type a word or an author's name and see only the quacks that match
**So that** I can find a post I saw earlier without scrolling through the whole feed

### Context

Users report they can't find posts they saw last week. They usually remember a word from the post or who wrote it. This is an experiment: keep it simple and find out whether people use it.

### Acceptance criteria

**Searching**

- The quacks page has a search box above the feed. The box for posting a new quack stays where it is.
- Results update on their own shortly after the user stops typing. There is no search button to press.
- A search needs at least 2 letters. With fewer, or with an empty box, the whole feed is shown.
- Spaces at the start or end of the search are ignored.
- While new results load, the previous ones stay on screen, so the page doesn't flicker or go blank.

**What counts as a match**

- A quack matches when the search appears anywhere in its text **or** in its author's name.
- Upper and lower case don't matter, and part of a word is enough: "duck" finds "Duckling" and "DUCK".
- Every character is searched for exactly as typed, including symbols such as "100%".
- Matching quacks are shown newest first, the same as the normal feed.

**Showing the results**

- Above the results, a line says how many quacks match, e.g. "3 quacks match "duck"" or "1 quack matches "duck"".
- The searched word is highlighted wherever it appears in the quack text and the author's name.
- When nothing matches, the page says "No quacks match "…"" instead of showing an empty list.
- People using a screen reader hear the number of results, or that nothing matched.
- Clearing the search box brings the whole feed back.

**Keeping the search**

- A search can be shared as a link: opening the link shows the same search and results.
- Refreshing the page, or leaving and coming back with the browser's back button, keeps the search.

**General**

- Only signed-in users can search, just like the feed itself.
- The page follows the app's existing look and design rules.

### Out of scope

- Measuring how often people use search. Planned as a follow-up story.
- Smarter search: whole words only, similar words ("run" finding "running"), or ranking by relevance.
- Searching by @username, email, or date, or other filters.
- Loading results page by page.
- Searching without being signed in.

### Notes

- If someone posts a quack while a search is active, it only appears in the list if it matches the search.

## US-2 — Polls

**As a** signed-in Quacker user
**I want to** ask a question with a few answers and let people pick one
**So that** we can decide things like where to go for lunch without counting replies by hand

### Context

Today people ask questions in quacks and count the replies by hand. Someone always gets the numbers wrong, and the question gets buried under replies. This is an experiment: keep it simple and find out whether people use it.

### Acceptance criteria

**Creating a poll**

- A poll is a quack with answers attached. The quack text is the question.
- The existing post form gets an "Add poll" option. Turning it on shows 2 answer fields. "Add answer" adds more up to 4, and each answer can be removed while more than 2 remain. Turning the poll off removes the answers and posts a normal quack.
- A poll has 2 to 4 answers, all set by the person asking. Nobody can add answers later.
- Answers are trimmed and can't be empty or longer than 80 characters. Two answers in one poll can't be the same, ignoring upper/lower case.
- The server enforces the same rules. The form shows what's wrong next to the field.
- A poll quack has a name, date, mood and search like any other quack and appears in the normal feed, newest first.
- Polls, like quacks, can't be edited or deleted after posting.

**Voting**

- Every signed-in user can vote, including the person who asked.
- One person, one vote per poll. The server guarantees this, even when clicks are fast or repeated or come from several tabs.
- Clicking an answer votes for it. Clicking a different answer moves the vote there. Clicking the answer you already voted for removes your vote.
- Voting feels instant: the selection and counts update on screen right away, before the server answers.
- If a vote doesn't go through, the selection and counts go back to how they were and the poll shows "Your vote didn't go through. Try again."
- If someone clicks several times quickly, the last click is what counts.
- Polls never close.

**Showing results**

- Results are always visible to everyone, whether they have voted or not.
- Each answer shows a bar filled to its share of the votes, its vote count and its percentage. The poll shows the total, e.g. "7 votes" or "1 vote".
- With no votes, the bars are empty and the poll says "0 votes".
- Your own pick is clearly marked, and not only by colour.
- Votes are anonymous: nobody can see who voted for what. You only see your own pick.
- Counts always come from the server. They are correct whenever the feed loads or the page regains focus, and after each of your own votes. Other people's votes appear the next time the feed refreshes, not live.
- Screen reader users can tell which answer they picked, and each answer's count and percentage.

**General**

- Only signed-in users can create polls and vote, just like the feed itself.
- The page follows the app's existing look and design rules (DESIGN.md).

### Out of scope

- Voters adding their own answers.
- Live updates of other people's votes without a refresh.
- Seeing who voted for what.
- Closing polls, deadlines, multiple-choice polls.
- Editing or deleting polls.
- Searching poll answer text. Search still matches the question, because it is the quack text.
- Measuring how often polls are used.

### Notes

- Answer order is the order the asker entered them. It never changes based on votes.
- Percentages are rounded to whole numbers, so they may not add up to exactly 100%.
