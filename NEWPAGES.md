# Summary

This file explains how new pages are added to the website.

# Details

- Functional pages are vue templates located in src/views/pages.
- Almost all pages are protected and for authenticated users only.
- the vue router is located in src/router/index.js and all new pages (unless otherwise instructed) should be a child of
  the /app route.
- each page should use consistent look and feel and utilize existing styles.
- for data CRUD operations for each entity, we should have a service that exposes the operations that are available to
  use.
- Pages are linked into the navigation bar in AppMenu.vue.
- Ensure debug logging is added to all services and other important functions.

# Server information

- do not expose server-side information to the client.
- server-side logic is located in /src/server.
- the services located in /src/service are used to interact with server-side services. Use FeedbackService.ts as an
  example.
- see @SERVER.md for information on creating a new service.
