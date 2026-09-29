import { LegalPage } from "@/components/legal-page";

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        ["Placeholder", "This policy is a placeholder for development. Replace it with your reviewed Privacy Policy before launch."],
        ["What we store", "Your account email, profile details (name, birthdate, gender, interests, bio), photos, approximate location, swipes, matches and messages."],
        ["What others see", "Your first name, age (never your birthdate), photos, bio, interests, city and approximate distance. Your exact location is never shown."],
        ["AI features", "Icebreakers, bio suggestions, compatibility lines and message safety checks are generated on our servers from profile text and message content. Your email and location are never sent to the AI."],
        ["Deleting your data", "Profile → Delete account permanently removes your profile, photos, matches, messages and login."],
      ]}
    />
  );
}
