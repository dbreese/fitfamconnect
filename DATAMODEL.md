# Summary

This file describes the data model entities and relationships available in the application.

Mongoose schemas will be stored in src/server/db.

# Overall Rules

- Do not use a pattern where an interface is defined with `export type IMember = Document & {` syntax because that is
  just for User.
- Where it makes sense, use optional fields unless otherwise specified.

# Member

- Members can be an owner, coach, or member.
- Basic profile information such as email, mailing address, mobile phone, etc, should be included.
- Start date
- Each member will have a list of classes they have attended based on a scheduled class, but this needs to be in a
  different entity somehow so it can be sharded to a different location for reporting.
- Each member can belong to one or more locations.
- When a member signs in, they will be able to enter a "gym code" to join 1 or more locations.

# Membership

- This entity relates a member to a location.
- For a member to join a location, they must enter a gym code that is given to them by the owner of the location.
- When they enter this gym code, the owner of the gym will be able to approve their membership, so we need to track this
  approval along with the date/time of the approval.
- Over time, multiple plans can be associated with a membership and multiple can be active at a given time (ie, multiple
  recurring plans and non-recurring plans).

# Gym

- Billing address and description of a gym or workout facility.
- Contact information such as email and phone number.
- A location is owned by a single member who is as an "Owner" member type.
- Each gym has a unique 6-alpha-numeric gym code that is randomly assigned to it. This code is used by members to join
  the gym.

# Location

- Each Gym will have 1 or more locations.
- Operating hours.
- When a gym is created, a default "main" location will be created that can be renamed.
- These can represent rooms or spaces for activities. For example, maybe room 1 is for Yoga while room 2 is for
  Spinning.
- Max member count

# Plan

- Represents billing information
- Plan Name
- Price
- Mandatory Start and optional End DateTime (ie, perhaps a workshop is only active for Saturday Sept 6, from 9-10am)
- Recurring or not. For example, 1 time charge vs monthly charge.
- Recurring period (weekly, monthly, quarterly, yearly)
- There is no maximum number of members for Plans.

# Classes

- This entity describes a specific class. For example, "Spinning".
- It does not specify hours or when it is scheduled, location, etc.
- Name
- Description
- Duration
- Max members allowed
- There is no difficulty level for this entity.

# Schedule

- A schedule is for each sublocation.
- It associates a class with a sublocation at a specific time and date.

# Security

- A location and sub location can only be created or updated by an owner member.
- Plans, classes, schedules, can only be created or updated by an owner member.

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

# Plans and Members

Ignore this section it is just used for my brainstorming.

give me an example document for the Gym collection using @gym.ts . I will insert this via MongoDB Compass app directly
into the database.

Some examples of members, plans, etc below:

Dustin signs in. Has no current membership, so is asked for join code. Once it is approved by the gym owner, he is able
to see gym information, sign up for classes, etc.

Owner accepts join code and assigns a plan to the user.

Bob + Shirley + Kid1 + Kid2 -- all three sign up and enter join code. Owner assigns "Family Plan to head of household,
and Family Plan Comp to Shirley, Kid1, Kid2"

Family Plan - $99/mo billed on the 1st

Family Plan Comp - $0/mo

Joe joins the gym. Owner adds a "Workshop Plan" which is defined as a 1x only charge (non-recurring).

How to know if member is active? Do they have an active recurring plan? If so, then they are active. If not, have to see
if the plan they are on is in the current time frame.

Seeding: I will manually create the owner and gym records for now.
