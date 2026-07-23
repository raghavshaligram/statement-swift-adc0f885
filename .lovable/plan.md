# Align preview page layout with the reference

## What's actually different (that I missed before)

Comparing the two screenshots side by side:

| Element | Current | Desired |
|---|---|---|
| Page heading "Preview & edit transactions" | Present, large, above everything | **Removed** — page starts directly at the dark stat strip |
| Yellow "Bank not recognized…" warning banner | Sits above the stat strip | **Removed** from top; parser warnings should not push the strip down |
| Row vertical padding | Loose (`py-2` + line-height blows rows up when description wraps) | Compact, single-line rows |
| Description column | Wraps / shows merged multi-line text | Truncated to a single line with ellipsis |
| Confidence legend footer | Exists in code but off-screen in current view | Visible below the table |
| Flagged row treatment | Currently shows amber left border only when tier=low | Same, keep as-is — already matches |

## Changes

### 1. `src/routes/preview.tsx` — drop the AppShell page title

Right now the page is wrapped in `<AppShell title="Preview & edit transactions">`, which renders the big heading. Switch to `<AppShell>` with no title so the dark stat strip becomes the top element in the content area, matching the reference.

### 2. Move parser warnings out of the top slot

The `warnings.length > 0` block that renders the yellow "Bank not recognized" banner currently sits above the stat strip. Move it **below** the toolbar (or collapse it into a small inline chip near the "flagged" stat) so it doesn't push the stat strip down and doesn't appear in the top viewport.

Recommended: render warnings as a compact inline note directly under the toolbar row, using the existing amber styling but smaller — a single line, not a full banner.

### 3. Tighten table row density

- Table cell padding: `px-3 py-2` → `px-3 py-2.5` stays, but constrain description cell to one line: add `whitespace-nowrap overflow-hidden text-ellipsis max-w-[520px]` on the description `<td>` inner wrapper.
- Ensure amounts stay right-aligned single-line (already are).

### 4. Verify legend footer is reachable

The `CONFIDENCE ≥90% high / 75-89% medium / <75% low` legend is already coded at the bottom of the page. With the heading + banner removed, it should now be visible without scrolling on a typical viewport. No code change beyond the removals above.

## Files touched

- `src/routes/preview.tsx` — remove AppShell `title` prop, relocate warnings block, add truncation classes on description cell.

## Out of scope

- No changes to stat strip labels, toolbar, sort arrows, currency formatting, or footer legend — those already match the reference from the previous pass.
- No changes to `AppShell` component itself (title prop stays optional as it already is).
- No changes to parsing logic or the actual description string content — cleaning up merged multi-line descriptions is a parser-level fix, tracked separately.
