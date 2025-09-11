# TODO

## Features

- [ ] Member charges
    - [x] recurring amount
    - [x] manage one-time charges
    - [ ] view charges
    - [ ] Roll-ups (ie, families where 1 child drank beverages but parents pay)
    - [ ] UI UPDATE - currently only able to assign a single plan to a user. What about non-recurring charges? Probably
          need to address this. Thought: Just use products/inventory?
- [ ] Billing improvements
    - [ ] allow editing 1-time charges from billing screen
    - [ ] ability to see past billings
- [ ] Coaches
    - how to assign a coach to a class.
    - how to see classes which are not coached
- [ ] Scheduling polishing?
- [ ] Ability to publish schedule to external via snippet
- [ ] Assign coaches to a class
- [ ] Member and Coach Kiosk check-in
- [ ] Time tracking
- [x] Users vs members database. Currently, gym owner is typed to User.id, not member.id
- [x] Should be able to manually add/update users
- [ ] Contracts (perhaps just store PDFs for now like a file library?)
- [ ] Online payments, recurring payments, etc
- [ ] Send notifications
    - [ ] broadcast
    - [ ] single user
    - [ ] email
    - [ ] push notification
- [ ] Inventory
- [ ] Unit tests to lock things in

## Reports

- [ ] Time tracking for payroll
- [ ] Membership Attendance & Engagement
- [ ] Members MIA
- [ ] Membership stats (number of classes attended, how long they've been a member, etc)
- [ ] Scheduling issues (ie, no coaches)
- [ ] Expected Charges

## Security

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
