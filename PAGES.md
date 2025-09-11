# Summary

This file explains how new pages are added to the website.

# Details

- Functional pages are vue templates located in src/views/pages.
- Almost all pages are protected and for authenticated users only.
- the vue router is located in src/router/index.js and all new pages (unless otherwise instructed) should be a child of
  the /owner or /member route.
- each page should use consistent look and feel and utilize existing styles.
- for data CRUD operations for each entity, we should have a service that exposes the operations that are available to
  use.
- The CRUD service uses "submit" from NetworkUtil to make network requests.
- Pages are linked into the navigation bar in AppMenu.vue. Make sure you use translated strings for the menu titles and all strings in i18n/en/messages.ts
- Ensure debug logging is added to all services and other important functions.

# Server information

- do not expose server-side information to the client.
- server-side logic is located in /src/server.
- the services located in /src/service are used to interact with server-side services. Use FeedbackService.ts as an
  example.
- see @SERVER.md for information on creating a new service.

# Scheduling Pages

I would like to easily see a weekly schedule. A weekly schedule can be set 

# Examples

Ignore this section, it is for me only.

Create a new page using @NEWPAGES.md  as a guidline for editing my Gym information from the Gym collection. This will require creating a new service in /services/GymService.ts that interacts with the REST server in /server/gym/gymService.ts. The gym that my user is able to access and edit is identified by the Gym.ownerId field which can be obtained on the server-side code (ie, /server/gym/gymService.ts) from the passed in req.user. Use @feedbackService.ts  as an example of using req.user. Ensure the owner can only modify their own record.

Using @NEWPAGES.md and existing patterns such as Gym Management, Class Management, and Plan Management, create location management pages, server, and service.
