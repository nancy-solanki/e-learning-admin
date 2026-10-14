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
      | /courses  | Courses.  |
      | /sections | Sections. |
      | /lectures | Lectures. |
      | /wallets  | Wallet.   |

  Scenario Outline: <role> cannot access admin enrollments
    Given I am signed in as <role>
    When I open "/enrollments"
    Then the URL is "/"
    And I see the heading "Welcome to your dashboard"

    Examples:
      | role       |
      | instructor |
      | learner    |

  Scenario: Unknown routes return to the dashboard
    Given I am signed in as admin
    When I open "/unknown-page"
    Then the URL is "/"
    And I see the heading "Welcome to your dashboard"
