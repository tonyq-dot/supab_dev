/**
 * Seed script for categories and skills
 * 
 * This script populates the database with initial categories and skills
 * Run with: node scripts/seed-categories-skills.js
 */

require('dotenv').config();
const { query, transaction } = require('../server/database/connection');

// Categories with associated skills
const categoriesWithSkills = [
  {
    name: 'Web Development',
    description: 'Development of websites and web applications',
    skills: [
      'HTML',
      'CSS',
      'JavaScript',
      'TypeScript',
      'React',
      'Angular',
      'Vue.js',
      'Next.js',
      'Node.js',
      'Express',
      'PHP',
      'Laravel',
      'WordPress',
      'Shopify',
      'Responsive Design',
      'Web Accessibility',
      'Progressive Web Apps',
      'WebSockets'
    ]
  },
  {
    name: 'Mobile Development',
    description: 'Development of mobile applications for iOS and Android',
    skills: [
      'iOS Development',
      'Swift',
      'Objective-C',
      'Android Development',
      'Kotlin',
      'Java',
      'React Native',
      'Flutter',
      'Xamarin',
      'Mobile UI Design',
      'App Store Optimization',
      'Push Notifications',
      'Mobile Security'
    ]
  },
  {
    name: 'UI/UX Design',
    description: 'User interface and user experience design',
    skills: [
      'UI Design',
      'UX Design',
      'Wireframing',
      'Prototyping',
      'User Research',
      'Usability Testing',
      'Figma',
      'Adobe XD',
      'Sketch',
      'Adobe Photoshop',
      'Adobe Illustrator',
      'Design Systems',
      'Interaction Design',
      'Information Architecture'
    ]
  },
  {
    name: 'Data Science',
    description: 'Analysis and interpretation of complex data',
    skills: [
      'Data Analysis',
      'Machine Learning',
      'Deep Learning',
      'Natural Language Processing',
      'Computer Vision',
      'Python',
      'R',
      'SQL',
      'TensorFlow',
      'PyTorch',
      'Pandas',
      'NumPy',
      'Data Visualization',
      'Tableau',
      'Power BI',
      'Statistical Analysis',
      'Big Data'
    ]
  },
  {
    name: 'DevOps',
    description: 'Development operations and infrastructure',
    skills: [
      'Docker',
      'Kubernetes',
      'AWS',
      'Azure',
      'Google Cloud',
      'CI/CD',
      'Jenkins',
      'GitHub Actions',
      'Terraform',
      'Ansible',
      'Linux Administration',
      'Monitoring',
      'Logging',
      'Security',
      'Networking',
      'Serverless'
    ]
  },
  {
    name: 'Blockchain',
    description: 'Blockchain development and smart contracts',
    skills: [
      'Blockchain Development',
      'Smart Contracts',
      'Solidity',
      'Ethereum',
      'Web3.js',
      'Cryptocurrency',
      'NFTs',
      'DeFi',
      'Consensus Algorithms',
      'Cryptography',
      'Hyperledger',
      'Blockchain Security'
    ]
  },
  {
    name: 'Content Creation',
    description: 'Creation of written, visual, and audio content',
    skills: [
      'Copywriting',
      'Content Writing',
      'Technical Writing',
      'Editing',
      'Proofreading',
      'SEO Writing',
      'Blog Writing',
      'Article Writing',
      'Creative Writing',
      'Scriptwriting',
      'Video Production',
      'Podcasting',
      'Voice Over'
    ]
  },
  {
    name: 'Marketing',
    description: 'Digital marketing and advertising',
    skills: [
      'Digital Marketing',
      'Social Media Marketing',
      'Email Marketing',
      'Content Marketing',
      'SEO',
      'SEM',
      'Google Ads',
      'Facebook Ads',
      'Instagram Marketing',
      'TikTok Marketing',
      'Influencer Marketing',
      'Marketing Strategy',
      'Brand Development',
      'Market Research',
      'Analytics'
    ]
  },
  {
    name: 'Project Management',
    description: 'Management and coordination of projects',
    skills: [
      'Project Management',
      'Agile',
      'Scrum',
      'Kanban',
      'Waterfall',
      'JIRA',
      'Trello',
      'Asana',
      'Microsoft Project',
      'Risk Management',
      'Budgeting',
      'Scheduling',
      'Team Leadership',
      'Stakeholder Management'
    ]
  }
];

/**
 * Seed categories and skills
 */
async function seedCategoriesAndSkills() {
  try {
    console.log('Starting to seed categories and skills...');
    
    // Use transaction to ensure data consistency
    await transaction(async (client) => {
      for (const category of categoriesWithSkills) {
        console.log(`Creating category: ${category.name}`);
        
        // Create slug from name
        const slug = category.name
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, '-');
        
        // Insert category
        const categoryResult = await client.query(
          `INSERT INTO categories (name, slug, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (name) DO UPDATE
           SET description = EXCLUDED.description
           RETURNING id`,
          [category.name, slug, category.description]
        );
        
        const categoryId = categoryResult.rows[0].id;
        
        // Insert skills for this category
        for (const skillName of category.skills) {
          console.log(`  - Adding skill: ${skillName}`);
          
          // Create slug from name
          const skillSlug = skillName
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '-');
          
          // Insert skill
          await client.query(
            `INSERT INTO skills (name, slug, category_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (name) DO UPDATE
             SET category_id = EXCLUDED.category_id`,
            [skillName, skillSlug, categoryId]
          );
        }
      }
    });
    
    console.log('Categories and skills seeded successfully!');
    
    // Get counts for verification
    const categoryCount = await query('SELECT COUNT(*) FROM categories');
    const skillCount = await query('SELECT COUNT(*) FROM skills');
    
    console.log(`Created ${categoryCount.rows[0].count} categories and ${skillCount.rows[0].count} skills.`);
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories and skills:', error);
    process.exit(1);
  }
}

// Run the seed function
seedCategoriesAndSkills();
