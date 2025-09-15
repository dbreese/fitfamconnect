# Billing Management
This docuemtn contains information about billing logic and rules for the application.

# Billing Logic

Recurring billing is done in advance. That is, members are billed for the upcoming period. For example, if I am a member paying $99/mo, then the owner will run billing on Sept 1 and I will be billed up-front for the September billing period.

Billing charges can fall into these categories. See details in following sections for information and rules for each one.

- One time charges (examples: tshirts, energy drinks, etc)
- recurring charges billed for the upcoming month.
- pro-rated charges billed for recurring plans where the membership has not been billed yet (members will probably only ever see this the month after joining when it appears on their bill.)

## One Time Charges Rules
- Billed in arrears for items in the charge table that have no planId associated with them.
- One time charges are easy to calculate -- if isBilled=false and the charge occured before the end date of a billing cycle, then it is used.
- Note that the billing period START DATE is not used -- this way, we can pick up old charges that have not been billed for. For example, an item they purchased a month ago.

## Recurring Billing Rules
- A recurring charge can happen on a WEEKLY, MONTHLY, QUARTERLY, or YEARLY schedule.
- We need to ensure that members are not billed more than they should be. So, when we think we need to charge a member for a recurring charge, we need to use the memberships lastBillingDate field to see if the member has already been charged for the period related to the plan.
- When the member is charged for a recurring plan, we need to update the membership's lastBillingDate for that plan and billing id.

### Pro-rated Billing Rules
- When looking at active membership plans, if a membership start date is before the billing period's start date AND the membership has never been billed before (ie, the lastBilledDate is empty), we need to calculate pro-rated charges.
- Pro-rated charges are calculated by multiplying the recurring rate times the ratio of (the number of days the user was active in the prior period) / (number of days in the period).
- Important: the prior period could be a week, month, quarter, or year.

### Scenarios 

For the following scenarios, assume:
- weekly billing is $25/week
- monthly billing is $100/month
- quarterly billing is $300/quarter
- yearly billing is $1200/year

1. Member joins on Aug 31st and is on monthly billing. StartDate is set to Sept 1.
Billing runs on Sept 1st.
Billing runs on Oct 1st.

Results: 
- Sept 1: $100
- Oct 1:  $100

2. Member joins on Sept 15th and is on monthly billing. 
Billing runs on Sept 1st.
Billing runs on Oct 1st.

Results: 
- Sept 1: $0 (Was not a member at the time of course)
- Oct 1: $100 + $50 = $150 total

3a. Member joins on Sept 1st and is on weekly billing.

Results: 
- Sept 1: $25
- Sept 8: $25
- Sept 16: $25

3b. Member joins on Sept 4th and is on weekly billing.

Results: 
- Sept 1: No record is generated as member is not active.
- Sept 8: $25 + $10.71 = $35.71 total
- Sept 16: $25

4. Member's plan is updated mid-period. 
The first plan was assigned as a Monthly plan for $100/mo on Sept 1.
The second plan was assigned as a monthly plan for $75/mo with a start date of Oct 1.

Results:
- Sept 1: $100
- Oct 1: $75

NOTE: We do not do credit-based billing. Eventually we will allow credits to be added to an account.

5. Member's plan has end date on the end of the period. Ie, the member is active until Sept 30.

Results:
- Sept 1: $100
- Oct 1: No record is generated for billing for the member.

6. Member's plan has end date in the middle of the period. Ie, the member is active until Sept 15.
- Sept 1: $100
- Oct 1: No record is generated for billing for the member.

NOTE: We do not do credit-based billing. Eventually we will allow credits to be added to an account.

7. Member's plan has start and end date in the middle of a period (ie, 2 weeks in the middle of a monthly plan). For example, member is on monthly plan where startDate=Sept 10 and endDate=Sept 15.

Results:
- Sept 1: No record is generated as member is not active.
- Oct 1: Partial billing is applied because lastBilledDate is empty and no bill has been generated. Member was active for 5 days, so $100 * (5/30) = $16.67 is the amount.

# Billing Run

A billing run is a single instance of a billing process. It is created by the owner and is used to bill a set of members for a given upcoming period. It does not specify a past period.

# Billing Period

- A billing period is a range of dates for which a billing run is created.
- The most common billing period will be from the 1st day of the month to the last day of the month.
- However, an owner could run billing every day (ie, batch billing), and perhaps we will eventually automate things to run every day for the owner.

# Code Location
- I want the billing logic to be located in /src/server/billing/engine.ts.
- We need unit tests for all of the above scenarios.
- Keep unit tests updated that cover at least the above scenarios.

# Data Model
## Members
- isActive

## Memberships
- planId
- start and end dates for the plan
- lastBillingDate

# Thoughts
Ignore this section.

- Can we automatically pro-rate mid-month recurring charges? But what if we are on daily billing?
