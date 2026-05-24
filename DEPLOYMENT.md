# Deployment Notes

Production URL: `https://report.summitdata.one`

## Environment Variables

Set production values in the Hostinger Node app environment settings. Do not commit `.env` or `.env.local`.

Use `.env.example` as the checklist.

Required values:

- `NODE_ENV=production`
- `NEXTAUTH_URL=https://report.summitdata.one`
- `AUTH_URL=https://report.summitdata.one`
- `NEXTAUTH_SECRET`
- `AUTH_SECRET`
- `DATABASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `ADMIN_EMAIL`

`NEXTAUTH_SECRET` and `AUTH_SECRET` should be the same strong random value.

## Database Move Options

For the current local application data, use a MySQL dump/import into the Hostinger database.

Recommended flow:

1. Create the production MySQL database in Hostinger.
2. Allow remote MySQL access for the machine doing the import.
3. Export the local MySQL database with `mysqldump`.
4. Import the dump into the Hostinger database.
5. Set production `DATABASE_URL` in Hostinger.
6. Run `npx prisma validate`.
7. Run `npx prisma db push` only if the production database schema needs to be synchronized with `prisma/schema.prisma`.

For a blank production database, skip the dump/import and run:

```bash
npx prisma db push
npm run seed
```

Only use the seed command when you want demo/default data inserted.

## Hostinger Build / Start

Recommended commands:

```bash
npm install
npm run build
npm run start
```

The production app must run from the built `.next` output and use the environment variables configured in Hostinger.
