@preview @courses
Feature: Course catalog preview
  Background:
    Given I am signed in as admin
    When I open "/courses"

  Scenario: Filter and sort courses and inspect a course
    Then I see 6 of 6 courses
    When I choose "Design" from "Category"
    Then I see 2 of 6 courses
    When I filter courses to drafts
    Then I see 1 of 6 courses
    When I search "courses" for "no matching course"
    Then I see the heading "No courses found"
    When I clear the filters
    And I choose "Title: A–Z" from "Sort courses"
    Then the first course is "Brand identity: Make your mark"
    When I view the first course
    Then the course dialog describes "Brand identity: Make your mark"
    When I return to courses
    Then the dialog is closed

  Scenario: Course drafts validate required fields and are temporary
    When I start a course draft
    And I submit an empty course draft
    Then the course title is required
    When I create a course draft with a price of 42.50
    Then the dialog is closed
    And the new course is a draft
    When I view the new course
    Then the course dialog shows the draft price
    When I press Escape
    And I reload the page
    Then I see 6 of 6 courses
    And the temporary course is gone
