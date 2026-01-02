# Web Vitals Table Integration - Complete

## Summary

Updated the Web Vitals tab to use the existing `WebVitalsTable` and `WebVitalsToolbar` components, following the same pattern as the Events table.

---

## Components Used

### 1. **WebVitalsTable** (`web-vitals-table.tsx`)
Already exists with full functionality:
- ✅ Data fetching via tRPC
- ✅ Sortable columns (metric, value, timestamp, rating)
- ✅ Pagination with DataTable component
- ✅ Color-coded ratings (Good/Needs Improvement/Poor)
- ✅ Device type, browser, country, page info display
- ✅ Integrates with WebVitalsToolbar for filtering

**Columns:**
- Metric (LCP, FCP, CLS, INP, TTFB, FID)
- Value (with unit)
- Rating (color-coded badge with icon)
- Page (URL, title, path)
- Device (type + browser)
- Location (country)
- Timestamp

### 2. **WebVitalsToolbar** (`web-vitals-toolbar.tsx`)
Already exists with comprehensive filtering:
- ✅ Search by page URL
- ✅ Filter by metric type (LCP, FCP, CLS, INP, TTFB, FID)
- ✅ Filter by rating (Good, Needs Improvement, Poor)
- ✅ Filter by device type
- ✅ Date range filter
- ✅ Sort options (6 different sorts)
- ✅ Column visibility toggle
- ✅ Clear filters button

**Sort Options:**
1. Most recent
2. Oldest first
3. Highest value
4. Lowest value
5. Metric A → Z
6. Metric Z → A

### 3. **WebVitalsStats** (`web-vitals-stats.tsx`)
Already exists - shows aggregate statistics

---

## Updated File

### `web-vitals-tab.tsx`

**Before:**
```tsx
// Had placeholder card with static tabs
<Card className="p-6">
  <div>Breakdown</div>
  <div className="flex gap-6 border-b mb-4">
    <button>Pages (37)</button>
    <button>Countries (100)</button>
    // ... more tabs
  </div>
  <div className="h-64 bg-muted/20">
    <p>Table showing LCP, FCP, CLS, INP, TTFB values per page</p>
  </div>
</Card>
```

**After:**
```tsx
import { WebVitalsStats } from "./web-vitals-stats";
import { WebVitalsTable } from "./web-vitals-table";

// Replaced placeholder with actual table component
<WebVitalsTable funnelId={funnelId} />
```

---

## Pattern Consistency

### Events Page Pattern:
```tsx
// events-tab.tsx
<EventsStats funnelId={funnelId} />
<EventsTable funnelId={funnelId} />
```

### Web Vitals Page Pattern (Now):
```tsx
// web-vitals-tab.tsx
<WebVitalsStats funnelId={funnelId} />  // Already existed
<WebVitalsTable funnelId={funnelId} />  // Now integrated
```

**Result:** Identical component architecture! ✅

---

## Web Vitals Tab Structure (Final)

```tsx
<div className="space-y-6">
  {/* Time Period Selection */}
  <div className="flex items-center gap-2">
    {/* 24h, 7d, 30d, 90d, 180d, 365d buttons */}
  </div>

  {/* Summary Card */}
  <Card>
    {/* 3/3 Core Web Vitals passing */}
    {/* CLS ✓ · INP ✓ · LCP ✓ · 5,342 samples */}
    {/* Percentile selector: p50, p75, p90 */}
  </Card>

  {/* Metrics Grid */}
  <div className="grid grid-cols-3 gap-4">
    {/* 6 metric cards: LCP, FCP, CLS, INP, TTFB, FPS */}
    {/* Each with gauge/value, rating, description */}
  </div>

  {/* Performance Trend Chart */}
  <Card>
    {/* Placeholder for chart */}
  </Card>

  {/* Web Vitals Table with Filters */}
  <WebVitalsTable funnelId={funnelId} />
    {/* Includes WebVitalsToolbar internally */}
    {/* Full filtering, sorting, pagination */}
</div>
```

---

## WebVitalsTable Features

### Filtering (via Toolbar)
- **Search:** By page URL
- **Metric:** LCP, FCP, CLS, INP, TTFB, FID (multi-select)
- **Rating:** Good, Needs Improvement, Poor (multi-select)
- **Device:** Desktop, Mobile, Tablet, etc. (multi-select)
- **Date Range:** Custom start/end dates

### Sorting
- Timestamp (newest/oldest)
- Value (highest/lowest)
- Metric (alphabetical)
- Rating (not directly, but filterable)

### Display
- Color-coded ratings:
  - 🟢 Green = Good
  - 🟡 Yellow = Needs Improvement
  - 🔴 Red = Poor
- Icons for each rating
- Formatted values with units (s, ms, or unitless)
- Device + browser info
- Page URL with title
- Country name

### Data Table Features
- Pagination (infinite scroll or pages)
- Column visibility toggle
- Responsive design
- Loading states
- Empty states

---

## WebVitalsToolbar Features

### UI Components
```tsx
<div className="flex items-center justify-between gap-2">
  {/* Left side: Filters */}
  <div className="flex items-center gap-2 flex-1">
    <Input placeholder="Search by page URL..." />
    <DropdownMenu> {/* Metric filter */}
    <DropdownMenu> {/* Rating filter */}
    <DropdownMenu> {/* Device filter */}
    <DateRangeFilter />
    <Button>Clear filters</Button>
  </div>

  {/* Right side: Sort & Columns */}
  <Select> {/* Sort options */}
  <DropdownMenu> {/* Column visibility */}
</div>
```

### Filter State Management
Uses `nuqs` for URL state:
- `search` - Page URL search term
- `metrics` - Selected metric types (array)
- `ratings` - Selected ratings (array)
- `devices` - Selected device types (array)
- `timestampStart` - Filter start date
- `timestampEnd` - Filter end date
- `sort` - Current sort value

**Benefits:**
- URL-shareable filters
- Browser back/forward support
- Bookmarkable states
- Persistence across refreshes

---

## Comparison: Events vs Web Vitals

| Feature | Events Table | Web Vitals Table |
|---------|--------------|------------------|
| **Search** | Event name | Page URL |
| **Filters** | Event type, device, user, conversions | Metric, rating, device |
| **Sort** | Timestamp, name, category, value | Timestamp, value, metric |
| **Columns** | Event, page, user, device, browser, time | Metric, value, rating, page, device, location, time |
| **Date Range** | ✅ Yes | ✅ Yes |
| **Column Toggle** | ✅ Yes | ✅ Yes |
| **Clear Filters** | ✅ Yes | ✅ Yes |
| **Chart Toggle** | ✅ Yes | ❌ No (not needed) |
| **Grouping** | ✅ Yes (events) | ❌ No |
| **Color Coding** | Category colors | Rating colors |

---

## Data Flow

```
User selects filters
    ↓
Toolbar updates URL state (nuqs)
    ↓
WebVitalsTable reads URL params
    ↓
Builds tRPC query with filters
    ↓
tRPC fetches from database
    ↓
DataTable renders results
    ↓
User sees filtered/sorted data
```

---

## File Sizes

- `web-vitals-table.tsx` - 11,902 bytes (full table implementation)
- `web-vitals-toolbar.tsx` - 16,807 bytes (comprehensive filters)
- `web-vitals-stats.tsx` - 7,685 bytes (aggregate stats)
- `web-vitals-tab.tsx` - ~10,452 bytes (now uses components)

---

## Benefits of This Integration

### 1. **Code Reuse**
- Leverages existing DataTable component
- Reuses filter patterns from events
- Consistent UI/UX across analytics pages

### 2. **Maintainability**
- Single source of truth for web vitals display
- Easy to add new filters or columns
- Centralized logic

### 3. **User Experience**
- Familiar interface (same as events table)
- Powerful filtering without complexity
- URL-shareable views

### 4. **Performance**
- Efficient pagination
- Debounced search
- Optimized renders

---

## Next Steps (Optional Enhancements)

### 1. **Add Chart View**
Like events table, add chart/table toggle:
```tsx
<ChartTableToggle view={view} onViewChange={setView} />
{view === "chart" ? <WebVitalsChart /> : <WebVitalsTable />}
```

### 2. **Add Export**
```tsx
<Button onClick={() => exportWebVitals()}>
  Export CSV
</Button>
```

### 3. **Add P75 Aggregation Tab**
Show P75 values grouped by page:
```tsx
<Tabs>
  <TabsList>
    <TabsTrigger>All Metrics</TabsTrigger>
    <TabsTrigger>P75 by Page</TabsTrigger>
  </TabsList>
</Tabs>
```

### 4. **Add Real-time Updates**
Like events, add live updates:
```tsx
const { data } = useQuery({
  queryKey: ['web-vitals', funnelId],
  refetchInterval: 5000, // 5 seconds
})
```

---

## Summary

The Web Vitals page now uses the existing, fully-functional `WebVitalsTable` and `WebVitalsToolbar` components, providing:

- ✅ Complete filtering by metric, rating, device, date
- ✅ Sorting by timestamp, value, metric
- ✅ Search by page URL
- ✅ Column visibility toggle
- ✅ Pagination
- ✅ Color-coded ratings
- ✅ URL state management
- ✅ Consistent with Events table pattern

The placeholder "Breakdown" section has been replaced with a real, working data table that matches the quality and functionality of the Events table.
