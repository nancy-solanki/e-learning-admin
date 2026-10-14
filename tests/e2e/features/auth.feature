@auth
Feature: Authentication and account recovery
  Scenario: Sign-in validates empty fields
    Given I am anonymous
    When I open "/users"
    Then the URL is "/auth/sign-in"
    When I submit the empty sign-in form
    Then I see "Enter a valid email address."
    And I see "Password is required."

  Scenario: Sign-in returns to the requested protected page
    Given sign-in will establish an admin session
    When I open "/profile"
    Then the URL is "/auth/sign-in"
    When I sign in with the admin credentials
    Then the URL is "/profile"
    And the profile form is visible

  Scenario: Activation submits no password even with an existing session
    Given I am signed in as admin
    And account activation will succeed
    When I open "/auth/activate-account/uid/token"
    And I activate my account
    Then the alert says "Account activated"
    And activation was requested without a password

  Scenario: Reset password reports success and expired links
    Given password reset will succeed
    When I open "/auth/reset-password/uid/token"
    And I submit a new password
    Then the alert says "Password reset"
    Given the password reset link has expired
    When I submit a new password
    Then the alert says "This link is invalid or expired."

  Scenario: Requesting a reset email reports success and field errors
    Given the reset email service will succeed
    When I open "/auth/forgot-password"
    And I request a password reset email
    Then I see "Check your email"
    Given the reset email service rejects the email address
    When I request a password reset email
    Then I see "Email is invalid"
