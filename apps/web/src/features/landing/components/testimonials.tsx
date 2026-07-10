import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    content:
      "SSO gives us a clear place to manage identity, roles, and access across our applications.",
    author: "Alex Rivera",
    role: "Founder at TechFlow",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100&h=100",
  },
  {
    content:
      "The admin controls, activity logs, and RBAC model make access decisions much easier to reason about.",
    author: "Sarah Chen",
    role: "Senior Engineering Manager",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100&h=100",
  },
  {
    content:
      "The migration path lets us preserve existing auth flows while building a safer foundation.",
    author: "James Wilson",
    role: "Independent Indie Hacker",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100&h=100",
  },
];

export const Testimonials = () => {
  return (
    <section id="testimonials" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
            Built for platform teams
          </h2>
          <p className="text-muted-foreground text-lg">
            Centralize identity and access without mixing platform permissions
            with application authorization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-8 rounded-2xl bg-card border border-border relative"
            >
              <div className="text-4xl text-primary/20 absolute top-4 left-6 italic font-serif">
                "
              </div>
              <p className="text-lg mb-8 relative z-10 italic text-foreground/80 leading-relaxed">
                {testimonial.content}
              </p>
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage
                    src={testimonial.avatar}
                    alt={testimonial.author}
                  />
                  <AvatarFallback>{testimonial.author[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-bold">{testimonial.author}</h4>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
