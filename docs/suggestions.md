# Feature Suggestions

## Core Booking Flow (highest value)
- **Tour bookings** — users select dates, number of adults/children, choose a room, pay. Track booking status (pending → confirmed → cancelled).
- **Availability / capacity management** — tours have limited spots; block booking when full.
- **Payment integration** — Stripe checkout, with webhooks updating booking status.
- **Booking confirmation emails** — Celery task sends PDF itinerary on confirmation.

---

## User Experience
- **Reviews & ratings** — users who completed a tour can leave a star rating + text review. Show aggregate score on tour cards.
- **Wishlist / saved tours** — heart button to save tours for later.
- **Tour image gallery** — multiple cover images with a proper lightbox (images field exists on the model but UI is limited).
- **Interactive map** — show tour locations on a Leaflet/Mapbox map on the main page and tour detail.

---

## Agency Tools
- **Analytics dashboard** — bookings over time, revenue, most popular tours (recharts is already installed).
- **Tour calendar view** — visual calendar showing scheduled tours and their occupancy.
- **Discount codes / promotions** — percentage or fixed amount off, with expiry and usage limits.
- **Custom tour requests** — users submit a form ("I want 4 people in Japan, budget $X"), agencies respond with a quote.

---

## Discovery & Search
- **Advanced filtering** — filter by price range slider, rating, duration, group size, month.
- **Similar tours** — "You might also like" section on tour detail page.
- **Categories / tags** — Adventure, Cultural, Family, Luxury, etc. Filter by category.

---

## Admin & Operations
- **User management panel** — admin can view all users, ban accounts, promote to staff.
- **Revenue reporting** — total bookings, commission tracking per agency.
- **Bulk tour import** — CSV upload to create multiple tours at once.

---

## Trust & Safety
- **Agency verification badges** — verified, top-rated, new agency tiers.
- **Cancellation policies** — agencies define their own policy; shown on booking checkout.
- **Dispute resolution** — users can flag a booking issue; admin mediates.
