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

  Scenario Outline: Instructor pages reject a replacement learner session at <path>
    Given I am signed in as instructor
    When I open "<path>"
    Then the URL is "<path>"
    And I see the heading "<heading>"
    When the session changes to learner
    And I reload the page
    Then the URL is "/"
    And I see the heading "Welcome to your dashboard"

    Examples:
      | path      | heading   |
      | /sections | Sections. |
      | /lectures | Lectures. |

  Scenario: An instructor can open their own wallet
    Given I am signed in as instructor
    And the wallet API is available
    When I open "/wallets"
    Then I see the heading "Wallet."

  Scenario: A learner cannot open the wallet page
    Given I am signed in as learner
    When I open "/wallets"
    Then the URL is "/"
    And I see the heading "Welcome to your dashboard"

  Scenario Outline: <role> cannot access admin enrollments
    Given I am signed in as <role>
    When I open "/enrollments"
    Then the URL is "/"
    And I see the heading "Welcome to your dashboard"

    Examples:
      | role       |
      | instructor |
      | learner    |

  Scenario: Unknown routes show a helpful 404 with a route home
    Given I am signed in as admin
    When I open "/unknown-page"
    Then I see the heading "Page not found"
    When I follow the link "Back to home"
    Then the URL is "/"
    And I see the heading "Welcome to your dashboard"

  Scenario Outline: <role> cannot access the admin course catalog
    Given I am signed in as <role>
    When I open "/courses"
    Then the URL is "/"
    And I see the heading "Welcome to your dashboard"

    Examples:
      | role       |
      | instructor |
      | learner    |
