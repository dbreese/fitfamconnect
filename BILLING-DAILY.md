# Billing Management
This document contains information about billing logic and rules for the application for daily billing. That is, a billing process will be generated each day and charge members on each day.

# Billing Logic

Daily billing runs each night at midnight and accumulates charges for members.

Charges can include:
- One time charges (examples: tshirts, energy drinks, etc)
- Recurring charges such as membership plans.

- Use UTC times.
- The billing engine for daily billing will be located in /src/server/billing/dailyEngine.ts

## One Time Charges Rules
- Billed in arrears for items in the charge table that have no planId associated with them.
- One time charges are easy to calculate -- if isBilled=false and the charge occured before the end date of a billing cycle, then it is used.
- Note that the billing period START DATE is not used -- this way, we can pick up old charges that have not been billed for. For example, an item they purchased a month ago.

## Recurring Billing Rules
- A recurring charge can happen on a MONTHLY, QUARTERLY, or YEARLY schedule.
- We need to ensure that members are not billed more than they should be. So, when we think we need to charge a member for a recurring charge, we need to use the memberships lastBillingDate field to see if the member has already been charged for the period related to the plan.
- When the member is charged for a recurring plan, we need to update the membership's lastBillingDate and nextBillingDate for that plan and billing id.
- Dont double bill for a user.
- Just select all membership plans where next bill date is for the current billing date. 
- When a charge is committed for a recurring plan, we need to set the next bill date.

### Yearly billing special rules
- Do not worry about leap years

### Test Scenarios 

For the following test scenarios, assume:
- weekly billing is $25/week
- monthly billing is $100/month
- quarterly billing is $300/quarter
- yearly billing is $1200/year

- Start dates are in the year 2025

#### Member joins on Aug 31st and is on monthly billing. StartDate is set to Sept 1.
Billing runs on Sept 1st, 2nd, and 30th.
Billing runs on Oct 1st.

Results:
- Sept 1: $100 (and member's next billing date is set to Oct 1)
- Sept 2: $0
- Sept 30: $0
- Oct 1: $100 (and member's next billing date is set to Nov 1)

#### Member joins on Sept 1st and is on monthly billing. StartDate is set to Sept 1.
Billing runs on Sept 1st, 2nd, and 30th.
Billing runs on Oct 1st.

Results: 
- Sept 1: $100 (and member's next billing date is set to Oct 1)
- All other days in Sept are $0
- Oct 1: $100 (and member's next billing date is set to Nov 1)
- All other days in Oct are $0

#### Member joins on Sept 1st and is on weekly billing. StartDate is set to Sept 1.
Billing runs on Sept 1st, 8th, 15th, 22nd, 29th
Billing runs on Oct 6th.

Results: 
- Sept 1, 8, 15, 22, 29: $25 (next billing date is always set to +1 week)
- All other days in Sept are $0
- Oct 6:  $100 (next billing date is set to Oct 13)
- All other days in Oct are $0

#### Member joins on Sept 1st and is on yearly billing. StartDate is set to Sept 1.
Billing runs on Sept 1st.
Billing runs on Aug 31 of the next year.
Billing runs on Sept 1st of the next year.

Results: 
- Sept 1: $1200 (next billing date is set to +1 year)
- Aug 29 of next year: $0
- Sept 1 of next year: $1200 (next billing date is set to +1 year)
- All other days between start date and Sept 1 of next year are $0

#### TODO: Scenarios we need to create tests for
Dont do anything for these just yet.
- TBD

# Billing Run

A billing run is a single instance of a billing process.

# Audit trails
All billing records should serve as audit trails to see what was charged. No records should ever be updated once created.

# Code Location
- I want the billing logic to be located in /src/server/billing/dailyEngine.ts.
- We need unit tests for all of the above scenarios.
- Keep unit tests updated that cover at least the above scenarios.
