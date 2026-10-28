@preview @exports
Feature: Wallet records
  Background:
    Given I am signed in as admin

  Scenario Outline: Filter, inspect and export <kind>
    Given the wallet API is available
    When I open "/<kind>"
    And I apply the record filters for "<kind>"
    Then only the matching "<kind>" record is shown
    When I view the matching "<kind>" record
    Then the "<kind>" details are correct
    When I press Escape
    Then the dialog is closed
    When I export "<kind>"
    Then the "<kind>" CSV contains only the filtered record
    When I search "<noun>" for "missing record"
    Then the no-results state for "<kind>" is shown
    When I clear the filters
    Then all "<kind>" records are shown
    When I search "<noun>" for "<id>"
    Then only the matching "<kind>" record is shown
    And the page fits the viewport

    Examples:
      | kind        | noun         | id       |
      | wallets     | transactions | REF-WITHDRAWAL-1007 |
