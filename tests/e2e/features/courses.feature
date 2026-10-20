@courses
Feature: Admin course catalog
  Background:
    Given I am signed in as admin
    And the course service has 21 courses
    When I open "/courses"

  Scenario: Scroll through courses and inspect course details
    Then the course count shows "Showing 20 of 21 courses"
    When I scroll to the end of the courses
    Then the course count shows "Showing 21 of 21 courses"
    And the first course is "Course 01"
    When I view the first course
    Then the course dialog describes "Course 01"
    And the dialog shows "Complete lessons with hands-on exercises."
    When I press Escape
    Then the dialog is closed


  Scenario: Search, empty results and server sorting
    When I choose "Title: Z–A" from "Sort courses"
    Then the first course is "Course 21"
    When I search "courses" for "no matching course"
    Then I see "No courses found. Try another search or adjust your filters."
    When I search "courses" for "Course 01"
    Then the first course is "Course 01"
    And the course count shows "Showing 1 of 1 courses"
    And the page fits the viewport

  Scenario: Applied status filters survive reload and can be cleared
    When I open course filters
    And I choose "Draft" from "Status" in the dialog
    And I apply course filters
    Then the first course is "Course 01"
    And the course count shows "Showing 1 of 1 courses"
    When I reload the page
    Then the course count shows "Showing 1 of 1 courses"
    When I clear the filters
    Then the course count shows "Showing 20 of 21 courses"
