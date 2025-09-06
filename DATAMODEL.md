# Summary

This file describes the data model entities and relationships available in the application.

Mongoose schemas will be stored in src/server/db.

Do not use a pattern where an interface is defined with `export type IMember = Document & {` syntax because that is just
for User.

# Location

- Physical address and description of a gym or workout facility.
- Operating hours.
- Contact information such as email and phone number.

# SubLocation

- Each Location will have 1 or more sub locations.
- When a location is created, a default "main" sublocation will be created that can be renamed.
- These can represent rooms or spaces for activities. For example, maybe room 1 is for Yoga while room 2 is for
  Spinning.
- Max members

# Plan

- represents billing information
- Plan Name
- Price
- Recurring or not. For example, 1 time charge vs monthly charge.
- Recurring period (weekly, monthly, quarterly, yearly)

# Members

- Members can be an owner, coach, or member.
- Basic profile information such as email, mailing address, mobile phone, etc, should be included.
- Start date
- A member can optionally belong to a group (for example, a "family").
- Each member will have a list of classes they have attended based on a scheduled class.

# Group

- A "group" is just a unique identifier for a group of members such as a family.
- A group will have a primary member identified.

# Classes

- This entity describes a specific class. For example, "Spinning".
- It does not specify hours or when it is scheduled, location, etc.
- Name
- Description
- Duration
- Max members allowed

# Schedule

- A schedule is for each sublocation.
- It associates a class with a sublocation at a specific time and date.

# TODO

Ignore this section.

- billing
- tracking & stats

# MongoDB info

This is informational only, ignore this section.

- docker/docker-compose.yml defines the service.
- start it with `cd docker && docker-compose up -d`
- connection information is in .env.local via MONGO_URI
- needs to run locally before server starts up
- /Applications/MongoDB Compass to view UX for database.

https://render.com/docs/deploy-mongodb  
mongodb-mtot:27017 (ip:port on render)

Local:  
https://hub.docker.com/_/mongo  
Connect via docker:  
docker exec -it 13e3340295ce6e2b83642cf7ecaea23706ac2544116168381f8bb7257f43613f bash

Set up user admin:  
https://stackoverflow.com/questions/38921414/mongodb-what-are-the-default-user-and-password  
admin/test1234
