@profile
Feature: Profile preferences and password changes
  Scenario: Save preferences and require matching password confirmation
    Given a profile service that accepts changes
    When I open "/profile"
    Then the full name is "Ada Lovelace"
    When I save the full name "Augusta"
    Then I see "Profile details saved successfully."
    And the profile service received the name "Augusta"
    When I disable email notifications
    Then I see "Notification preferences saved successfully."
    And the profile service received disabled email notifications
    When I submit a password change with confirmation "different"
    Then I see "Passwords do not match."
    When I submit a password change with confirmation "newpassword"
    Then I see "Password changed successfully."
