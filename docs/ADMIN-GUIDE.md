# Admin Guide — Importing Matches & Results

Two routine jobs run the competition each day:

1. **Import today's matches** → makes them visible and opens predictions.
2. **Import results** → auto-scores every prediction and updates the leaderboard.

Log in as your admin account, then use the **Admin** link in the navigation.
Sample files live in [`/samples`](../samples).

---

## TASK A — Import today's matches

### 1. Prepare the CSV
Columns (header row required):

```
Tournament,Draw,Time (BST),Time (AEST),Player 1,Player 2,Status
```

Example:
```
Tournament,Draw,Time (BST),Time (AEST),Player 1,Player 2,Status
Wimbledon,ATP Men's Singles,13:30,22:30,Carlos Alcaraz,Jan-Lennard Struff,Upcoming
Wimbledon,WTA Women's Singles,12:30,21:30,Iga Swiatek,Emma Raducanu,Upcoming
```

Rules:
- **No date column** — you pick the date at upload time.
- ATP/WTA is auto-detected from the **Draw** ("ATP"/"WTA" or "Men's"/"Women's").
- **Best-of (3 vs 5)** is auto-detected (men's Grand Slam singles = best-of-5).
- `Time (AEST)` is optional — if blank it's calculated from BST.
- Duplicate matches (same tournament + players) are rejected.

### 2. Open the import screen
Admin → **Matches** tab.

### 3. Set the match date
In the **Import daily matches** card, set **Match date** (defaults to today).

### 4. Upload & import
Choose your **CSV file** → click **Import**.

### 5. Check the summary
You'll see: **created / duplicates / invalid**.
- If any rows are invalid, click **Download error report**, fix those rows, and re-import (already-created matches won't duplicate).

### 6. Review the pending matches
Imported matches appear under **Pending matches** as *Upcoming* (not yet visible to users). For any row you can:
- ✏️ **Edit** player names, BST time, or round.
- 🗑️ **Delete** a wrong row.

### 7. Publish
Click **Publish all (N)**. Matches flip to *Open* — now visible on users' **Today's Matches** and **predictions are open**.

> ⏰ Predictions for each match **lock automatically at its start time**. Publish *before* play begins so users can predict.

### 8. Verify
Open **Today's Matches** (as any user, or yourself) — the matches should appear in the prediction flow.

---

## TASK B — Import results (auto-scores everything)

### 1. Prepare the results CSV
Columns (header row required):

```
Tournament,Date,Match_Time_BST,Draw,Round,Player_1,Player_2,Set1_P1,Set1_P2,Set2_P1,Set2_P2,Set3_P1,Set3_P2,Set4_P1,Set4_P2,Set5_P1,Set5_P2,Winner,Score
```

Example:
```
Wimbledon,2026-06-29,13:30,ATP Men's Singles,Round 1,Carlos Alcaraz,Jan-Lennard Struff,6,3,6,4,6,2,,,,,Carlos Alcaraz,3-0
Wimbledon,2026-06-29,12:30,WTA Women's Singles,Round 1,Iga Swiatek,Emma Raducanu,6,4,6,3,,,,,,,Iga Swiatek,2-0
```

Rules (important for matching):
- **Player names and tournament must match the scheduled match.** Matching ignores ATP/WTA prefixes and player order, but spelling must be the same.
- **Date** can be `YYYY-MM-DD` or `DD/MM/YYYY`.
- **Winner** must be exactly one of the two players.
- Leave unplayed sets **blank** (or `0,0`) — only played sets are scored.
- `Score` is sets won, e.g. `3-1`. If omitted, it's derived from the set games.

### 2. Open the import screen
Admin → **Results** tab.

### 3. Upload & score
Choose your **Results CSV** → click **Import & score**. This single action:
- updates each match's winner, score and set scores → status *Finished*,
- **scores every user's prediction** (winner +15, exact score +15, each exact set +10),
- **recomputes the leaderboard / ranks**,
- **sends each user a notification** with their points and new rank.

### 4. Read the summary ("Results Import Complete")
Check: **matches updated**, **predictions scored**, **notifications sent**, and **unmatched** rows.

### 5. Fix any unmatched rows
If **unmatched > 0**, a result row didn't match a scheduled match — usually a name spelling/tournament mismatch. Fix the CSV (or the match via the Matches tab) and **re-import**. Re-importing is **safe/idempotent** — it just re-scores.

### 6. Verify
- **Leaderboard** updated with points and medals.
- A user's **My Predictions / History** shows points and green/red per pick.

---

## Daily cheat-sheet

| When | Do |
|------|----|
| Morning (before play) | Task A → import matches → **Publish** |
| During play | Predictions lock automatically at each match start |
| After matches finish | Task B → import results → everything scores automatically |

## Prediction cut-off (Admin → Settings)
A daily deadline (**Australian Eastern time, AEST**) after which users can't add or
change predictions. Go to **Admin → Settings → Prediction cut-off** to:
- **Change the time** (e.g. 19:00 = 7:00 PM AEST), or
- **Disable it** entirely (then predictions only lock when each match starts).

Matches still also lock individually the moment they start — the cut-off is an
additional, earlier deadline that applies to the whole day.

## Resetting
Admin → **Results** → **Reset competition** clears all predictions & scores (keeps users) — use only to start a fresh competition.
