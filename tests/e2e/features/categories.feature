@categories
Feature: Category management
  Scenario: Create, update and delete a category while preserving its thumbnail
    Given I am signed in as admin
    And an empty category service will reject the first valid save
    When I open "/categories"
    And I start a Python category
    And I submit the category
    Then the dialog shows "Add a thumbnail image."
    When I upload an invalid category thumbnail
    Then the dialog shows "Please choose an image file."
    When I drop a Python thumbnail
    Then the dialog shows "python.png"
    When I submit the category
    Then the dialog shows "This title already exists."
    When I submit the category
    Then the dialog is closed
    And I see the heading "python"
    When I update the Python category description
    Then I see "Updated description"
    When I delete the Python category
    Then I see "Make room for something great"
    And the page fits the viewport
