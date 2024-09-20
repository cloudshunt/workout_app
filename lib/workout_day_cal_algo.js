/*

SET daysPassed = todayDate - startDate
SET todayTrainDay
IF daysPassed < scheduleDaysCount
  todayTrainDay = day 1 + daysPassed
ELSE
  todayTrainDay = daysPassed  % scheduleDaysCount + 1 day

Need to look at possible combination to double check if the calculation 
is correct

workout schedule:
day1 day2 day3 day4 day5 day6 day7
push rest pull rest legs rest rest

Scenario 1:
  start date 9/1
  today date 9/5

  9/1 - 9/5 = 4 
  IF 4 < 7:
    todayTrainDay = day 1 + 4days = day 5 

Scenario 2:
  start date 9/1
  today date 9/7

  9/1 - 9/7 = 6 
  IF 6 < 7:
    todayTrainDay = day 1 + 6days = day 7

Scenario 3:
  start date 9/1
  today date 9/17

  SET daysPassed = 9/17 - 9/1 = 16 days
  todayTrainDay = (16  % 7) + 1=  3 = day 3
  

Scenario 4:
  start date 9/1
  today date 9/21

    SET daysPassed = 9/21 - 9/1 = 20 days
  todayTrainDay = (20  % 7) + 1=  7 = day 7
 */