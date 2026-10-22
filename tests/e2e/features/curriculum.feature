@curriculum
Feature: Admin section and lecture moderation
  Background:
    Given I am signed in as admin
    And I prepare the admin section and lecture APIs

  Scenario: View and moderate sections and lectures without editing metadata
    When I open "/sections"
    Then I see the heading "Sections."
    And the section filters are available in a drawer
    And section status filters are available
    And admin navigation omits the All Sections and All Lectures links
    And I see "Introduction"
    And there are no create, edit, delete, or restore actions
    When I change section status to "Draft"
    Then the section status is "Draft"
    And the section patch contains only status
    When I open "/lectures"
    Then I see the heading "Lectures."
    And the lecture filters are available in a drawer
    And lecture status filters are available
    And I see "Welcome to the course"
    And there are no create, edit, delete, or restore actions
    When I reject the lecture with reason "Improve the audio quality."
    Then the lecture status is "Rejected"
    And the lecture patch contains only status and rejection reason
