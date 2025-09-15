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
If a recurring billing is applied and a member's startDate falls within the billing cycle, then we need to do partial billing. This is calculated by multiplying the recurring rate times the ratio of (the number of days the user was active in the period) / (number of days in the period)

### Scenarios 

For the following scenarios, assume a monthly billing of $100 and a yearly of $1200 for easy math.

1. User joins on Aug 31st and is on monthly billing. StartDate is set to Sept 1.
Billing runs on Sept 1st.
Billing runs on Oct 1st.

Results: 
- Sept 1 $100
- Oct 1 $100

2. User joins on Sept 15th and is on monthly billing. 
Billing runs on Sept 1st.
Billing runs on Oct 1st.

Results: 
- Sept 1 - $0 (user was not a member at the time of course)
- Oct 1 - $100 + $50

3. User joins on Sept 1st and is on weekly 


# Billing Run

A billing run is a single instance of a billing process. It is created by the owner and is used to bill a set of members for a given upcoming period. It does not specify a past period.

# Billing Period

- A billing period is a range of dates for which a billing run is created.
- The most common billing period will be from the 1st day of the month to the last day of the month.
- However, an owner could run billing every day (ie, batch billing), and perhaps we will eventually automate things to run every day for the owner.

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
