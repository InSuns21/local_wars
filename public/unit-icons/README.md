# Unit Icons

Place optional external SVG icons here using the unit type as the file name.

Examples:
- `INFANTRY.svg`
- `FIGHTER.svg`
- `AIR_TANKER.svg`

If a file exists, the board uses it automatically. If it does not exist or fails to load, the built-in icon is used instead.

Recommended constraints:
- 余白なし
- transparent background
- single solid silhouette
- monochrome black shape on transparent is recommended
- square canvas
- centered within the canvas with a no margin
- avoid text, gradients, shadows, and embedded raster images
- keep the silhouette readable at about 24px to 30px
- prefer `viewBox="0 0 24 24"`, but larger square viewBox values also work if the silhouette is centered
