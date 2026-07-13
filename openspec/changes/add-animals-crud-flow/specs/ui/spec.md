# Delta for UI

## ADDED Requirements

### Requirement: Animal list and ficha components

UI components MUST support animal cards/tables, empty states, badges, ficha header, image gallery, genealogy, and timeline using Spanish domain copy, token theming, 44px touch targets, and no `dark:` variants.

#### Scenario: Mobile animal card list
- GIVEN animal results exist on mobile
- WHEN the list renders
- THEN each card shows code, name, badges, location, principal image, and accessible navigation.

#### Scenario: Empty animals list
- GIVEN no animals match filters
- WHEN the list renders
- THEN an empty state explains the condition and shows the permitted next action.

### Requirement: Timeline visual contract

Timeline UI MUST render domain-colored events, loading/pagination states, year grouping, local pending states, and inactive/sold/dead banners without relying on color alone.

#### Scenario: Timeline grouped by year
- GIVEN timeline items span more than 12 months
- WHEN the timeline renders
- THEN items are grouped by year and retain descending order.

### Requirement: Image UI invariants

Image UI MUST expose add, mark principal, pending upload, unlink, and limit states while preserving the one-principal invariant.

#### Scenario: Five-image limit shown
- GIVEN five active images exist
- WHEN the gallery renders
- THEN the add action is disabled or absent with explanatory copy.
