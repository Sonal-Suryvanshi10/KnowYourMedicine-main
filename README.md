# Know Your Medicine — MERN migration

The application has been moved from Java/JSP + MySQL to **MongoDB, Express, React, and Node.js**. The existing user/store/admin workflows remain available through React pages and JSON APIs.

## Features retained

- Public medicine search with dosage, description, benefits, side effects, price, stock, and store information.
- User and medicine-store registration, plus separate role-aware sign-in.
- Persistent user cart, add/remove/quantity updates, checkout, order history, and order tracking.
- Store dashboard to create, edit, and remove medicine listings.
- Admin dashboard with user/store/medicine/order counts, lists, and order-status management.
- Admin accounts are provisioned by the backend environment or a protected migration; there is no public admin registration.

## Requirements and start-up

Use a current Node.js LTS release and MongoDB. MongoDB Atlas is the simplest hosted option; a local MongoDB server also works for development.

1. Start a local development database with `docker compose up -d mongo`, or create a MongoDB Atlas cluster. Copy `.env.example` to `.env` and set `MONGODB_URI` and `SESSION_SECRET`. `.env` is ignored by Git.
2. For an initial admin account, set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique strong `ADMIN_PASSWORD` before the first server start. The backend hashes the password and creates the admin only if that email does not already exist.
3. Run `npm install` if dependencies have not been installed.
4. Run `npm run dev`. Vite serves the React app on port 5173 and proxies `/api` to Express on port 5000. The API requires MongoDB to be reachable.
5. Run `npm run build` for the frontend production build; run `npm start` to start the API server.

The included Compose database is for local development only and binds to loopback. For deployment, use MongoDB Atlas or a secured private MongoDB deployment. Set the variables in the hosting provider’s secret manager, serve the site over HTTPS, and route `/api` to the Express server. Keep the frontend and API on one site where possible; the API uses an HttpOnly session cookie. If deployed on separate origins, set `CLIENT_ORIGIN` to the exact frontend origin, use HTTPS, and set `COOKIE_SAME_SITE=none` so the Secure session cookie can be sent cross-origin. Keep the origin allowlist narrow.

## MongoDB collections

Mongoose creates these collections when first used:

- `users`, `stores`, `admins`: account profiles and bcrypt password hashes.
- `medicines`: catalog details, price, stock, and optional store reference.
- `carts`: one persistent cart per user.
- `orders`: delivery information, a snapshot of ordered medicines and prices, status, and payment status.
- `sessions`: server-side login sessions.

For Atlas, create a cluster and database user, allow the application server’s IP in Network Access, choose **Connect → Drivers → Node.js**, then put the provided URI in the backend `.env` as `MONGODB_URI`. Replace the username, password, and database name placeholders; URL-encode special characters in credentials. See the [official Atlas connection guide](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/). Confirm the connection at `http://localhost:5000/api/health` (`database` should read `connected`). For local Docker, the project URI is `mongodb://127.0.0.1:27017/knowyourmedicine`. Do not put database credentials in React source or any `VITE_*` variable. The only Vite variable here is a public API URL.

## Moving existing MySQL records

The previous project’s `medicine_db` does not move automatically when the app changes databases. The included importer reads the old MySQL database, maps users, stores, admins, medicines, carts, orders, and order items into MongoDB, and hashes the legacy password values before saving them. It leaves the original MySQL database unchanged.

1. Back up the old MySQL database first. Run the import before the first API start if the target database should remain empty for the importer.
2. Add a private `LEGACY_MYSQL_URL` to `.env`, for example `mysql://user:password@127.0.0.1:3306/medicine_db` (URL-encode special characters in the password).
3. Make sure `MONGODB_URI` points to a **fresh, empty** target database. The importer refuses to write if its collections are already populated.
4. Run `npm run migrate:mysql`, review the reported counts, then sign in and inspect the migrated records.
5. Keep the source backup until the migrated catalog and accounts have been checked.

The old `storemedicines` table did not include a store owner reference, so those rows are imported into the shared catalog with no store association. Records without the referenced user/store/medicine cannot be related reliably and are skipped. If the legacy data has a different schema, update the field mapping in `scripts/import-legacy-mysql.js` before importing.

## Security and payments

- Express stores session data in MongoDB; the browser receives an HttpOnly, SameSite cookie. Production cookies use Secure over HTTPS. Express documents why its default in-memory session store is unsuitable for production: [express-session](https://expressjs.com/en/resources/middleware/session/).
- Passwords are hashed with bcrypt. Admin routes check the server-side session role on each request. Public registration accepts only user or store accounts.
- The backend recalculates order totals from current catalog prices and checks stock server-side. Never trust totals or roles sent by the browser.
- Card numbers and CVV are not collected or stored. The legacy form offered a card option but did not integrate a payment gateway. In this migrated app a card-selected order remains `Awaiting gateway`; connect a PCI-compliant provider (for example Razorpay or Stripe) before accepting card payments. Cash on delivery works without a provider.
- Add a real store verification/approval process before allowing untrusted stores to publish catalog entries in production.
- General medicine information is not a diagnosis; users should follow a prescriber and product label.

## Libraries

- React + Vite and React Router for the client pages.
- Express + Mongoose for the REST API and MongoDB models. Mongoose validates data through schemas: [Mongoose validation](https://mongoosejs.com/docs/validation.html).
- Axios for API requests, with cookies enabled.
- Lucide React for icons.
- Tailwind CSS v4 utilities plus `src/App.css` for responsive page-specific styling. The Vite integration follows the [official Tailwind guide](https://tailwindcss.com/docs/installation/using-vite).
- Helmet, express-rate-limit, bcryptjs, express-session, and connect-mongo for baseline API hardening and sessions.

## API routes

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | API/database health |
| GET | `/api/auth/me` | Public | Current session identity |
| POST | `/api/auth/register/user` | Public | User registration |
| POST | `/api/auth/register/store` | Public | Store registration |
| POST | `/api/auth/login` | Public/rate limited | User, store, or admin sign-in |
| POST | `/api/auth/logout` | Signed-in | End session |
| GET | `/api/medicines?q=` | Public | Search/list medicine catalog |
| GET | `/api/medicines/mine` | Store | Store’s catalog listings |
| POST/PATCH/DELETE | `/api/medicines` | Store/Admin | Add and manage catalog items |
| GET/POST | `/api/cart` | User | Read/add cart items |
| PATCH/DELETE | `/api/cart/:medicineId` | User | Update/remove item |
| POST/GET | `/api/orders` | User | Place order/list order history |
| GET | `/api/orders/:orderId` | Owner/Admin | Track order details |
| GET | `/api/admin/overview` and `/api/admin/*` | Admin | Dashboard and management data |
