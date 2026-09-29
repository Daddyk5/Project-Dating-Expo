import { LegalPage } from "@/components/legal-page";

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      sections={[
        ["Placeholder", "These terms are a placeholder for development. Replace them with your reviewed Terms of Service before launch."],
        ["Eligibility", "You must be at least 18 years old to create an account or use KingxQueen."],
        ["Your conduct", "Be respectful. Harassment, scams, explicit content sent without consent, impersonation and fake profiles are not allowed and may lead to removal."],
        ["Demo profiles", "Profiles marked \"Demo\" are fictional and exist only for testing. They can't receive messages."],
        ["Account deletion", "You can delete your account at any time from Profile → Delete account. This removes your profile, photos, matches and messages."],
      ]}
    />
  );
}
