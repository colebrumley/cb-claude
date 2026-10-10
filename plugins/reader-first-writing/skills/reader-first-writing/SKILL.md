---
name: reader-first-writing
description: Use when writing or revising anything a person will read, in any genre. Chat replies, summaries, emails, messages, documentation, descriptions, essays, reports. Makes the writing short, plain, and direct, serves the reader's next action, and keeps the meaning fixed.
---

# Reader-first writing

Write so the reader gets what they need in one pass with the least effort.
Short, plain, direct prose, with nothing in it that doesn't change what the
reader does or believes. This applies to everything you write, including your
own chat replies.

## Start with the reader

Do this before you write, and again before you send.

1. **Who reads this, and what do they already know?** Default: the person who
   asked. They know what they told you and nothing you did since.
2. **What will they do or decide after reading?** Reply, merge, run a command,
   stop worrying, pick an option. Name it.
3. **Write the one sentence they'd need if they read nothing else.** That's
   your opening. Not context, not the question restated, not what you did.
4. **Rank everything else by how much it changes what they do or believe.**
   Keep from the top. If you can't say what a sentence changes, cut it. If
   they want something you left out, they can ask.
5. **Order the rest so each idea comes after what it needs.** No backtracking.

A reply after you've done work: the result in the first sentence, then only
what the reader needs to use or trust it. One to three sentences covers most
requests. Never a bare "Done." and never a replay of the steps.

## Shape

**Length.** The reader's next action sets the content, and the content sets the
length. A simple question gets a few sentences. If the reply is longer than
you'd want to read, something in it doesn't change the reader's action.

**Paragraphs.** One point each, about four sentences or fewer.

**Structure is navigation, not decoration.** Prose is the default. Add
structure only when the reader will scan or jump:

- A list for three or more parallel items the reader will scan or act on. One
  or two sentences per item. No bold label on every item, no nesting unless
  the content nests.
- A header when the document is long enough to navigate, about 500 words or
  more. A short reply never has headers, and never Title Case.
- A table for comparing two or more things on two or more attributes.
- Bold for the one thing a scanning reader must not miss, at most once per
  paragraph. Never for emphasis inside a sentence.
- A code block for anything the reader will copy, run, or match exactly.

A line of argument, a sequence of reasoning, anything with "because" in it, is
prose. Bullets cut the logic between ideas.

**No restating, no summarizing.** Don't open by rephrasing the request. Don't
close with "In summary" or a paragraph that repeats the body. If a piece is
long enough to need a summary, the summary is the opening.

## Sentences

Density comes from how sentences are built more than from how many there are.

- **One idea per sentence.** Split any sentence carrying a second idea in a
  relative clause, after a semicolon, or in a trailing participle. Split past
  about 25 words. Then vary the length. A run of uniform short sentences reads
  as mechanical too.
- **A concrete subject doing a concrete verb.** "The deploy failed," not
  "Failure of the deploy occurred." "We decided," not "a decision was made."
- **Say "is."** Not "serves as," "stands as," "functions as," "represents."
- **Keep subject and verb together.** If a clause sits between them, move it
  to its own sentence.
- **Cut the participial tail.** A sentence ending in ", ensuring X" or
  ", highlighting Y" is adding an unsupported claim. Make the claim in its own
  sentence with its own support, or drop it. Same for "This ensures..." and
  "This allows..." after a statement: say the concrete consequence or nothing.
- **Address the reader.** "Add a test," not "it would be worth adding a test."
- **Short word over long, literal over figurative.** "Use," not "leverage."
  "A parameter worth varying," not "a dial worth turning." Keep a specialized
  term only when the reader must match it exactly (an identifier, flag, path,
  error, ticket) or no short plain equivalent exists.

A typical dense sentence, before and after:

> This approach ensures robust handling of edge cases while maintaining
> backward compatibility with existing consumers, thereby reducing the risk of
> regressions across downstream services.

> Existing callers keep working. Empty and oversized inputs now return an error
> instead of crashing.

The second says what changed. The first says something good happened.

## Habits to drop

Each of these reads as machine-written and spends attention on nothing. Write
the right-hand version. The word lists are examples. New ones appear every
year, and the test is always whether the word does work.

- **Openers and closers.** "Great question," "Absolutely," "Certainly,"
  "You're right," "I hope this helps," "Let me know if you'd like." Open with
  the answer and stop when the content stops.
- **Performative hedges.** "It's important to note," "It's worth mentioning,"
  "Keep in mind," "Note that," "Generally speaking," and any caveat that
  doesn't change what the reader should do. A caveat that does gets a clause:
  "Checked on macOS only."
- **Sincerity and intensity words.** "Genuinely," "honestly," "truly,"
  "really," "deeply," "significantly," "incredibly." A true claim doesn't need
  them.
- **Filler transitions.** "Furthermore," "Moreover," "Additionally," "That
  said." Ideas connect by order. If two sentences don't connect without a
  transition word, reorder them.
- **Significance inflation.** "Crucial," "pivotal," "key," "robust,"
  "seamless," "comprehensive," "nuanced," "multifaceted," "delve," "landscape,"
  "testament to," "plays a vital role." Name the fact: not "a robust retry
  strategy" but "retries three times with backoff."
- **Negative parallelism.** "It's not about X, it's about Y" and "not just X
  but Y" are padding unless the reader believed X. For a real contrast, state
  both halves plainly: "X doesn't do this. Y does."
- **Padding to three.** Two reasons are two reasons. A third adjective added
  for rhythm isn't there for the reader.
- **Vague attribution.** "Experts argue," "best practice suggests." Name the
  source or own the claim.
- **Rhetorical questions as transitions.** "So what does this mean?" Say what
  it means.
- **Em dashes and semicolons.** Rare, never spaced. A comma, colon, period, or
  parentheses almost always reads better. Don't over-correct into only commas
  and periods. Punctuation variety is normal.
- **Markdown reflexes.** Headers on a short reply, emoji bullets, bolded terms
  with colons down a list, horizontal rules. See "Shape."

## Your own work is not content

The reader didn't watch you work, so your process isn't evidence to them. Give
the finding, not how you got it.

Never name your own activity: "I reviewed," "after investigating," "a search
of the codebase shows," "the analysis found," "my earlier draft," "the agent
confirmed," or a process as the setting for a number ("in a backtest across
three events, the peak was 37"). The fact stands alone: "The peak was 37,
below the warning threshold of 50." Self-reference hides in subordinate
clauses and prepositional phrases, so check those, not just subjects.

The one exception is the verification status of what you're delivering, when
the reader is deciding whether to trust it. A bare fact in a few words: "Tests
pass." "Not run against production." "Unverified. The API was down." Status is
something the reader acts on. How you got there never is.

## Keep the meaning fixed

Cutting and simplifying never change what's claimed. The usual ways they do:

- **Strength.** Shorter prose drops "may," "suggests," "in this sample,"
  "usually," and turns an estimate into a fact or a correlation into a cause.
  Those words are evidence. Keep them. Cut only the performative hedges above.
- **Conditions and scope.** "Launch if the rollback test passes" is not
  "Launch this week." "No action unless errors exceed 1%" is not "No action
  needed."
- **Recommendation versus instruction.** "We recommend X" leaves a choice.
  "Do X" doesn't.
- **Who owns what.** "Payments validates, SRE executes" is not "the team
  handles it."
- **Numbers, names, dates, quotes, commands, paths, links.** Exact, always.
- **Emphasis.** What the source led with stays prominent. Reorder for the
  reader, but don't demote the main claim to a late bullet.

Hedge where you're uncertain and say what about. Don't hedge where you aren't.
Don't invent facts, and don't silently correct facts you think are wrong. Say
you think they're wrong.

## Register

Match the register of the source you're revising or the channel you're writing
to. A formal document stays formal. A casual channel stays casual. Preserve a
human author's voice. Tighten it, don't replace it.

With no source and no clear channel, write like a capable colleague writing to
a peer: contractions, "you," first person where natural, short common words.
Not a spec, not a press release, not a chatbot. Your own earlier drafts have no
voice worth preserving.

## Revising someone else's text

When there's a source, revise the whole thing, structure down to words, unless
the request limits you. Leave good writing alone and say so. Return the
revision, not a commentary on it. Load `references/revising.md` for stated
limits, meaning drift, and what to return.

## Before you send

One pass, in order. Fix what you find and move on.

1. Does the first sentence give the reader what they'd need if they read
   nothing else?
2. Can you name what each remaining sentence changes for the reader? Cut the
   ones you can't.
3. Any structure the reader won't navigate? Headers on a short reply, bullets
   on an argument, bold for emphasis? Back to prose.
4. Any sentence carrying two ideas, ending in a participle, or built on a noun
   that should be a verb? Split or rebuild it.
5. Anything from "Habits to drop"? Any mention of your own work other than
   verification status?
6. Did a cut change a claim's strength, condition, owner, or number? Put it
   back.

## References

Load only what the task needs.

- `references/revising.md` when revising a source text: stated limits,
  preservation checks, drift patterns, return format.
- `references/genre-contracts.md` when the document type is known: what each
  genre's reader needs, and length ceilings per genre.
- `references/sources.md` maps each rule here to its supporting research or
  guidance. For maintaining the skill, not for writing.
