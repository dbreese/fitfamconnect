# TODO

## Features

### Required for launch
- [ ] Members / Member App
    - [x] can view monthly charges and bills
    - [x] can view schedule
    - [x] can make/cancel reservations
    - [x] can checkin via their device

- [ ] Coach assignments
    - [x] filter classes with no coaches

- [ ] Timesheets for coaches (is this just a kiosk feature for clock in/out)
    - [ ] Can we auto-calculate this based on scheduled coaches?

- [ ] Kiosk app
    - [ ] On the profile screen, if member is an owner or a coach, let them put the app into kiosk mode.
    - [ ] How to get out of kiosk mode
    - [ ] One tab -- shows classes for the day along with existing signups.
        - [ ] Tapping on a signup checks the member in.
        - [ ] "Checkin" button to checkin via phone number.

- [ ] Payments
    - [ ] Stripe Restricted Key
    - [ ] Online payments
    - [ ] Recurring payments, etc
    - [ ] Member payment setup

### Nice to have
- [ ] Send notifications
    - [ ] broadcast
    - [ ] single user
    - [ ] email
    - [ ] push notification

- [ ] Contracts (perhaps just store PDFs for now like a file library?)

- [ ] Multi-locations

- [ ] Multi-gym membership behavior on app and web

- [ ] Billing
    - [ ] Allow editing 1-time charges from billing preview screen.

- [ ] Products
    - [ ] ability to add quantity when doing a charge. need to use this in billing calculations.

- [ ] Ability to publish schedule to external via snippet

- [ ] members
    - [ ] can send feedback

- [ ] Classes & Signups
    - [ ] Handle case where max member count has been reached.


### Future
- [ ] Scheduling and staff management?

- [ ] Owners
    - [ ] can view feedback?

- [ ] Mobile app
    - [ ] Manage profile information
    - [ ] Manage pin code

- [ ] Messaging
    - [ ] AI opptys?
    - [ ] Templates

- [ ] Member charges
    - [ ] Roll-ups (ie, families where 1 child drank beverages but parents pay)
    - [ ] UI UPDATE - currently only able to assign a single plan to a user. What about non-recurring charges? Probably
          need to address this. Thought: Just use products/inventory?

- [ ] Batch billings
    - prorating to 1st?
    - or bill on each date

- [ ] Billing improvements
    - [ ] Allow credits to be added to an account (ie, maybe a member changed a plan and should get money back).
    
- [ ] Inventory

- [ ] Unit tests to lock things in

## Member site
- [X] My Gyms, with ability to add by gym code
- [X] Schedules for gyms
- [X] Sign up/cancel for scheduled items

## Reports

- [ ] Time tracking for payroll
- [ ] Membership Attendance & Engagement
- [ ] Members MIA
- [ ] Membership stats (number of classes attended, how long they've been a member, etc)
- [ ] Scheduling issues (ie, no coaches)
- [ ] Expected Charges

## Security

- [ ] make sure owner endpoints can only modify the gyms they are owners of
- [ ] make sure members can only modify their member info
- [ ] minify code via config (see commit 1e0559e0)
- [ ] Need to ensure database is locked down
- [ ] CSS issues with data?

## Billing Process

- Billing logic is defined in /src/server/billing/billingService.ts
- Owner can select start and end date for the billing period
- The owner is presented with a billing report using the "Review" section below.
- If the owner is happy with things, they can select "Commit" which will perform steps in the "Commit" section below.
- Only charges for active/approved members should be considered (for example. member.status = "approved")

- Review

    - arrears billing calculations:

        - gather all non-recurring membership records for the billing period.
        - gather all of the 1-time charges for members which have not been billed (isBilled=false), regardless of date.

    - advance billing calculations:
        - gather all recurring charges for members for the billing period.

- Commit

    - generate a charge record for each item in the table.
