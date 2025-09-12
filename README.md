# AI Prompts

## ABOUT

The website and app provides advanced club management features at a low monthly cost. Manage membership, billing,
classes, coaches, schedules, inventory, products, and more. Fit Fam Connect also has a membership portal for gym members to easily see schedules and manage reservations.

# Logo

https://socialsight.ai/apps/logo-generator -- the best

https://www.canva.com/create/logos/ https://www.design.com/maker/logos/page1 godaddy

# PrimeIcons

https://primeng.org/icons

# Starting Everything up

- .env.local and .env are correctly setup, .env.local has CLERK_SECRET_KEY

```sh
yarn dev-db
yarn dev-server
yarn dev
```

## Render Notes

- Don't forget environment variables.
- Need a rewrite rule for /\* to /index.html or you will see NOT FOUND after redirect after login.
- Database is mongodb running from docker image.

- Render CLI (https://render.com/docs/cli)

```sh
render login
render services
```

# Creating a new service

Create the server/location/locations.ts backend service. Use rules from @SERVER.md to create this new service. It should
satisfy all of the endpoints used in LocationService.ts
