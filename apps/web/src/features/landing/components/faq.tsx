import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is included in SSO?",
    answer:
      "SSO includes platform authentication, RBAC, owner/admin controls, user management, invitations, activity logs, Redis-backed caching, rate limits, and a TanStack admin UI.",
  },
  {
    question: "Can end users exist without admin access?",
    answer:
      "Yes. Identity, SSO platform access, and client application access are separate concerns. A user can authenticate for an app without being allowed into the SSO admin dashboard.",
  },
  {
    question: "Can this replace the old production SSO?",
    answer:
      "That is the goal. The old production app remains the behavior and migration reference, while this app becomes the safer and more capable replacement.",
  },
  {
    question: "What is planned next?",
    answer:
      "The next product layer is application/client management, app-specific access, and secure app-scoped token flows.",
  },
  {
    question: "What is the tech stack?",
    answer:
      "The stack includes TanStack Start, React 19, Elysia, Prisma, PostgreSQL, Redis, Better Auth, Tailwind 4, and Bun.",
  },
];

export const FAQ = () => {
  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg">
            Find answers to common questions about SSO.
          </p>
        </div>

        <Accordion className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="px-6 border border-border rounded-xl"
            >
              <AccordionTrigger className="text-left font-semibold text-lg hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
