@preview @curriculum
Feature: Curriculum preview
  Background:
    Given I am signed in as admin

  Scenario Outline: Manage temporary <kind>
    When I open "/<kind>"
    Then I see 6 of 6 <kind>
    When I filter curriculum by the web development course
    Then I see 2 of 6 <kind>
    When I search "<kind>" for "no matching entry"
    Then I see the heading "No <kind> found"
    When I clear the filters
    And I start a new <kind> entry
    And I submit the empty <kind> entry
    Then the curriculum title is required
    When I create the <kind> entry
    Then I see 7 of 7 <kind>
    When I edit the <kind> entry
    Then the updated <kind> entry is visible
    When I cancel another edit to the <kind> entry
    Then the updated <kind> entry is visible
    When I reload the page
    Then I see 6 of 6 <kind>
    And the temporary <kind> entry is gone
    When I explore "<related>"
    Then the URL is "/<related>"

    Examples:
      | kind     | related  |
      | sections | lectures |
      | lectures | sections |

  Scenario Outline: Lecture status <status> survives reload
    When I open "/lectures?status=<status>"
    Then the "<status>" lecture filter is selected
    And there are <count> curriculum cards
    When I reload the page
    Then there are <count> curriculum cards
    When I show all lectures
    Then the URL is "/lectures"
    And there are 6 curriculum cards

    Examples:
      | status    | count |
      | Published | 2     |
      | Draft     | 1     |
      | Pending   | 1     |
      | Approved  | 1     |
      | Rejected  | 1     |
