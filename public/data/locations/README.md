# Nigeria locality index

This directory contains a local, split-by-state copy of the `full.json` dataset from [temikeezy/nigeria-geojson-data](https://github.com/temikeezy/nigeria-geojson-data), distributed under the included MIT license.

The source provides 37 states/FCT, 774 LGAs and 8,809 named electoral wards/registration areas with representative latitude/longitude points. The game uses the points to distinguish and seed procedural scenes; they are not road networks or legal boundaries. The source spells Nasarawa as `Nassarawa`; this copy uses `Nasarawa` to match the state directory. Several abbreviated or misspelled LGA labels were also expanded/normalized for display, with ward records and coordinates retained. Label spellings were cross-checked against the published 774-LGA directory at [Current Affairs Nigeria](https://currentaffairs.ng/lg/); published lists can use different spelling variants, so official administrative records take precedence.

Ward/registration-area entries are **not** an exhaustive gazetteer of every village, street, household or polling unit. The generated 3D layouts are fictional procedural art, not surveyed maps. This data layer should not be used as a substitute for official administrative, electoral or survey records.
