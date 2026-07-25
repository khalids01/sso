import { HelpCircle } from "lucide-react";
import { BRANDING } from "@/constants/branding";

const faqs = [
  {
    question: "What is Single Sign-On (SSO)?",
    answer:
      `Single sign-on allows users to sign in once with ${BRANDING.appName} and securely access connected applications without maintaining separate credentials for each one.`,
  },
  {
    question: "Which authentication methods are supported?",
    answer:
      "Users can sign in using social providers including Google, GitHub, Meta (Facebook), and LinkedIn, or via passwordless magic links delivered directly to their email.",
  },
  {
    question: "How is my account data kept secure?",
    answer:
      "All profile data, tokens, and credentials are encrypted in transit using TLS 1.3 and at rest. We adhere strictly to data privacy standards and never share or monetize user data.",
  },
  {
    question: "Can users manage their active sessions and data?",
    answer:
      "Yes. Users can manage active login sessions, view account activity, and initiate self-service data deletion or provider access revocation at any time.",
  },
  {
    question: `How does ${BRANDING.appName} use Google data?`,
    answer:
      "Google Sign-In supplies only your account identifier, name, email address, and profile picture. We use this information to create or match your account, verify your identity, and sign you in. We do not request Gmail, Drive, Calendar, or other Google content.",
  },
  {
    question: `How do I access ${BRANDING.appName}?`,
    answer:
      "Click the Login button at the top of the page, choose a supported sign-in method, and access your connected applications.",
  },
];

export const FAQ = () => {
  return (
    <section id="faq" className="py-24 bg-muted/30 border-t border-border/40 text-left">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" />
            Frequently Asked Questions
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Questions & Answers
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Everything you need to know about {BRANDING.appName}.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl border border-border/80 bg-card space-y-3 shadow-xs"
            >
              <h3 className="text-lg font-bold text-foreground">{faq.question}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
