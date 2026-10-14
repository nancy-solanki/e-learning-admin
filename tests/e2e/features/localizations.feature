@localizations
Feature: Localization management
  Scenario: Create, filter, update and delete a localization
    Given I am signed in as admin
    And an empty localization service
    When I open "/localizations"
    Then I see the heading "Localizations"
    And the record filter shows all records
    When I create the English localization for India
    Then the dialog is closed
    And I see "English"
    When I filter localizations by country "India"
    Then I see "English"
    When I change the English localization country to United Kingdom
    And I filter localizations by country ""
    Then I see "United Kingdom"
    When I delete the English localization
    Then the English localization has no delete or restore actions
    When I choose "Deleted" from "Filter by record status"
    Then the localization table shows a deleted record
    And the English localization has no delete or restore actions
