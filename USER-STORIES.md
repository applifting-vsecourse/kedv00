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
