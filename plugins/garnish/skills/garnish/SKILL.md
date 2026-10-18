---
name: garnish
description: Use only when the user asks for it by name or asks to add fun, whimsy, personality, in-jokes, or wordplay to a project, file, or text. Reads dry text, finds or proposes a conceit that fits the project, and suggests a few harmless places to have fun with it. Suggests only; never edits until the user picks.
---

# Garnish

Plain writing is the meal. This is the garnish: a small amount, placed with
care, that makes the plate feel like a person made it.

Your job is to find a few spots in dry text where a bit of fun fits, and
suggest them. The user picks. Their choosing is the point: the whimsy is
theirs, you just point at the places it could go.

**Never edit until the user picks a suggestion.** Then apply only what they
picked.

## What good whimsy looks like

Generic whimsy is the failure mode. Puns with no connection to the project,
"Let's dive in!", emoji, exclamation points, a joke in every line. That reads
as machine-written, which is the opposite of the goal.

Good whimsy is **specific and consistent**. It comes from one conceit, a
governing metaphor, pushed into the corners of the project. Example: a
workflow tool renamed Jams (Job AI Management System). Workflows are
"playlists," skills are "tracks." Once the conceit exists, the fun writes
itself:

- A failed track is "skipped." A retry is "on repeat."
- The docs are "liner notes." A run summary is the "setlist."
- An optional final step is the "encore." Rarely-used tracks are "B-sides."
- `jams remix <playlist>` forks a playlist. `--shuffle` randomizes order.

Each of those is funny only because of the others. Ten unrelated puns are
worth less than one conceit carried through.

### Why that works

A joke lands in two beats. First the reader hits something that doesn't fit
("the docs are called liner notes?"). Then they find the rule that makes it
fit ("oh, it's a record"). The click of finding the rule is the fun. The
conceit is that rule. A bit with no rule behind it leaves the reader
puzzled, not amused.

The thing that doesn't fit has to be **slightly wrong but clearly okay**.
Dry text is all okay and nothing wrong, which is why it's dry. Too wrong and
the joke turns into an insult, a confusion, or a liability. Three things
keep a small wrongness okay:

- **Low stakes.** Nobody cares much how a `--version` line is worded.
- **Distance.** The reader isn't in trouble when they see it. A joke in a
  success message lands; the same joke in an error, while someone is
  stuck, stings.
- **An obvious play frame.** Once the conceit is established, everyone knows
  "skipped" is the playlist talking, not a sloppy word choice.

To extend a conceit, use the improv rule: **if this is true, what else is
true?** If workflows are playlists, what is a retry, a fork, an optional
last step? To check that a conceit fits, ask the other half: **why is this
true?** If you can't say why the project is like a record collection, the
conceit is decoration.

Heightening doesn't have to mean bigger. Understatement often lands better
than a flourish: a deadpan "encore" for an optional step beats "🎉 ENCORE
TIME! 🎉".

The test for every suggestion: **would a teammate grin, or wince?** A grin
comes from finding the rule ("of course the docs are liner notes"). A good
pun earns a groan, and that groan is part of the fun. A wince comes from
effort with no rule behind it ("the deploy is *deploy-lightful*").

### Wordplay

Sound-based wordplay is a favorite here. Reach for it. It still has to
resolve: the reader hears the twist and then sees why it fits.

- **Puns on real double meanings.** The best puns work in both senses at
  once, and the best of those use the project's own vocabulary. "Jams" is a
  set of music tracks and also the thing a stuck job does. "Track" means a
  song and also following progress. A pun that only works in one sense is
  just a misspelling.
- **Sound-alike puns.** Swap a word for one that sounds close and still
  makes sense in context. The closer the sound, the better it lands. If you
  have to bend the pronunciation to hear it, cut it.
- **Spoonerisms.** Swap the first sounds of a two-word phrase. They land
  when both new words are real and the result is funny on its own: "cache
  miss" becomes "mash kiss," "bit flip" becomes "fit blip." Say the swap out
  loud before suggesting it. Many spoonerisms come out crude; check that
  yours doesn't, and drop it if it does. Use them as names, codenames, easter
  eggs, or a one-line aside, never where the original term has to be
  searched for.
- **Backronyms and recursive acronyms.** Jams is "Job AI Management System."
  The expansion should be both plausible and a little smug about it.

Skip the famous ones. "Cache me if you can" and "there's no place like
127.0.0.1" were funny the first thousand times. A pun the reader has seen
before reads as borrowed, not made.

### Voice

Sometimes the fun is in who seems to be talking, not in the words. Write a
line in a voice that doesn't match its job:

- **Mock grandeur.** Epic language for something mundane. "Config
  validated. The prophecy holds." for `-validate` passing.
- **Bureaucratic deadpan.** Formal, procedural language for something
  trivial. "Your request to do nothing has been received and processed."
  for a no-op run.
- **Understatement.** Flat calm for something big. "Rotated 400
  certificates. Nobody noticed, which was the point."
- **A tool with a personality.** Weary, proud, or quietly smug, used the
  same way everywhere so it reads as a character. One voice per project;
  record it in `LORE.md`.

Irony is aimed at the tool or the situation, never at the reader. Text has
no tone of voice, so sarcasm toward the user ("Wow, great config.") reads
as contempt. Keep voice to good spots: success messages, no-ops, `--help`,
taglines. An ironic voice in an error tells a stuck person their problem is
funny.

## Step 1: find the lore

Look for `LORE.md` at the repo root. If it exists, it records the project's
conceit, its vocabulary, running gags, and suggestions the user already
rejected. Work inside it. Extend the conceit, reuse its vocabulary, build on
the running gags, and never re-suggest anything on the rejected list.

Prefer a callback to a new bit. A running gag that shows up again in a new
place lands harder than a fresh joke, because the reader already knows the
rule. That's how inside jokes form.

If there's no `LORE.md`, look for a conceit the project already has without
writing it down. Signs: a project name that's an acronym or a pun, thematic
names for components, a mascot, a codename scheme. If you find one, use it
and say what you found.

## Step 2: if there's no conceit, propose one

Read enough to know what the project is: the README, the top-level layout,
the names of its main parts. Then propose **two or three** candidate
conceits. Each one must be **thematic to the project**: it maps onto what
the project actually does, so the vocabulary carries meaning. A conceit that
only sounds fun is decoration.

For each candidate, give:

- **The conceit** in a few words.
- **Why it fits:** the structural match. For Jams, a DAG of skills run in
  order maps onto a playlist of tracks.
- **Three sample mappings** from the project's real parts to the conceit's
  vocabulary. Each mapping covers a different part of the project. Two
  mappings of the same idea count as one: for a TLS proxy, "glances at the
  ID" for `require` and "reads the ID" for `verify` are both the cert
  check. If you can't find three distinct parts the conceit covers, it
  won't last; drop it.

Recommend one and say why. Prefer the conceit with the most natural mappings
and the most room to grow. A conceit that only covers the project name runs
out after one joke.

If the project already has a plain, well-known name that others depend on,
the conceit goes into flavor (help text, codenames, empty states), not into
renaming things. Say so.

## Step 3: find the dry spots

Scan the target for places a bit of fun fits. The target is whatever the
user pointed at: a file, a directory, pasted text, or the work in front of
you. Pick **two or three** suggestions by default, five at most. The user
asked for a garnish, not a rewrite.

Rank spots by how safe they are:

**Good spots.** The joke can't cost anyone anything.

- Names and codenames: projects, releases, internal tools, branches, test
  fixtures, sample data.
- CLI help footers, `--version` output, empty states, success messages,
  "nothing to do" messages.
- Changelog and release-note headers, README taglines, section titles in
  internal docs.
- Easter eggs: a hidden flag, a comment in the config, a fixture named after
  the running gag.

**Careful spots.** Fun is fine only if every piece of information survives.

- Error and warning messages. `Track skipped: deploy.md not found` keeps the
  facts. "Oops, the record skipped!" loses them.
- Log lines people search. Keep the searchable term and add flavor around it.
- Renaming anything. Keep the old name as an alias, or don't rename.

**Never.**

- Alert titles and paging text. Someone reads those at 3am. Flavor can go in
  a description footer, never the title.
- Incident communications, postmortems, security messages, anything about a
  customer's data or money.
- Anything that makes fun of a person, a team, or a user's mistake.
- Text another team or the public must parse exactly: API fields, schema
  names, contract terms.

**Weigh how often people see it.** Jokes wear out with repetition faster
than plain text does. Prefer spots people see now and then: `--version`,
empty states, release names, a help footer. On output people see every
run, keep the flourish to a word ("skipped," not a sentence about the
record), so it reads as vocabulary rather than a joke told for the
hundredth time.

## Rules for every suggestion

- **The joke rides alongside the information; it never replaces it.** Every
  fact, identifier, and command in the original is still there after.
- **One bit per surface.** One flourish in a help screen, not one per line.
- **No generic whimsy.** No emoji unless the project already uses them. No
  exclamation points as a substitute for a joke. No "Oops!", "Whoops!",
  "Let's go!", "Magic!", "Voilà!".
- **It has to land without explanation** for someone who knows the project.
  If it needs the "why it's funny" note to work, cut it.
- **Laugh with, never at.** Good team humor brings people in: shared lore,
  a running gag, the tool poking fun at itself. Humor that targets a person,
  a team, or a user's mistake does the opposite, even when it's clever.
- **Outsiders still get the information.** An inside joke is fine, but
  someone who doesn't get it should read past it without losing anything.
  This matters most in anything public or shared with other teams.
- **Wordplay works best inside the conceit.** A pun on the conceit's
  vocabulary lands twice. A standalone pun or spoonerism is fine when it's
  specific to the project and good; say it's standalone. The hacker naming
  tradition (GNU's Not Unix, EINE Is Not Emacs) works because the joke comes
  out of what the thing is.
- **Mix the forms.** Across two or three suggestions, vary the technique:
  a conceit extension, a piece of sound-based wordplay, a line in an
  unexpected voice. Use whichever have a good candidate. Don't force one
  that isn't there.

## What to return

Lead with the conceit: the one from `LORE.md`, the one you found, or your
two or three candidates with a recommendation. Then the suggestions, each
with:

- **Where:** `path:line`, or a quote of the spot if there's no file.
- **Before / after:** the exact text both ways.
- **Why it fits:** one line tying it to the conceit.
- **Risk:** "good spot" or "careful spot," and for a careful spot, what
  information it keeps.

Number the suggestions so the user can pick by number. Stop there. No offer
to do more, no list of other ideas.

## After the user picks

1. Apply exactly the picked suggestions. Keep any wording changes the user
   asked for.
2. Update `LORE.md`, creating it if this is the first time. Record the
   conceit, add the accepted terms to the vocabulary, and add the suggestions
   the user turned down to the rejected list so they don't come back. Ask
   before creating the file the first time; it goes in the repo, where
   collaborators will see it.

`LORE.md` uses this shape. Keep it short; it's a reference, not a story.

```markdown
# Lore

## Conceit
Jams is a record collection. Workflows are playlists, skills are tracks.

## Voice
A weary roadie who has seen every tour.

## Vocabulary
| Project term | Lore term | Where it appears |
|---|---|---|
| failed step | skipped | run output |
| docs | liner notes | docs/ directory title |

## Running gags
- Every release is named after a fictional album.

## Rejected
- "Drop the beat" for deploy: too much.
```

Garnish is a finishing pass. If the text also needs cleanup, do that first
(for example with reader-first-writing), then garnish the clean version.
