# Summary

This file contains information on creating new server-side APIs such as REST endpoints.

# Details

- each set of server-side services will have it's own router defined under /src/server/someservice/. See
  /src/server/feedbackService.ts as an example.
- the services are intialized in /src/server/index.ts.
- ensure the router uses console.log(listEndpoints(myService)) for debugging.
