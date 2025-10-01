# Summary

This document explains how billing works.

# Description

We will use a processed called "accumulation billing". Basically, when run, it looks at the lastBillingRunDate on the Gym datamodel to see when billing was last run. It starts at the lastBillingRunDate + 1day and runs billing one day at a time using the rules defined in @BILLING-DAILY.md.

When biling is committed, it will update the lastBillingRunDate as well as the membership lastBilledDate and nextBilledDate records.
