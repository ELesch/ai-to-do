/**
 * Site Configuration
 * Global site metadata and settings
 */

export const siteConfig = {
  name: 'AI Todo',
  description: 'AI-powered task management application that helps you get things done smarter.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ogImage: '/og-image.png',
  creator: 'AI Todo Team',
  keywords: [
    'todo',
    'task management',
    'AI',
    'productivity',
    'organization',
    'planning',
  ],
  links: {
    github: 'https://github.com/your-org/ai-todo',
    docs: '/docs',
    support: '/support',
  },
  features: {
    ai: {
      enabled: true,
      suggestionsEnabled: true,
      decompositionEnabled: true,
      researchEnabled: true,
      draftingEnabled: true,
    },
    collaboration: {
      enabled: false, // Future feature
    },
    integrations: {
      googleCalendar: false, // Future feature
      slack: false, // Future feature
    },
  },
}

export type SiteConfig = typeof siteConfig
