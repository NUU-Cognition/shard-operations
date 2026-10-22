---
description: "The plan canvas — coordinates, card sizes, gaps, where a new step appears, the drag rule, the Start and End sentinels, and how an agent lays out a whole plan"
---

# Knowledge: Plan Canvas

The plan canvas shows a plan as a left-to-right graph of step cards. Since (Task) 283 the canvas runs no layout. Every step stores its own position, and a step stays where it was put. The only automatic decision is the spot of a new step, made once. This file tells an agent how positions work, so that a plan that an agent builds looks like a plan that a person built.

Sources: `convex/lib/planPlacement.ts` (new-step placement, shared by the web app and the server), `src/components/plans/plan-placement.ts` (the client half), `convex/lib/planLayout.ts` (the constants and the legacy layout), `src/components/plans/plan-metrics.ts` (card widths), and `onNodeDragStop` in `src/components/plans/plan-view.tsx` (the drag rule). For the step fields and ops, read [[dev-knw-ops-data_model]] § Plans and Steps.

## Coordinates

| Fact | Value |
|------|-------|
| Axes | `x` grows to the right. `y` grows down. Units are canvas pixels at zoom 1. |
| A position is | The **centre** of the card (the canvas uses node origin `[0.5, 0.5]`) |
| Stored on | `plan_nodes.position = {x, y}`; `plans.startPosition`, `plans.endPosition` for the sentinels |
| Origin | No fixed meaning. The canvas fits the view to the cards. `{x: 0, y: 0}` is a good spot for the first step. |
| Direction of work | Left to right. A step should sit to the right of every step it requires. Nothing enforces this; it is the convention. |

## Sizes and Gaps

| Constant | Value | Meaning |
|----------|-------|---------|
| `PLAN_NODE_W` | 224 | The default card width, used when a width is unknown |
| `PLAN_NODE_H` | 56 | The assumed card height: one name line |
| `COL_SPACING` | 80 | The gap from one card's right edge to the next column's left edge |
| `COL_GAP` | 304 | Centre-to-centre distance of two default-width columns (224 + 80) |
| `ROW_GAP` | 88 | Centre-to-centre distance of two rows |
| `PLACEMENT_MARGIN` | 16 | Two cards collide when their edges come closer than this |

**A card is as wide as its content.** The name never truncates. The canvas estimates the width like this (14 px font, about 7.4 px per character when no font is measured):

```
width ≈ 26                       # padding and border
      + 24   if the step has exactly one link (kind icon)
      + max(7.4 × len(title), min(7.4 × len(subtitle), 256))
      + 8 + 4 + 22   if the step has an assignee
      + 4                        # slack
```

A deadline on the step adds a second row, and the card is as wide as its widest row. Examples: "New step" gives about 90 px. A 30-character title gives about 250 px. The Start sentinel is about 91 px wide and the End sentinel about 77 px.

A card with deadlines or a subtitle is taller than 56 px. Leave more than one `ROW_GAP` between such cards.

## Where a New Step Appears

The web app computes the spot on the client and sends it as `position` with the create op. The rule (`placeNewStep`):

**1. The preferred spot**, from the gesture:

| Gesture | Op | Preferred spot |
|---------|----|----------------|
| Root (new lane from Start) | `plans.createNode` with no `requires` | One `COL_SPACING` right of Start's right edge, on Start's row. With no Start (an empty plan): `{x: 0, y: 0}`. |
| After an anchor | `plans.createNode` with `requires: [anchor]` | One `COL_SPACING` right of the anchor's right edge, on the anchor's row |
| Before an anchor | `plans.insertBefore` | One `COL_SPACING` left of the anchor's left edge, on the anchor's row |
| Between two steps | `plans.insertBetween` | The midpoint of the two centres |

In formulas, with `w` the new card width:

```
after:   x = anchor.x + anchor.width/2 + 80 + w/2,  y = anchor.y
before:  x = anchor.x - anchor.width/2 - 80 - w/2,  y = anchor.y
between: x = (before.x + after.x)/2,                y = (before.y + after.y)/2
```

**2. Move down until clear.** While the new box collides with any card or sentinel (edges closer than 16 px), move it down by one `ROW_GAP` (88). Stop at the first clear spot. No existing card moves.

**Server placement.** When the caller sends no `position`, the gateway places the step on the server with the same rules (`convex/lib/planPlacement.ts`, (Task) 297). This applies to `plans.createNode`, `plans.insertBefore`, and `plans.insertBetween`, so to `ops step add` with no `--x --y`. The server rebuilds the canvas scene from the stored rows (`canvasScene`):

- Every visible step at its stored position. A legacy step with no position takes the old auto-layout spot.
- The Start and End sentinels at their stored positions, or at their derived spots.
- Every card is `PLAN_NODE_H` (56) high. The server cannot see deadline rows, so a card with deadlines counts as one line high.

For `createNode` with several `requires`, the anchor is the visible predecessor whose card reaches furthest right. When the anchor is folded (for `insertBetween`, when either step is folded), the server stores **no** position, as the web app does. That step then shows at the legacy auto-layout spot until it is moved. `ops plan show` prints `@ (auto)` for it.

**The server width rule** (`estimateCardWidth`): 7.4 px per character, no font measurement.

```
step:      ceil(26 + (24 if exactly one link) + max(7.4 × len(title), min(7.4 × len(subtitle), 256))
                + (8 + 4 + 22 if a manual assignee) + 4)
sentinel:  ceil(26 + 16 + 8 + 7.4 × len(label) + 4)          # Start 91, End 77
```

The subtitle of a stored step is `0/<n> linked` for a composite (two or more links), the description for a plain step when it differs from the title, and nothing otherwise. The new step itself is estimated from its title alone.

The web app measures real cards, so a spot that the server picks can differ a little from the spot that the web app picks. For a plan that must look exact, compute the positions yourself (below) and send them.

## The Drag Rule

A drag in the web app moves the dragged step **and every step after it** (every descendant through `requires`) by the same offset.

```
dx = drop.x - start.x
dy = drop.y - start.y
for each step in {dragged} ∪ descendants(dragged):
    position = position + (dx, dy)
```

- The web app writes all the new positions in **one** `plans.setPositions` call. The first entry is the dragged step. The branch never shows half-moved, and one undo reverses the whole drag.
- Folded (collapsed) descendants move by the same offset, so the branch stays together when it unfolds.
- A zero-length drag writes nothing.
- A step that is reachable from the dragged step through two paths moves once.

To copy a person's drag, run `ops step move <step> --dx <dx> --dy <dy> --with-downstream --plan <plan>`. The CLI computes the descendants from `requires`, adds the same offset to each, and sends one `plans.setPositions`. A downstream step with no stored position stays where it is, and the CLI reports it as `kept` (the web app moves it from a fallback layout that the CLI does not compute). To move one step alone, run `ops step move` without `--with-downstream` (`plans.setPosition`). To move a sentinel, run `ops step move start|end --plan <plan> --x <x> --y <y>`.

## The Start and End Sentinels

Start and End are virtual. They are not rows in `plan_nodes`. They show only when the plan has at least one visible card.

| Sentinel | Connects to | Derived spot (when no stored position) |
|----------|-------------|----------------------------------------|
| Start | Every root lane (steps with no effective `requires`) | `x` = leftmost card edge − 80 − (Start width)/2; `y` = mean `y` of the roots |
| End | Every terminal step (no step after it) | `x` = rightmost card edge + 80 + (End width)/2; `y` = mean `y` of the terminals |

- A sentinel with a stored position (`plans.startPosition`, `plans.endPosition`) stays there. `plans.setSentinelPosition({orgSlug, planId, which, position})` stores it. A drag of a sentinel moves only the sentinel.
- A derived sentinel moves when the cards move. A stored one does not. After an agent moves or adds many steps, a stored sentinel can end up inside the plan. Then move it to the outer edge again.
- End shows as settled when the plan is completed or every step is done.
- Sentinels are obstacles for the placement of a new step.

## Laying Out a Whole Plan

When an agent builds a plan with many steps, the agent should send a `position` with every create, so that the plan reads well at once. Use this method.

**1. Compute the depth of each step.** Depth 0 is a root. The depth of a step is 1 + the largest depth of the steps it requires (the longest path from a root). A folded step does not take a column.

**2. One column per depth.** Compute each column's width as its widest card. Then:

```
col[0].x = 0
col[d].x = col[d-1].x + col[d-1].width/2 + 80 + col[d].width/2
```

When every card is 224 px wide or less, the simple grid `x = d × 304` is safe.

**3. One row per parallel branch.** Put the main path on row 0 (`y = 0`). Put each parallel branch (a fork) on its own row: `y = row × 88`. Put a join step on the mean `y` of the steps it requires, or on the main path. Use more than 88 per row when cards have deadlines or subtitles (120 is a safe value).

**4. Keep the flow left to right.** A step must sit in a column to the right of every step it requires. Do not put two cards in one column and one row.

**5. Send positions with the creates.** Create steps in depth order (roots first), so that every `requires` ID exists. Pass the computed `position` to `plans.createNode`. To fix a plan after the fact, send one `plans.setPositions` with every step.

**6. Place the sentinels last, or leave them derived.** A derived sentinel follows the cards. Store a sentinel position only when the operator asks.

**Example.** Plan: A → B → D, and A → C → D (a fork and a join), with short titles.

| Step | requires | Depth | Row | Position |
|------|----------|-------|-----|----------|
| A | — | 0 | 0 | `{x: 0, y: 0}` |
| B | A | 1 | 0 | `{x: 304, y: 0}` |
| C | A | 1 | 1 | `{x: 304, y: 88}` |
| D | B, C | 2 | 0.5 | `{x: 608, y: 44}` |

Start derives to the left of A. End derives to the right of D.

## Common Mistakes

| Mistake | Effect | Fix |
|---------|--------|-----|
| No `position` on many creates in a row | The server puts each step right of its anchor, then down until clear. Wide plans with many forks become tall stacks. | Compute the layout and send `--x --y` |
| One `setPosition` per step for a drag | Many undo entries; the branch shows half-moved | One `setPositions` |
| A step left of a step it requires | The edge runs backwards; the plan is hard to read | Keep depth order in `x` |
| A stored sentinel inside the plan | Start or End sits between cards | `setSentinelPosition` to the outer edge |
| Positions as top-left corners | Cards shift by half their size | Positions are centres |
