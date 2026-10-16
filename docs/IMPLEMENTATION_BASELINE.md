# Current implementation baseline

The Laravel recommendation update supersedes the earlier prototype and October 9 baseline. See RECOMMENDATIONS_UPDATE.md for current scope, policy decisions and verification limits.

Active actors: Guest, Hotel Staff, Restaurant Staff and Administrator. All active records and authentication are server-side. Bookings reserve room types; physical rooms are assigned by Hotel Staff at check-in. Restaurant POS is restricted to restaurant and administrator accounts. Legacy kiosk/OCR and loyalty workflows are not part of the revised active routes.

Accommodation is posted as a full booking amount. Department closing reconciles transactions without posting accommodation again. Group payments and transfers preserve source references and do not double-count cash. PayMongo is test-only and requires account setup; default email uses local logs.

Tax and discount fields are configurable training policy values, not certification or legal determinations. Actual approved values and property details must be supplied before demonstration to stakeholders.
