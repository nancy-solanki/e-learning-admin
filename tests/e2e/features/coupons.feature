@coupons
Feature: Coupon draft import and management
  Scenario: Validate imports, create, partially edit, delete and restore a coupon
    Given I am signed in as admin
    And an empty coupon service with Python Basics available
    When I open "/coupons"
    And I open the coupon editor
    Then the course selector is enabled
    When I choose "Python Basics" from "Course" in the dialog
    And I choose "Fixed amount" from "Discount type" in the dialog
    Then the coupon selectors show the chosen course and discount type
    When I upload a malformed coupon draft
    Then the coupon editor reports that one object is required
    When I drop a valid coupon draft
    Then the coupon code is "LEARN20"
    When I import a coupon for an unavailable course
    Then the editor requires an available course
    When I submit the coupon
    Then the dialog shows "Select an available course before saving."
    And no coupon has been created
    When I import the bundled coupon template
    Then the dialog shows "Your draft is imported. Select a course before saving."
    When I choose "Python Basics" from "Course" in the dialog
    And I submit the coupon
    Then I see the heading "LEARN20"
    When I change the coupon discount to 25
    Then the coupon discount is 25 percent
    When I delete the coupon
    Then the coupon notice says "Coupon deleted successfully"
    When I choose "Deleted" from "Coupon visibility"
    And I restore the coupon
    Then the coupon notice says "Coupon activated successfully"
    And the coupon service received two visibility changes
    And the page fits the viewport
