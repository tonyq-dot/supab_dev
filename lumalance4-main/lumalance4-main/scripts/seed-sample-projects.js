/**
 * Seed script for sample projects
 * 
 * This script populates the database with sample projects
 * Run with: node scripts/seed-sample-projects.js
 */

require('dotenv').config();
const { query, transaction } = require('../server/database/connection');
const bcrypt = require('bcrypt');

// Simple slugify function
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// Sample projects data
const sampleProjects = [
  {
    title: 'Develop a Responsive E-commerce Website',
    description: `We're looking for an experienced web developer to create a responsive e-commerce website for our boutique clothing store. The website should have the following features:

- Modern, clean design that works well on mobile and desktop
- Product catalog with categories and filters
- Shopping cart and checkout functionality
- User accounts and order history
- Integration with Stripe for payments
- Admin panel for managing products and orders

We already have brand guidelines and product images ready to use. The ideal candidate will have experience with React, Next.js, and e-commerce development.`,
    budget: 3500,
    deadline: '2025-09-15',
    status: 'active',
    categories: ['Web Development'],
    skills: ['React', 'Next.js', 'JavaScript', 'HTML', 'CSS', 'Responsive Design']
  },
  {
    title: 'Mobile App for Fitness Tracking',
    description: `We need a skilled mobile developer to build a fitness tracking app for iOS and Android. The app should allow users to:

- Track workouts and exercises
- Monitor progress with charts and statistics
- Set goals and receive notifications
- Connect with friends and share achievements
- Sync with Apple Health and Google Fit

We have UI/UX designs ready in Figma. Looking for someone with experience in React Native or Flutter who can deliver a high-quality, performant app.`,
    budget: 5000,
    deadline: '2025-10-30',
    status: 'active',
    categories: ['Mobile Development'],
    skills: ['React Native', 'iOS Development', 'Android Development', 'Mobile UI Design']
  },
  {
    title: 'Data Visualization Dashboard for Marketing Analytics',
    description: `Our marketing team needs a custom dashboard to visualize and analyze campaign performance data. The dashboard should:

- Pull data from our existing APIs (Google Analytics, Facebook Ads, etc.)
- Display key metrics with interactive charts and graphs
- Allow filtering and comparison of different time periods
- Support exporting reports in PDF and CSV formats
- Provide insights and trend analysis

We're looking for someone with strong data visualization skills and experience with dashboard development.`,
    budget: 2800,
    deadline: '2025-08-20',
    status: 'active',
    categories: ['Data Science', 'Web Development'],
    skills: ['JavaScript', 'Data Visualization', 'React', 'Python', 'SQL']
  },
  {
    title: 'Redesign Our Company Website',
    description: `We're looking to refresh our company website with a modern design that better reflects our brand identity. The website should:

- Have a clean, professional look
- Be fully responsive and mobile-friendly
- Include animations and interactive elements
- Optimize page load speed and performance
- Improve SEO and accessibility

We have 5-7 pages that need to be redesigned. Please share examples of similar work you've done in the past.`,
    budget: 2000,
    deadline: '2025-09-01',
    status: 'active',
    categories: ['UI/UX Design', 'Web Development'],
    skills: ['UI Design', 'UX Design', 'HTML', 'CSS', 'JavaScript', 'Figma']
  },
  {
    title: 'Develop a Blockchain-based Supply Chain Tracking System',
    description: `We're a manufacturing company looking to implement a blockchain solution for tracking our supply chain. The system should:

- Record and verify the movement of goods through our supply chain
- Provide immutable records of transactions and handoffs
- Allow partners and customers to verify authenticity
- Include a web interface for monitoring and management
- Generate reports and analytics

Experience with Ethereum, smart contracts, and supply chain solutions is required.`,
    budget: 7500,
    deadline: '2025-12-15',
    status: 'active',
    categories: ['Blockchain', 'Web Development'],
    skills: ['Blockchain Development', 'Smart Contracts', 'Solidity', 'Ethereum', 'JavaScript']
  },
  {
    title: 'Content Writing for Tech Blog',
    description: `We're looking for a skilled content writer to create articles for our tech blog. Topics will include:

- Software development best practices
- Emerging technologies and trends
- Tutorials and how-to guides
- Case studies and success stories

We need someone who can write engaging, technically accurate content that appeals to developers and tech professionals. Articles should be 1500-2000 words each, and we're looking for 2-3 articles per month.`,
    budget: 1200,
    deadline: '2025-08-30',
    status: 'active',
    categories: ['Content Creation'],
    skills: ['Content Writing', 'Technical Writing', 'Editing', 'SEO Writing']
  },
  {
    title: 'DevOps Implementation for SaaS Platform',
    description: `We need a DevOps engineer to help us implement CI/CD pipelines and infrastructure as code for our SaaS platform. The project includes:

- Setting up CI/CD pipelines with GitHub Actions
- Containerizing our application with Docker
- Deploying to Kubernetes on AWS
- Implementing monitoring and logging
- Automating infrastructure provisioning with Terraform
- Establishing backup and disaster recovery procedures

The ideal candidate will have extensive experience with modern DevOps practices and tools.`,
    budget: 6000,
    deadline: '2025-11-30',
    status: 'active',
    categories: ['DevOps'],
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'GitHub Actions', 'Terraform']
  },
  {
    title: 'Social Media Marketing Campaign',
    description: `We're launching a new product and need a social media marketing expert to plan and execute our campaign. The project includes:

- Developing a comprehensive social media strategy
- Creating content for Instagram, Facebook, Twitter, and LinkedIn
- Managing paid advertising campaigns
- Engaging with followers and responding to comments
- Tracking performance and providing weekly reports

The campaign will run for 2 months, and we're looking for someone who can deliver measurable results.`,
    budget: 3000,
    deadline: '2025-09-30',
    status: 'active',
    categories: ['Marketing'],
    skills: ['Social Media Marketing', 'Content Marketing', 'Facebook Ads', 'Instagram Marketing', 'Analytics']
  }
];

/**
 * Create a test user if it doesn't exist
 */
async function createTestUser() {
  try {
    // Check if test user exists
    const userResult = await query('SELECT * FROM users WHERE email = $1', ['client@example.com']);
    
    if (userResult.rows.length > 0) {
      console.log('Test user already exists, using existing user');
      return userResult.rows[0];
    }
    
    // Create test user
    console.log('Creating test user...');
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('password123', saltRounds);
    
    // Insert user
    const newUserResult = await query(
      `INSERT INTO users (email, password_hash, is_active, is_admin)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['client@example.com', passwordHash, true, false]
    );
    
    const userId = newUserResult.rows[0].id;
    
    // Create profile for user
    await query(
      `INSERT INTO profiles (user_id, first_name, last_name, display_name)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'Test', 'Client', 'Test Client']
    );
    
    console.log(`Test user created with ID: ${userId}`);
    return newUserResult.rows[0];
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

/**
 * Get category and skill IDs by name
 */
async function getCategoryAndSkillIds() {
  try {
    // Get all categories
    const categoriesResult = await query('SELECT id, name FROM categories');
    const categories = categoriesResult.rows.reduce((acc, cat) => {
      acc[cat.name] = cat.id;
      return acc;
    }, {});
    
    // Get all skills
    const skillsResult = await query('SELECT id, name FROM skills');
    const skills = skillsResult.rows.reduce((acc, skill) => {
      acc[skill.name] = skill.id;
      return acc;
    }, {});
    
    return { categories, skills };
  } catch (error) {
    console.error('Error getting category and skill IDs:', error);
    throw error;
  }
}

/**
 * Seed sample projects
 */
async function seedSampleProjects() {
  try {
    console.log('Starting to seed sample projects...');
    
    // Create test user
    const user = await createTestUser();
    
    // Get category and skill IDs
    const { categories, skills } = await getCategoryAndSkillIds();
    
    // Use transaction to ensure data consistency
    await transaction(async (client) => {
      for (const project of sampleProjects) {
        console.log(`Creating project: ${project.title}`);
        
        // Create slug from title
        const slug = slugify(project.title);
        
        // Insert project
        const projectResult = await client.query(
          `INSERT INTO projects (
            title, 
            slug, 
            description, 
            client_id, 
            budget, 
            deadline, 
            status, 
            is_public
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            project.title,
            slug,
            project.description,
            user.id,
            project.budget,
            project.deadline,
            project.status,
            true
          ]
        );
        
        const projectId = projectResult.rows[0].id;
        
        // Add categories
        for (const categoryName of project.categories) {
          if (categories[categoryName]) {
            await client.query(
              `INSERT INTO project_categories (project_id, category_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [projectId, categories[categoryName]]
            );
          } else {
            console.warn(`Category not found: ${categoryName}`);
          }
        }
        
        // Add skills
        for (const skillName of project.skills) {
          if (skills[skillName]) {
            await client.query(
              `INSERT INTO project_skills (project_id, skill_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [projectId, skills[skillName]]
            );
          } else {
            console.warn(`Skill not found: ${skillName}`);
          }
        }
      }
    });
    
    console.log('Sample projects seeded successfully!');
    
    // Get count for verification
    const projectCount = await query('SELECT COUNT(*) FROM projects');
    
    console.log(`Created ${projectCount.rows[0].count} projects.`);
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('Error seeding sample projects:', error);
    process.exit(1);
  }
}

// Run the seed function
seedSampleProjects();
