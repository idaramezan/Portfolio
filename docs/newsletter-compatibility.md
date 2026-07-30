# Newsletter compatibility

The public feature is named **Newsletter** in English and **Bülten** in Turkish.

The following legacy identifiers intentionally remain in code and storage so existing subscribers, campaigns, templates, analytics history, and deliveries continue to work:

- `studio-letter:*` browser events and acquisition contexts
- `studio_letter` analytics/source values
- `featured_studio_letter_*` database tables
- existing StudioLetter-prefixed component/type names and CSS hooks

Public links use `/newsletter`. The server permanently redirects `/studio-letter` and `/studio-mail` to `/newsletter`, preserving query parameters. The separate **Mystery Mail** product and its `/shop/turkiye/mystery-mail` route are unchanged.
