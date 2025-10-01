# Billing Management
This document contains information about billing logic and rules for the application for daily billing. That is, a billing process will be generated each day and charge members on each day.

# Billing Logic

Daily billing runs each night at midnight and accumulates charges for members.

Charges can include:
- One time charges (examples: tshirts, energy drinks, etc)
- Recurring charges such as membership plans.
- Billing start date is calculated by the gym's lastBillingRunDate from the Gym record. 
    - If it exists, we will use it in UTC time which should be at 00:00:00 + 1 day.
    - If not, we will use the gym's createdAt date as the startDate. 
    - The endDate will default to today's date at midnight (23:59:59) UTC. 
- The billing process will iterate 1-day at a time to calculate the daily charges for each member. Note that the startDate is the lastBillingRunDate + 1 day.

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

For each test:
- always make sure we are checking the lastBillingRunDate
- if we bill a member, make sure we are checking their nextBillDate value.

- Start dates are in the year 2025
- Times are in UTC

#### Verify charge dates are correct for single day billing.
Member joins on Sept 1 and is on monthly billing. StartDate is Sept 1. Single day billed.
Gym has lastBillingRunDate = Aug 10.
Billing runs on Sept 1st.

Results:
- Sept 1: $100
- Charge Date has a date of Sept 1.

#### Verify charge dates are correct for multiple day billing.
Member joins on Sept 3 and is on monthly billing. StartDate is Sept 3. Single day billed.
Gym has lastBillingRunDate = Aug 10.
Billing runs for Sept 1st - Sept 4.

Results:
- Sept 4: $100
- Charge Date has a date of Sept 3.

#### Member joins on Aug 31st and is on monthly billing. StartDate is set to Sept 1. Single day billed.
Gym has lastBillingRunDate = Aug 10.
Billing runs on Sept 1st, 2nd, and 30th.
Billing runs on Oct 1st.

Results:
- Sept 1: $100
- Sept 2: $0
- Sept 30: $0
- Oct 1: $100


#### Member joins on Sept 1st and is on monthly billing. StartDate is set to Sept 1. Single day billed.
Gym has lastBillingRunDate = today - 1 day.
Billing runs on Sept 1st, 2nd, and 30th.
Billing runs on Oct 1st.

Results: 
- Sept 1: $100
- All other days in Sept are $0
- Oct 1: $100
- All other days in Oct are $0

#### Member joins on Sept 1st and is on monthly billing. StartDate is set to Sept 1. Single day billed for next 365 days.
Gym has lastBillingRunDate = Aug 15.
Billing runs on every day for the year, starting on Sept 1.

Results: 
- $100 is billed on the 1st of every month.
- $0 is billed on all other days.

#### Member joins on Sept 1st and is on weekly billing. StartDate is set to Sept 1. Single day billed.
Gym has lastBillingRunDate = today - 1 day.
Billing runs on Sept 1st, 8th, 15th, 22nd, 29th
Billing runs on Oct 6th.

Results: 
- Sept 1, 8, 15, 22, 29: $25
- All other days in Sept are $0
- Oct 6:  $25
- All other days in Oct are $0

#### Member joins on Sept 1st and is on yearly billing. StartDate is set to Sept 1. Single day billed.
Gym has lastBillingRunDate = today - 1 day.
Billing runs on Sept 1st.
Billing runs for date span Sept 2-30.
Billing runs on Aug 31 of the next year.
Billing runs on Sept 1st of the next year.

Results: 
- Sept 1: $1200
- Sept 2-30: $0
- Aug 29 of next year: $0
- Sept 1 of next year: $1200
- All other days between start date and Sept 1 of next year are $0 (check every day)

#### Member joins on Sept 1st and is on monthly billing. Startdate is set to Sept 1. Multi-days billed. 
Gym has lastBillingRunDate = Aug 25.
Billing runs on Sept 30th.
Billing runs on Oct 1st.

Results:
- Sept 30: $100
- Oct 1: $100


#### Member joins on Sept 30, 2025 and is on monthly billing. Startdate is set to Sept 30. Multi-days billed.
Billing runs for Sept 30 startDate to Sept 30 endDate.

Results:
- Sept 30: $100

#### One-time charges are only charged a single time when multi-day billing occurs.
Member has a 1-time charge for $3 on Sept 6.
Billing runs from Sept 1 - Sept 30.

Results:
- only a single 1-time charge for $3 is charged to member.

#### TODO: Scenarios we need to create tests for
Dont do anything for these just yet.
- TBD

# Bugs
Ignore this section, using it to track some in-progress issues.
- Does not set Gym.lastBillingRunDate
    - Does not update UI
- Commit() not really working well. Looks like it is also not charging some things.
- What if they spoof the billing commit data and submit it? We should re-calculate the charges to ensure it matches? Or use a signature?

# Billing Run

A billing run is a single instance of a billing process.

# Audit trails
All billing records should serve as audit trails to see what was charged. No records should ever be updated once created.

# Code Location
- I want the billing logic to be located in /src/server/billing/dailyEngine.ts.
- We need unit tests for all of the above scenarios.
- Keep unit tests updated that cover at least the above scenarios.
