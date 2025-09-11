# Summary

This file describes the data model entities and relationships available in the application.

Mongoose schemas will be stored in src/server/db.

# Overall Rules

- Do not use a pattern where an interface is defined with `export type IMember = Document & {` syntax because that is
  just for User.
- Where it makes sense, use optional fields unless otherwise specified.
- Pay important notice to any security settings.

# User

- A user is an authenticated end-user.
- This entity contains information from the authentication system, Clerk.
- Users are unique across all gyms.
- Users are related to one or more Member records which represent
- When a user signs in, they will be able to enter a "gym code" to join a gym, which will create their Member record.
- Roles: 

# Member

- Security: Members can only be edited either by theirselves, or by an owner.
- Members can be an owner, coach, or member.
- Basic profile information such as email, mailing address, mobile phone, etc, should be included.
- Start date
- This entity relates a member to a single gym.
- Each member will have a list of classes they have attended based on a scheduled class, but this needs to be in a
  different entity somehow so it can be sharded to a different location for reporting.
- A member record is related to a single User record.
- For a member to join a gym, they must enter a gym code that is given to them by the owner of the gym.
- When they enter this gym code, the owner of the gym will be able to approve their membership, so we need to track this
  approval along with the date/time of the approval.

# Membership

- This is basically the member-to-plan relationship table that tracks 1 or more plans that are associated with a member.
- Over time, multiple plans can be associated with a member and multiple can be active at a given time (ie, multiple
  recurring plans).
- Members belong to a gym, not to individual locations within the gym.

# Charge

- This is an audit table used for billing purposes.
- A charge is associated to a member.
- It can include either a charge for a given plan, or a 1-time charge such as for a "beverage"
- Tracks the date the charge occurred, an optional plan id, and an amount and a note.
- Should have an indicator for if it has been billed yet.

# Billing

- member id of the person who ran billing
- date the billing run was created
- start and end date period of the billing cycle

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
- Mandatory Start and optional End DateTime
- Recurring period (weekly, monthly, quarterly, yearly)
- Plans are ALWAYS recurring
- There is no maximum number of members for Plans.

# Product
- this represents a thing that can be sold to a member.
- Examples: LMNT drink, a Tshirt, or perhaps a 1-time class offering such as a squat clinic.
- Fields should include:
    - name & description
    - status 
    - price

# Classes

- This entity describes a specific class. For example, "Spinning".
- It does not specify hours or when it is scheduled, location, etc.
- Name
- Description
- Duration
- Max members allowed
- There is no difficulty level for this entity.

# Schedule

- A schedule is for a location.
- It associates a class with a location at a specific time and date.
- The class can be a 1-time, or recurring.
- Use the following information to determine the best data model:
    - If it is a 1-time, then it should have a date/time field for the single occurance.
    - If it is a recurring, then it will have just a start date and end date that specifies when it starts and ends.
    - If it is a recurring, then a separate time field can be populated to indicate the time of day it occurs on.
    - The start and end dates should be separate from the time field.
- Scheduling should be easy for the owner to do. It would be nice to see a week and month at a time and easily add
  classes to the schedule.
- A class can be scheduled multiple times in a day, but look for an overlap to ensure multiple classes are not scheduled
  at the same time by accident for the same location. For example, a "HIIT Class" might be scheduled at 5am-6am,
  6am-7am, 12pm-1pm, and 4:30pm-5:30pm, every Monday. I might have another class, a "Strength Class" scheduled from
  7am-8am and 5:30-6:30pm every Monday.

# Addresses

- When creating an address field, make all fields optional.

# Security

- Plans, classes, charges, schedules, coaches, memberships, etc, can only be created or updated by a user who is an owner of the gym.
- @auth.ts contains logic to authorize a role against an endpoint via middleware. See authorizeRoles().

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

## BACKUP AND RESTORE

```sh
brew tap mongodb/brew
brew install mongodb-database-tools
brew install mongodb-compass mongosh # for compass ui
mongodump --db fitfam --excludeCollection users --uri="mongodb://root@localhost:27017/fitfam?authSource=admin"
mongorestore --uri="mongodb://root@localhost:27017/fitfam?authSource=admin" --dir dump/fitfam
```

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

Joe joins the gym. Owner adds a "Workshop Plan" which is defined as a recurring plan with a specific billing period.

How to know if member is active? Do they have an active recurring plan? If so, then they are active. If not, have to see
if the plan they are on is in the current time frame (for plans with end dates).

Seeding: I will manually create the owner and gym records for now.

# Example Documents

Ignore this section.

## GYM CREATION

```json
{
    "_id": {
        "$oid": "68bcc090ba8a3a46ac419227"
    },

    "name": "Full30Fit",
    "gymCode": "F30FIT",
    "ownerId": "507f1f77bcf86cd799439011",
    "billingAddress": {
        "street": "1785 LAKE WOODMOOR DRIVE",
        "city": "Monument",
        "state": "CO",
        "zipCode": "80132"
    },
    "contact": {
        "email": "denise@full30fit.com"
    }
}
```

## MEMBER CREATION

```json
{
    "_id": {
        "$oid": "68be4ec8ba8a3a46ac419260"
    },
    "email": "dustin.breese@gmail.com",
    "firstName": "Dustin",
    "lastName": "Breese",
    "phone": "719-213-7681",
    "address": {
        "street": "1234 Main St",
        "city": "Monument",
        "state": "CO",
        "zipCode": "80132"
    },
    "memberType": "owner"
}
```

```json
[
    {
        "email": "bob@full30fit.com",
        "firstName": "Bob",
        "lastName": "Smith",
        "phone": "719-213-7681",
        "address": {
            "street": "1234 Main St",
            "city": "Monument",
            "state": "CO",
            "zipCode": "80132"
        },
        "memberType": "member"
    },
    {
        "email": "jan@full30fit.com",
        "firstName": "Jan",
        "lastName": "Smith",
        "phone": "719-213-7681",
        "address": {
            "street": "1234 Main St",
            "city": "Monument",
            "state": "CO",
            "zipCode": "80132"
        },
        "memberType": "member"
    },
    {
        "email": "jamie@full30fit.com",
        "firstName": "Jamie",
        "lastName": "Z",
        "phone": "719-213-7681",
        "address": {
            "street": "1234 Main St",
            "city": "Monument",
            "state": "CO",
            "zipCode": "80132"
        },
        "memberType": "member"
    }
]
```

## Membership

```json
{
    "_id": {
        "$oid": "68bdf28bba8a3a46ac41923a"
    },
    "memberId": "68bdedafba8a3a46ac419237",
    "gymId": "68bcc92bba8a3a46ac419231",
    "gymCode": "F30FIT"
}
```

```json
[
    {
        "memberId": "68bee4383176325df76546df",
        "gymId": "68be53b1c83c987d816ffdaa",
        "gymCode": "F30FIT"
    },
    {
        "memberId": "68bee4383176325df76546e0",
        "gymId": "68be53b1c83c987d816ffdaa",
        "gymCode": "F30FIT"
    },
    {
        "memberId": "68bee4383176325df76546e1",
        "gymId": "68be53b1c83c987d816ffdaa",
        "gymCode": "F30FIT"
    }
]
```

## Mongo CLI cheatsheet

```
use fitfam;


// "db." is hard coded and not the name of a database:
db.gyms.find({}).pretty()

db.gyms.find({ fieldName: 'value' })

db.gyms.findOne({ fieldName: 'value' })

db.gyms.insertOne({
  key1: 'value1',
  key2: 'value2',
  // ... more fields
})

db.gyms.insertMany([
  { key1: 'valueA', key2: 'valueB' },
  { key1: 'valueC', key2: 'valueD' }
])

db.gyms.deleteOne({ fieldName: 'value' })

db.gyms.deleteMany({})

db.members.updateOne(
  { email: "john.doe@example.com" }, // Filter for the document you want to update
  {
    $set: {
      newFieldName: "value" // The new field and its value
    }
  }
);

```
