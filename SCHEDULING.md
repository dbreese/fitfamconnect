# Summary

This file contains information on how scheduling works, including rules and test scenarios.

# Concepts
- Classes are scheduled at a date and time to be either a 1-time event, or a recurring event.
- Take into consideration that some scheduled classes occur just a single time at a given date/time, but there are also recurring scheduled classes that can run from a start date up until either an optional end date, or forever.
- 1-time events and recurring events can collide on a given date and time. The test scenarios below explain the expected behavior.
- The @server/schedule/engine.ts will have functions to validate scheduling tasks as described in the test scenarios below.
- Scheduled classes can also include a location. 
    - Two schedules which have the same date/time are not considered conflicting if they are each for a different location.
- The Schedule datamodel is defined in /src/server/db/schedule.ts
- The Class datamodel is defined in /src/server/db/class.ts
    - duration in minutes
    - 
# Test Scenarios
- Use a real database test approach instead of mocking the database. I want the database to be tested too. See billing/__tests__/engine.test.ts as an example.
- all dates are modern in 2025
- all times below are shown in mountain standard time

## No conflicts for non-recurring schedule.
Test Steps:
- There are no existing schedules.
- Schedule a 1 time class on Monday, Sept 1 at 5am.

Results: 
- No conflicts are found because there are no existing schedules.

## Conflict with a new 1-time schedule.
Test Steps:
- Schedule a 1 time class on Monday, Sept 1 at 5am. 
- Attempt to schedule another 1-time class at the same time.

Results:
- An error is returned indicating the scheduling conflict.

## Conflict with a new recurring schedule and a 1-time class.
Test Steps: 
- Schedule a 1 time class on Monday, Sept 8 at 5am. 
- Schedule a recurring class that starts on Monday, Sept 1 and occurs Mondays at 5am.

Results: 
- An error is returned indicating that the new recurring schedule will cause a conflict with the 1-time scheduled class.

## Conflict with a new recurring schedule and an existin recurring schedule.
Test Steps:
- Schedule a recurring class that starts on Wednesday, Sept 3 and occurs every Monday at 5am.
- Attempt to schedule another recurring schedule that starts on Sept 8 and occurs on Mondays and Wednesdays at 5am.

Results:
- An error is returned indicating that the new recurring schedule will cause a conflict with the existing recurring schedule.

## No conflict with new recurring schedules when they are on different days.
Test Steps:
- Schedule a recurring class that starts on Monday, Sept 1 and occurs every Monday at 5am.
- Schedule a recurring class that starts on Tuesday, Sept 2 and occurs every Tuesday at 5am.
- Do the same pattern for all the rest of the days of the week (ie, Wednesday, Sept 3 that occurs every Wednesday at 5am, etc)

Results:
- No scheduling errors occur because they are all on a different day.

## Exact times do not match, but are conflicting when the new schedule start and end dates are before and after the old schedule.
Test Steps:
- Schedule a 1-time class that starts on Monday, Sept 8 at 5:15am and is 30 minutes in length.
- Schedule another 1-time class that starts on Monday, Sept 8 at 5:00am and is 60 minutes in length.

Results:
- Error occurs because the new schedule dates are conflicting with the old schedule.

## Exact times do not match, but are conflicting when the new schedule start and end dates are contained inside the old schedule.
Test Steps:
- Schedule a 1-time class that starts on Monday, Sept 8 at 5:00am and is 60 minutes in length.
- Schedule another 1-time class that starts on Monday, Sept 8 at 5:10am and is 10 minutes in length.

Results:
- Error occurs because the new schedule dates are conflicting with the old schedule.

## Exact times do not match for recurring schedules and are conflicting.
Test Steps:
- Schedule a recurring class that starts on Monday, Sept 8 at 5:15am and is 30 minutes in length and occurs every Monday.
- Schedule another recurring class that starts on Monday, Sept 1 at 5:00am and is 30 minutes in length.

Results:
- Error occurs because the new schedule conflicts with the first schedule.

## Exact times do not match for recurring schedules and are conflicting.
Test Steps:
- Schedule a recurring class that starts on Monday, Sept 1 at 5:15am and is 30 minutes in length and occurs every Monday.
- Schedule a 1-time class that starts on Monday, Sept 8 at 5:00am and is 30 minutes in length.

Results:
- Error occurs because the new schedue conflicts with the first schedule.

## Times overlap for non-recurring scheduled classes.
Test Steps:
- Schedule a 1-time class that occurs on Monday, Sept 1 at 5:15 and is 10 minutes in length.
- Schedule a new 1-time class that occurs on Monday, Sept 1 at 5:00 and is 16 minutes in length.

Results:
- Error occurs because the new schedule conflicts with the first schedule.

## TODO
- end date scenarios on recurring schedules
