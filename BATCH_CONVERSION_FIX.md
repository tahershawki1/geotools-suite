# New handleBatchFile Function - Implementation Details

## Overview

The `handleBatchFile()` function has been completely rewritten to use a more reliable coordinate detection method based on digit counting rather than range validation.

## Key Features

### 1. **Digit-Count Based Detection**

- **Northing (N)**: Detected by 7 integer digits (e.g., 2768047)
- **Easting (E)**: Detected by 6 integer digits (e.g., 489817)
- Works correctly with decimal coordinates (e.g., 2768047.013, 489817.908)

### 2. **Column Reordering**

The function automatically identifies and reorders columns to:

- P (Point ID)
- N (Northing/North coordinate)
- Z (Elevation/Height)
- E (Easting/East coordinate)
- Code (Description/Code)

### 3. **Coordinate Transformation**

1. Reads DLTM coordinates from input file
2. Converts DLTM → WGS84 using `convertDLTMtoWGS84()`
3. Converts WGS84 → UTM Zone 40N using new `convertWGS84toUTMZone40N()` helper function

### 4. **Output Format**

Results contain 14 fields in this order:

```
POINT, ID, N_DLTM, E_DLTM, Z_DLTM, Code, عامود, فارغ,
UTM_N, UTM_E, UTM_Z, Latitude, Longitude, altitude, code
```

## Input File Format Support

The function accepts CSV/TXT files with flexible column orders:

### Example 1: ID, N, E, Z, Code

```
1,2768047.013,489817.908,50,A
2,2769000.123,490000.456,45,B
```

### Example 2: N, E, ID, Code

```
2768047.013,489817.908,1,A
2769000.123,490000.456,2,B
```

### Example 3: E, N, Z, ID, Code

```
489817.908,2768047.013,50,1,A
490000.456,2769000.123,45,2,B
```

## Algorithm Details

```javascript
// For each column value:
1. Count integer digits (digits before decimal point)
2. If 7 integer digits → assign to Northing
3. If 6 integer digits → assign to Easting
4. If text and no ID yet → assign to Point ID
5. If small number (< 5 digits) and after N,E → assign to Z
6. If text after all numbers → assign to Code
```

## New Helper Function

### `convertWGS84toUTMZone40N(lat, lon)`

Converts WGS84 coordinates directly to UTM Zone 40N using standard UTM projection formulas:

- Uses WGS84 ellipsoid parameters
- Fixed zone: 40N
- Returns: `{ easting, northing }`

## Error Handling

- Skips CSV header rows automatically (detects if first row contains text)
- Validates that both N and E coordinates are found
- Returns error message if no valid data is detected
- Converts conversion errors gracefully

## Updated Related Functions

### `renderBatchResults()`

- Updated table headers to match new 14-column output format
- Displays all coordinates with proper formatting
- Retains click-to-map functionality

### `downloadBatchCsv()`

- Updated CSV export headers to match new format
- Exports all 14 columns with proper column names
- Fixed filename: "DLTM_to_UTM_Zone40N.csv"

## Testing

The function was tested with various input formats:

- Single row and multiple rows
- Different decimal precision levels
- Mixed column orders
- With and without codes/IDs

Example test data:

```
1,2768047.013,489817.908,50,A
2,2769000.123,490000.456,45,B
3,2770500.789,491234.567,40,C
```

## Git Commit

- **Commit Hash**: 04dd3a5
- **Message**: "Rewrite handleBatchFile: digit-count detection for N(7) and E(6), UTM Zone 40N conversion"
- **Date**: 2025-02-07
