- Fix ids to include both languages. Same for known words.
- support for speech card type
- support for grammar card type
- support multi part regions
- support cross-page multi part regions

## Completed
- [x] add smart card assignment to maximize the study session effectiveness based on review log
  - Complexity formula: `(1 - normalizedRating) * daysSinceReview`
  - Preference = userComplexity - partnerComplexity
  - Cards sorted by preference, then split: first half to user, second half (reversed) to partner
  - Interleaved: user cards at even positions, partner cards at odd positions
  - Primary rule: equal distribution between user and partner
  - Hardest cards for each person appear first in their queue
