@access
Feature: Route access and session boundaries
  Scenario Outline: Anonymous visitors must sign in to open <path>
    Given I am anonymous
    When I open "<path>"
    Then the URL is "/auth/sign-in"
    And the sign-in form is available

    Examples:
      | path           |
      | /              |
      | /profile       |
      | /users         |
      | /categories    |
      | /coupons       |
      | /courses       |
      | /sections      |
      | /lectures      |
      | /wallets       |
      | /enrollments   |
      | /localizations |

  Scenario Outline: Instructors cannot open admin curriculum at <path>
    Given I am signed in as instructor
    When I open "<path>"
    Then the URL is "/"
    And I see the heading "Welcome to your dashboard"

    Examples:
      | path      |
      | /sections |
      | /lectures |

  Scenario: An instructor cannot open the admin wallet
    Given I am signed in as instructor
    When I open "/wallets"
    Then the URL is "/"
    And I see the heading "Welcome to your dashboard"

  Scenario: A learner cannot open the wallet page
    Given I am signed in as learner
    When I open "/wallets"
    Then the URL is "/auth/sign-in"
    And the sign-in form is available

  Scenario: A learner cannot access enrollments
    Given I am signed in as learner
    When I open "/enrollments"
    Then the URL is "/auth/sign-in"
    And the sign-in form is available

  Scenario: Unknown routes show a helpful 404 with a route home
    Given I am signed in as admin
    When I open "/unknown-page"
    Then I see the heading "Page not found"
    When I follow the link "Back to home"
    Then the URL is "/"
    And I see the heading "Welcome to your dashboard"

  Scenario: A learner cannot access the course catalog
    Given I am signed in as learner
    When I open "/courses"
    Then the URL is "/auth/sign-in"
    And the sign-in form is available

  Scenario: A learner cannot access the application home
    Given I am signed in as learner
    When I open "/"
    Then the URL is "/auth/sign-in"
    And the sign-in form is available
