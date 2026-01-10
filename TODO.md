- Fix ids to include both languages. Same for known words.
- support for speech card type
- support for grammar card type
- support multi part regions
- support cross-page multi part regions

## Completed
- [x] add smart card assignment to maximize the study session effectiveness based on review log
  - Cards are distributed equally between user and partner (primary rule)
  - First card goes to user, second to partner, alternating
  - Cards are assigned to the person who knows them less based on last review rating
  - If ratings are equal, assigns to person who reviewed less recently
