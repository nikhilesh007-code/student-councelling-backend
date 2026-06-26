import { prisma } from '../src/database';

const opportunities = [
  {
    title: 'Software Developer Intern',
    company: 'Google',
    companyLogo: 'google',
    location: 'Remote',
    workMode: 'Remote',
    type: 'Internship',
    duration: '3 months',
    stipend: '$5000/mo',
    deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    applyUrl: 'https://careers.google.com/',
    requiredSkills: ['JavaScript', 'React', 'Node.js', 'Python'],
    description: 'Work on real-world projects and build scalable solutions. You will be part of a dynamic team focusing on next-generation web technologies.',
    eligibility: 'Currently pursuing a BS/MS in Computer Science or related field.',
    source: 'system'
  },
  {
    title: 'Frontend Developer Intern',
    company: 'Microsoft',
    companyLogo: 'window',
    location: 'Hyderabad, India',
    workMode: 'Onsite',
    type: 'Internship',
    duration: '6 months',
    stipend: '₹80,000/mo',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    applyUrl: 'https://careers.microsoft.com/',
    requiredSkills: ['TypeScript', 'React', 'CSS', 'HTML'],
    description: 'Build amazing user experiences with modern web technologies.',
    eligibility: 'Pre-final or final year students in B.Tech/M.Tech.',
    source: 'system'
  },
  {
    title: 'Data Analyst Intern',
    company: 'Infosys',
    companyLogo: 'Infosys',
    location: 'Remote',
    workMode: 'Remote',
    type: 'Internship',
    duration: '4 months',
    stipend: '₹30,000/mo',
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    applyUrl: 'https://www.infosys.com/careers/',
    requiredSkills: ['Python', 'SQL', 'Data Analysis', 'Tableau'],
    description: 'Analyze data and generate insights to drive decisions.',
    eligibility: 'Open to all STEM majors.',
    source: 'system'
  },
  {
    title: 'AI/ML Research Intern',
    company: 'NVIDIA',
    companyLogo: 'memory',
    location: 'Bangalore, India',
    workMode: 'Hybrid',
    type: 'Internship',
    duration: '6 months',
    stipend: '₹1,00,000/mo',
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    applyUrl: 'https://www.nvidia.com/en-us/about-nvidia/careers/',
    requiredSkills: ['Python', 'PyTorch', 'Machine Learning', 'C++'],
    description: 'Research and implement state of the art deep learning models.',
    eligibility: 'Masters or PhD students preferred.',
    source: 'system'
  },
  {
    title: 'React Hackathon 2026',
    company: 'HackAura',
    companyLogo: 'code',
    location: 'Global',
    workMode: 'Remote',
    type: 'Hackathon',
    duration: '3 Days',
    stipend: 'Prizes up to $10,000',
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    applyUrl: 'https://devfolio.co/',
    requiredSkills: ['React', 'Next.js', 'Tailwind CSS'],
    description: 'A 72-hour hackathon focused on building the best React application.',
    eligibility: 'Open to all developers worldwide.',
    source: 'system'
  },
  {
    title: 'Product Manager Intern',
    company: 'PayPal',
    companyLogo: 'payments',
    location: 'Remote',
    workMode: 'Remote',
    type: 'Internship',
    duration: '3 months',
    stipend: '$6000/mo',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
    applyUrl: 'https://careers.paypal.com/',
    requiredSkills: ['Product Management', 'Agile', 'Data Analysis'],
    description: 'Drive product strategy and execution for our core payments platform.',
    eligibility: 'MBA or undergraduate business/tech students.',
    source: 'system'
  },
  {
    title: 'Backend Developer Intern',
    company: 'Amazon',
    companyLogo: 'shopping_cart',
    location: 'Seattle, WA',
    workMode: 'Onsite',
    type: 'Internship',
    duration: '12 weeks',
    stipend: '$8000/mo',
    deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    applyUrl: 'https://amazon.jobs/',
    requiredSkills: ['Java', 'Spring Boot', 'AWS', 'System Design'],
    description: 'Work on highly scalable distributed systems.',
    eligibility: 'Current student pursuing degree in Computer Science.',
    source: 'system'
  },
  {
    title: 'Full Stack Web Development Scholarship',
    company: 'Google Developers',
    companyLogo: 'google',
    location: 'Remote',
    workMode: 'Remote',
    type: 'Scholarship',
    duration: '6 months',
    stipend: 'Full Course Access + Mentorship',
    deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // EXPIRED (2 days ago)
    applyUrl: 'https://developers.google.com/',
    requiredSkills: ['HTML', 'CSS', 'JavaScript'],
    description: 'Get full access to the Web Development certification program.',
    eligibility: 'Beginners with a passion for web development.',
    source: 'system'
  },
  {
    title: 'UI/UX Design Intern',
    company: 'Apple',
    companyLogo: 'apple',
    location: 'Cupertino, CA',
    workMode: 'Onsite',
    type: 'Internship',
    duration: '6 months',
    stipend: '$7500/mo',
    deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
    applyUrl: 'https://www.apple.com/careers/us/',
    requiredSkills: ['Figma', 'UI/UX Design', 'Prototyping', 'User Research'],
    description: 'Design intuitive interfaces for millions of users.',
    eligibility: 'Portfolio required.',
    source: 'system'
  },
  {
    title: 'Cloud Computing Challenge',
    company: 'AWS',
    companyLogo: 'cloud',
    location: 'Global',
    workMode: 'Remote',
    type: 'Competition',
    duration: '1 Month',
    stipend: 'AWS Credits + Swag',
    deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    applyUrl: 'https://aws.amazon.com/education/awseducate/',
    requiredSkills: ['AWS', 'Cloud Architecture', 'Serverless'],
    description: 'Build a scalable cloud application using AWS services.',
    eligibility: 'Students registered in AWS Educate.',
    source: 'system'
  }
];

async function seed() {
  console.log('Clearing existing opportunities...');
  await prisma.opportunity.deleteMany();
  
  console.log('Seeding opportunities...');
  for (const opp of opportunities) {
    await prisma.opportunity.create({
      data: opp
    });
  }
  
  console.log(`Seeded ${opportunities.length} opportunities successfully!`);
}

seed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
