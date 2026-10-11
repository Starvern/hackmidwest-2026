# P2 importer gap correction

Addresses P2 a02ff23 review of aeebd00: clearing Business A11:S11 previously
terminated field parsing and silently discarded rows 12–15.

Field, named-source and operating-detail readers now share bounded section scanning.
Revision-2 section titles separate fields, sources, notes and linked-detail tables.
Blank tails are allowed. A populated row after an internal blank or missing row
rejects with its exact sheet/A-cell diagnostic. Any partially populated row without
its leading key also rejects. No profile is created from a rejected import.

Regression coverage clears Business row 11 (rejects Business!A12), appends a named
source beyond a blank row (Business!A30), adds a linked detail beyond a blank row
(Operations!A37), and checks an orphan detail (Operations!A36). Normal blank and
populated templates, trailing blanks and separate sections continue to import.
The section layout remains revision-2; moved/renamed sections are not a new format.
P2's independent correction recheck is still requested; no joint importer acceptance
is claimed by implementation-owner tests.
