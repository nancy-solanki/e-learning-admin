@users
Feature: User directory role filters
  Scenario: Role filters can be reset
    Given I am signed in as admin
    And the directory contains an admin and a learner
    When I open "/users"
    Then I see "Showing 2 of 2 users"
    When I filter users to "Admins"
    Then I see "Showing 1 of 2 users"
    And the directory shows Ada Lovelace
    When I filter users to "Instructors"
    Then I see the heading "No Users Found"
    When I reset the user filters
    Then I see "Showing 2 of 2 users"
