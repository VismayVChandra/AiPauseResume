import { RawProfile } from "@/types/resume";

// Entirely fictional — lets a judge demo the flow with zero uploads.
// This is treated exactly like any other RawProfile: it still goes through
// AIService.tailorResume(), nothing about tailoring is faked.
export const DEMO_PROFILE: RawProfile = {
  fullName: "Jordan Ellis",
  headline: "Software Engineer | Backend Systems & APIs",
  contact: {
    email: "jordan.ellis.demo@example.com",
    phone: "+1 (555) 019-2837",
    location: "Austin, TX",
    linkedin: "linkedin.com/in/jordan-ellis-demo",
  },
  summary:
    "Backend-focused software engineer with 4 years building and scaling APIs for consumer products.",
  experience: [
    {
      company: "Northlane Software",
      title: "Software Engineer II",
      startDate: "Jun 2023",
      endDate: "Present",
      location: "Austin, TX",
      bullets: [
        "Rebuilt the order-processing service in Go, cutting p95 latency from 800ms to 210ms",
        "Designed a rate-limiting layer used by 6 downstream services",
        "Mentored 2 new-grad engineers through their first on-call rotations",
      ],
    },
    {
      company: "Fernbrook Labs",
      title: "Software Engineer I",
      startDate: "Aug 2021",
      endDate: "May 2023",
      location: "Remote",
      bullets: [
        "Built REST APIs in Node.js/Express serving the mobile app's checkout flow",
        "Migrated a legacy MongoDB schema to PostgreSQL with zero downtime",
        "Wrote integration tests that raised backend coverage from 41% to 78%",
      ],
    },
  ],
  education: [
    {
      institution: "University of Texas at Austin",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2017",
      endDate: "2021",
    },
  ],
  projects: [
    {
      name: "routewise",
      description: "Open-source delivery route optimizer",
      bullets: [
        "Implemented a nearest-neighbor + 2-opt heuristic reducing sample routes by 18%",
        "220+ GitHub stars",
      ],
      link: "github.com/jellis-demo/routewise",
    },
  ],
  skills: [
    "Go",
    "Node.js",
    "TypeScript",
    "PostgreSQL",
    "MongoDB",
    "Docker",
    "REST API design",
    "System design",
  ],
  certifications: [
    { name: "AWS Certified Developer – Associate", issuer: "AWS", date: "2024" },
  ],
};
