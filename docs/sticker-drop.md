# Sticker Drop campaigns

Sticker Drops are managed at `/admin/sticker-drop`. Create a campaign, choose its Istanbul start and end times, add English and Turkish copy, connect the Türkiye and International destinations, then save it before uploading transparent PNG artwork.

Uploads accept genuine transparent PNG files only, with a 5 MB limit per file and 20 files per campaign. Four or more variations are recommended. A scheduled campaign is selected by server time, so changing a visitor's device clock does not activate it.

The storefront respects the selected placement and visitor frequency. Reduced-motion visitors skip the falling animation and see the accessible product announcement directly. Türkiye products use current local catalog price, availability, inventory, shipping, and basket rules. International Fourthwall or external destinations open their configured HTTPS URL.

Campaign interactions are recorded through the consent-gated first-party analytics system using the `sticker_drop_*` events.
