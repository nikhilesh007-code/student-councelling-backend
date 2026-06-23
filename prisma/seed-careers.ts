import { prisma } from '../src/database'

const careers = [
  {
    name: 'Software Engineer',
    description: 'Design, develop, and maintain software systems and applications.',
    salaryRange: '₹8,000,000 - ₹20,000,000',
    roadmap: [
      { step: 1, title: 'Learn Programming Basics', desc: 'Master a language like Python, Java, or C++.', color: 'bg-emerald-500' },
      { step: 2, title: 'Data Structures & Algorithms', desc: 'Understand arrays, trees, graphs, and algorithms.', color: 'bg-emerald-500' },
      { step: 3, title: 'Version Control', desc: 'Learn Git and GitHub.', color: 'bg-emerald-500' },
      { step: 4, title: 'Build Projects', desc: 'Create real-world applications.', color: 'bg-emerald-500' }
    ],
    resources: [
      { title: 'CS50: Introduction to Computer Science', type: 'Course', url: 'https://pll.harvard.edu/course/cs50-introduction-computer-science' },
      { title: 'LeetCode', type: 'Practice', url: 'https://leetcode.com' }
    ],
    projects: ['Personal Portfolio Website', 'Task Management App', 'Weather Dashboard'],
    skills: ['Programming Fundamentals', 'Data Structures', 'Algorithms', 'OOP', 'Git', 'SQL', 'System Design', 'Testing']
  },
  {
    name: 'Full Stack Developer',
    description: 'Build both frontend and backend of web applications.',
    salaryRange: '₹6,000,000 - ₹18,000,000',
    roadmap: [
      { step: 1, title: 'Frontend Basics', desc: 'HTML, CSS, JavaScript.', color: 'bg-blue-500' },
      { step: 2, title: 'Frontend Frameworks', desc: 'React, Vue, or Angular.', color: 'bg-blue-500' },
      { step: 3, title: 'Backend APIs', desc: 'Node.js, Express, Django.', color: 'bg-blue-500' },
      { step: 4, title: 'Databases', desc: 'SQL and NoSQL (MongoDB, PostgreSQL).', color: 'bg-blue-500' }
    ],
    resources: [
      { title: 'The Odin Project', type: 'Course', url: 'https://www.theodinproject.com' },
      { title: 'Full Stack Open', type: 'Course', url: 'https://fullstackopen.com' }
    ],
    projects: ['E-commerce Platform', 'Social Media Clone', 'Real-time Chat App'],
    skills: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'SQL', 'MongoDB', 'Git']
  },
  {
    name: 'Frontend Developer',
    description: 'Create user interfaces and client-side logic for web applications.',
    salaryRange: '₹5,000,000 - ₹15,000,000',
    roadmap: [
      { step: 1, title: 'HTML, CSS, JS', desc: 'The core building blocks.', color: 'bg-yellow-500' },
      { step: 2, title: 'Modern Frameworks', desc: 'React or Vue.', color: 'bg-yellow-500' },
      { step: 3, title: 'State Management', desc: 'Redux, Zustand, Context API.', color: 'bg-yellow-500' },
      { step: 4, title: 'Responsive Design', desc: 'Tailwind CSS, CSS Grid.', color: 'bg-yellow-500' }
    ],
    resources: [
      { title: 'freeCodeCamp', type: 'Course', url: 'https://www.freecodecamp.org' },
      { title: 'Frontend Mentor', type: 'Practice', url: 'https://www.frontendmentor.io' }
    ],
    projects: ['Interactive Dashboard', 'Landing Page', 'Movie Database App'],
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Tailwind CSS']
  },
  {
    name: 'Backend Developer',
    description: 'Build server-side logic, APIs, and manage databases.',
    salaryRange: '₹6,000,000 - ₹16,000,000',
    roadmap: [
      { step: 1, title: 'Server Language', desc: 'Node.js, Python, Java.', color: 'bg-purple-500' },
      { step: 2, title: 'API Design', desc: 'RESTful APIs, GraphQL.', color: 'bg-purple-500' },
      { step: 3, title: 'Databases', desc: 'PostgreSQL, MongoDB, Redis.', color: 'bg-purple-500' },
      { step: 4, title: 'Deployment', desc: 'Docker, AWS, CI/CD.', color: 'bg-purple-500' }
    ],
    resources: [
      { title: 'Node.js Crash Course', type: 'Video', url: '#' },
      { title: 'SQL Tutorial', type: 'Documentation', url: '#' }
    ],
    projects: ['REST API for Blog', 'Authentication System', 'URL Shortener'],
    skills: ['Node.js', 'Express', 'PostgreSQL', 'Docker', 'REST API']
  },
  {
    name: 'Mobile App Developer',
    description: 'Create applications for mobile devices (iOS/Android).',
    salaryRange: '₹6,000,000 - ₹15,000,000',
    roadmap: [
      { step: 1, title: 'Language', desc: 'Dart, Swift, or Kotlin.', color: 'bg-indigo-500' },
      { step: 2, title: 'Framework', desc: 'Flutter or React Native.', color: 'bg-indigo-500' },
      { step: 3, title: 'State Management', desc: 'Provider, Riverpod, Redux.', color: 'bg-indigo-500' },
      { step: 4, title: 'App Publishing', desc: 'Play Store, App Store.', color: 'bg-indigo-500' }
    ],
    resources: [
      { title: 'Flutter Documentation', type: 'Documentation', url: 'https://flutter.dev' },
      { title: 'React Native docs', type: 'Documentation', url: '#' }
    ],
    projects: ['Fitness Tracker App', 'Expense Manager', 'Music Player'],
    skills: ['Flutter', 'React Native', 'Dart', 'Mobile UI', 'Firebase']
  },
  {
    name: 'DevOps Engineer',
    description: 'Streamline software development and deployment processes.',
    salaryRange: '₹8,000,000 - ₹22,000,000',
    roadmap: [
      { step: 1, title: 'Linux Basics', desc: 'Command line, bash scripting.', color: 'bg-red-500' },
      { step: 2, title: 'CI/CD', desc: 'GitHub Actions, Jenkins.', color: 'bg-red-500' },
      { step: 3, title: 'Containerization', desc: 'Docker, Kubernetes.', color: 'bg-red-500' },
      { step: 4, title: 'Infrastructure as Code', desc: 'Terraform, Ansible.', color: 'bg-red-500' }
    ],
    resources: [
      { title: 'DevOps Roadmap', type: 'Guide', url: 'https://roadmap.sh/devops' }
    ],
    projects: ['Automated CI/CD Pipeline', 'Kubernetes Cluster Setup', 'Infrastructure Automation'],
    skills: ['Linux', 'Docker', 'Kubernetes', 'CI/CD', 'AWS']
  },
  {
    name: 'Cloud Engineer',
    description: 'Design, deploy, and manage cloud infrastructure.',
    salaryRange: '₹8,000,000 - ₹20,000,000',
    roadmap: [
      { step: 1, title: 'Networking & OS', desc: 'TCP/IP, DNS, Linux.', color: 'bg-sky-500' },
      { step: 2, title: 'Cloud Provider', desc: 'AWS, Azure, or GCP.', color: 'bg-sky-500' },
      { step: 3, title: 'Compute & Storage', desc: 'EC2, S3, RDS.', color: 'bg-sky-500' },
      { step: 4, title: 'Security', desc: 'IAM, VPCs, Encryption.', color: 'bg-sky-500' }
    ],
    resources: [
      { title: 'AWS Cloud Practitioner', type: 'Course', url: '#' }
    ],
    projects: ['Serverless Web App', 'High Availability Architecture', 'Cloud Migration'],
    skills: ['AWS', 'Linux', 'Networking', 'Cloud Security', 'Terraform']
  },
  {
    name: 'Cloud Architect',
    description: 'Oversee cloud computing strategy, adoption, and architecture.',
    salaryRange: '₹12,000,000 - ₹30,000,000',
    roadmap: [
      { step: 1, title: 'Cloud Engineering', desc: 'Master cloud infrastructure.', color: 'bg-orange-500' },
      { step: 2, title: 'System Design', desc: 'Microservices, Event-driven architecture.', color: 'bg-orange-500' },
      { step: 3, title: 'Cost Optimization', desc: 'Manage cloud spend.', color: 'bg-orange-500' },
      { step: 4, title: 'Leadership', desc: 'Lead engineering teams.', color: 'bg-orange-500' }
    ],
    resources: [
      { title: 'AWS Solutions Architect', type: 'Course', url: '#' }
    ],
    projects: ['Multi-region Cloud Deployment', 'Disaster Recovery Plan', 'Enterprise Cloud Strategy'],
    skills: ['System Design', 'AWS', 'Microservices', 'Leadership', 'Networking']
  },
  {
    name: 'Data Analyst',
    description: 'Analyze data to help organizations make better business decisions.',
    salaryRange: '₹5,000,000 - ₹12,000,000',
    roadmap: [
      { step: 1, title: 'Excel & SQL', desc: 'Data manipulation basics.', color: 'bg-teal-500' },
      { step: 2, title: 'Data Visualization', desc: 'Tableau, PowerBI.', color: 'bg-teal-500' },
      { step: 3, title: 'Programming', desc: 'Python (Pandas, Matplotlib) or R.', color: 'bg-teal-500' },
      { step: 4, title: 'Statistics', desc: 'Probability, hypothesis testing.', color: 'bg-teal-500' }
    ],
    resources: [
      { title: 'Google Data Analytics Certificate', type: 'Course', url: '#' }
    ],
    projects: ['Sales Dashboard', 'Customer Churn Analysis', 'Financial Report'],
    skills: ['SQL', 'Excel', 'Python', 'Tableau', 'Statistics']
  },
  {
    name: 'Data Scientist',
    description: 'Extract insights from data using statistics and machine learning.',
    salaryRange: '₹8,000,000 - ₹22,000,000',
    roadmap: [
      { step: 1, title: 'Math & Stats', desc: 'Linear algebra, calculus, stats.', color: 'bg-emerald-600' },
      { step: 2, title: 'Python for Data', desc: 'Pandas, NumPy, Scikit-learn.', color: 'bg-emerald-600' },
      { step: 3, title: 'Machine Learning', desc: 'Regression, Classification, Clustering.', color: 'bg-emerald-600' },
      { step: 4, title: 'Deep Learning', desc: 'Neural Networks, PyTorch.', color: 'bg-emerald-600' }
    ],
    resources: [
      { title: 'Andrew Ng Machine Learning', type: 'Course', url: '#' }
    ],
    projects: ['House Price Prediction', 'Recommendation System', 'Customer Segmentation'],
    skills: ['Python', 'Statistics', 'SQL', 'Pandas', 'NumPy', 'Machine Learning', 'Data Visualization']
  },
  {
    name: 'Business Analyst',
    description: 'Bridge the gap between IT and business using data analytics.',
    salaryRange: '₹6,000,000 - ₹14,000,000',
    roadmap: [
      { step: 1, title: 'Business Fundamentals', desc: 'Understand business models.', color: 'bg-amber-500' },
      { step: 2, title: 'Data Analysis', desc: 'SQL, Excel.', color: 'bg-amber-500' },
      { step: 3, title: 'Process Modeling', desc: 'BPMN, UML diagrams.', color: 'bg-amber-500' },
      { step: 4, title: 'Communication', desc: 'Stakeholder management.', color: 'bg-amber-500' }
    ],
    resources: [
      { title: 'Business Analysis Foundations', type: 'Course', url: '#' }
    ],
    projects: ['Process Improvement Plan', 'Market Analysis Report', 'Requirements Specification'],
    skills: ['Business Analysis', 'SQL', 'Communication', 'Agile', 'Excel']
  },
  {
    name: 'Machine Learning Engineer',
    description: 'Design and deploy machine learning models to production.',
    salaryRange: '₹10,000,000 - ₹25,000,000',
    roadmap: [
      { step: 1, title: 'Programming', desc: 'Python, C++.', color: 'bg-rose-500' },
      { step: 2, title: 'Machine Learning', desc: 'Algorithms, Scikit-learn.', color: 'bg-rose-500' },
      { step: 3, title: 'Deep Learning', desc: 'TensorFlow, PyTorch.', color: 'bg-rose-500' },
      { step: 4, title: 'MLOps', desc: 'Model deployment, MLflow.', color: 'bg-rose-500' }
    ],
    resources: [
      { title: 'Deep Learning Specialization', type: 'Course', url: '#' }
    ],
    projects: ['Image Classification API', 'Fraud Detection System', 'Chatbot Deployment'],
    skills: ['Python', 'Machine Learning', 'PyTorch', 'MLOps', 'Docker']
  },
  {
    name: 'AI Engineer',
    description: 'Build applications powered by artificial intelligence and LLMs.',
    salaryRange: '₹12,000,000 - ₹30,000,000',
    roadmap: [
      { step: 1, title: 'Programming & Data', desc: 'Python, Vectors.', color: 'bg-fuchsia-500' },
      { step: 2, title: 'Deep Learning', desc: 'Transformers, Attention mechanism.', color: 'bg-fuchsia-500' },
      { step: 3, title: 'LLMs & Prompt Engineering', desc: 'OpenAI, LangChain, LlamaIndex.', color: 'bg-fuchsia-500' },
      { step: 4, title: 'Vector Databases', desc: 'Pinecone, Weaviate.', color: 'bg-fuchsia-500' }
    ],
    resources: [
      { title: 'Hugging Face Course', type: 'Course', url: '#' }
    ],
    projects: ['RAG QA System', 'AI Autonomous Agent', 'Document Summarizer'],
    skills: ['Python', 'Statistics', 'Machine Learning', 'Deep Learning', 'TensorFlow/PyTorch', 'SQL', 'Data Structures', 'Algorithms', 'Git', 'APIs', 'MLOps']
  },
  {
    name: 'AI Researcher',
    description: 'Conduct academic and applied research to advance AI technologies.',
    salaryRange: '₹15,000,000 - ₹35,000,000',
    roadmap: [
      { step: 1, title: 'Advanced Math', desc: 'Calculus, Probability.', color: 'bg-violet-500' },
      { step: 2, title: 'Literature Review', desc: 'Read research papers (ArXiv).', color: 'bg-violet-500' },
      { step: 3, title: 'Implement Models', desc: 'PyTorch, JAX.', color: 'bg-violet-500' },
      { step: 4, title: 'Publishing', desc: 'Write papers, conferences.', color: 'bg-violet-500' }
    ],
    resources: [
      { title: 'ArXiv Machine Learning', type: 'Papers', url: '#' }
    ],
    projects: ['Novel Neural Architecture', 'Model Optimization Algorithm', 'Research Paper'],
    skills: ['Mathematics', 'Research', 'PyTorch', 'Deep Learning', 'Writing']
  },
  {
    name: 'Cyber Security Analyst',
    description: 'Protect IT infrastructure and data from security breaches.',
    salaryRange: '₹6,000,000 - ₹15,000,000',
    roadmap: [
      { step: 1, title: 'Networking Basics', desc: 'TCP/IP, OSI Model.', color: 'bg-slate-700' },
      { step: 2, title: 'Security Fundamentals', desc: 'CompTIA Security+ concepts.', color: 'bg-slate-700' },
      { step: 3, title: 'Threat Intelligence', desc: 'Malware analysis, SIEM.', color: 'bg-slate-700' },
      { step: 4, title: 'Incident Response', desc: 'Handling security events.', color: 'bg-slate-700' }
    ],
    resources: [
      { title: 'TryHackMe', type: 'Platform', url: '#' }
    ],
    projects: ['Network Traffic Analysis', 'Phishing Simulation', 'Vulnerability Assessment'],
    skills: ['Networking', 'Linux', 'Security Fundamentals', 'Web Security', 'SIEM', 'Incident Response']
  },
  {
    name: 'Security Engineer',
    description: 'Design and build secure systems and networks.',
    salaryRange: '₹8,000,000 - ₹20,000,000',
    roadmap: [
      { step: 1, title: 'Programming & Scripts', desc: 'Python, Bash.', color: 'bg-slate-800' },
      { step: 2, title: 'Cryptography', desc: 'Encryption, PKI.', color: 'bg-slate-800' },
      { step: 3, title: 'Secure Coding', desc: 'OWASP Top 10.', color: 'bg-slate-800' },
      { step: 4, title: 'Penetration Testing', desc: 'Ethical hacking.', color: 'bg-slate-800' }
    ],
    resources: [
      { title: 'HackTheBox', type: 'Platform', url: '#' }
    ],
    projects: ['Secure Authentication System', 'Custom Firewall', 'Automated Pentesting Tool'],
    skills: ['Python', 'Cryptography', 'Penetration Testing', 'Security Architecture', 'Linux']
  },
  {
    name: 'Network Engineer',
    description: 'Design, implement, and manage computer networks.',
    salaryRange: '₹5,000,000 - ₹14,000,000',
    roadmap: [
      { step: 1, title: 'Network Basics', desc: 'LAN, WAN, Routers, Switches.', color: 'bg-cyan-600' },
      { step: 2, title: 'Protocols', desc: 'BGP, OSPF, TCP/IP.', color: 'bg-cyan-600' },
      { step: 3, title: 'Certifications', desc: 'CCNA, CCNP.', color: 'bg-cyan-600' },
      { step: 4, title: 'Network Automation', desc: 'Python, Ansible.', color: 'bg-cyan-600' }
    ],
    resources: [
      { title: 'Cisco Networking Academy', type: 'Course', url: '#' }
    ],
    projects: ['Network Topology Design', 'Router Configuration Lab', 'Automated Network Config'],
    skills: ['Networking', 'Cisco', 'Routing', 'Switching', 'Python']
  },
  {
    name: 'Database Administrator',
    description: 'Ensure databases run efficiently and are secure from unauthorized access.',
    salaryRange: '₹6,000,000 - ₹16,000,000',
    roadmap: [
      { step: 1, title: 'SQL Mastery', desc: 'Advanced queries, indexing.', color: 'bg-indigo-600' },
      { step: 2, title: 'Database Architecture', desc: 'Relational & NoSQL design.', color: 'bg-indigo-600' },
      { step: 3, title: 'Performance Tuning', desc: 'Query optimization.', color: 'bg-indigo-600' },
      { step: 4, title: 'Backup & Recovery', desc: 'Disaster recovery planning.', color: 'bg-indigo-600' }
    ],
    resources: [
      { title: 'PostgreSQL Tutorial', type: 'Documentation', url: '#' }
    ],
    projects: ['Database Migration', 'High Availability DB Cluster', 'Performance Audit'],
    skills: ['SQL', 'PostgreSQL', 'Database Design', 'Performance Tuning', 'Linux']
  },
  {
    name: 'Product Manager',
    description: 'Guide the success of a product and lead the cross-functional team.',
    salaryRange: '₹8,000,000 - ₹25,000,000',
    roadmap: [
      { step: 1, title: 'Market Research', desc: 'User interviews, competitive analysis.', color: 'bg-pink-500' },
      { step: 2, title: 'Product Strategy', desc: 'Vision, roadmap, OKRs.', color: 'bg-pink-500' },
      { step: 3, title: 'Agile & Scrum', desc: 'Sprint planning, backlog grooming.', color: 'bg-pink-500' },
      { step: 4, title: 'Metrics', desc: 'A/B testing, KPIs, analytics.', color: 'bg-pink-500' }
    ],
    resources: [
      { title: 'Inspired by Marty Cagan', type: 'Book', url: '#' }
    ],
    projects: ['Product Requirements Document', 'Competitor Analysis', 'Product Roadmap'],
    skills: ['Product Management', 'Agile', 'Leadership', 'Data Analysis', 'Communication']
  },
  {
    name: 'Technical Product Manager',
    description: 'Manage products with deep technical complexity and engineering teams.',
    salaryRange: '₹10,000,000 - ₹28,000,000',
    roadmap: [
      { step: 1, title: 'Tech Foundations', desc: 'System architecture, APIs.', color: 'bg-rose-600' },
      { step: 2, title: 'Product Management', desc: 'Strategy, user needs.', color: 'bg-rose-600' },
      { step: 3, title: 'Data & Analytics', desc: 'SQL, product metrics.', color: 'bg-rose-600' },
      { step: 4, title: 'Stakeholder Alignment', desc: 'Bridge engineering and business.', color: 'bg-rose-600' }
    ],
    resources: [
      { title: 'System Design Interview', type: 'Book', url: '#' }
    ],
    projects: ['API Specification Document', 'Technical Roadmap', 'Architecture Review'],
    skills: ['System Design', 'Product Management', 'APIs', 'Communication', 'Agile']
  },
  {
    name: 'UI Designer',
    description: 'Design the visual interfaces of digital products.',
    salaryRange: '₹4,000,000 - ₹12,000,000',
    roadmap: [
      { step: 1, title: 'Design Principles', desc: 'Color theory, typography.', color: 'bg-fuchsia-400' },
      { step: 2, title: 'Design Tools', desc: 'Figma, Sketch.', color: 'bg-fuchsia-400' },
      { step: 3, title: 'Design Systems', desc: 'Components, style guides.', color: 'bg-fuchsia-400' },
      { step: 4, title: 'Prototyping', desc: 'Interactive mockups.', color: 'bg-fuchsia-400' }
    ],
    resources: [
      { title: 'Figma Crash Course', type: 'Video', url: '#' }
    ],
    projects: ['App UI Redesign', 'Design System Creation', 'High-fidelity Prototype'],
    skills: ['Figma', 'UI Design', 'Typography', 'Color Theory', 'Prototyping']
  },
  {
    name: 'UX Designer',
    description: 'Improve user experience through research, wireframing, and testing.',
    salaryRange: '₹5,000,000 - ₹14,000,000',
    roadmap: [
      { step: 1, title: 'User Research', desc: 'Interviews, personas.', color: 'bg-purple-400' },
      { step: 2, title: 'Information Architecture', desc: 'User flows, sitemaps.', color: 'bg-purple-400' },
      { step: 3, title: 'Wireframing', desc: 'Low-fidelity sketches.', color: 'bg-purple-400' },
      { step: 4, title: 'Usability Testing', desc: 'Validate designs with users.', color: 'bg-purple-400' }
    ],
    resources: [
      { title: 'Google UX Design Certificate', type: 'Course', url: '#' }
    ],
    projects: ['User Research Case Study', 'Wireframe Flow', 'Usability Test Report'],
    skills: ['UX Research', 'Wireframing', 'Figma', 'Usability Testing', 'Empathy']
  },
  {
    name: 'QA Engineer',
    description: 'Ensure software quality through testing and quality assurance processes.',
    salaryRange: '₹4,000,000 - ₹12,000,000',
    roadmap: [
      { step: 1, title: 'Testing Basics', desc: 'Manual testing, test cases.', color: 'bg-lime-500' },
      { step: 2, title: 'Defect Tracking', desc: 'Jira, Bugzilla.', color: 'bg-lime-500' },
      { step: 3, title: 'API Testing', desc: 'Postman, REST assured.', color: 'bg-lime-500' },
      { step: 4, title: 'Agile Testing', desc: 'Integrate testing in sprints.', color: 'bg-lime-500' }
    ],
    resources: [
      { title: 'Software Testing Fundamentals', type: 'Guide', url: '#' }
    ],
    projects: ['Test Plan Creation', 'API Test Suite', 'Bug Report Portfolio'],
    skills: ['Manual Testing', 'Jira', 'API Testing', 'Postman', 'Agile']
  },
  {
    name: 'Test Automation Engineer',
    description: 'Write scripts to automate software testing processes.',
    salaryRange: '₹6,000,000 - ₹16,000,000',
    roadmap: [
      { step: 1, title: 'Programming', desc: 'Java, Python, JS.', color: 'bg-green-600' },
      { step: 2, title: 'UI Automation', desc: 'Selenium, Cypress, Playwright.', color: 'bg-green-600' },
      { step: 3, title: 'API Automation', desc: 'REST Assured, SuperTest.', color: 'bg-green-600' },
      { step: 4, title: 'CI/CD Integration', desc: 'Automate test execution.', color: 'bg-green-600' }
    ],
    resources: [
      { title: 'Cypress Documentation', type: 'Documentation', url: '#' }
    ],
    projects: ['E2E Testing Framework', 'Automated API Tests', 'CI/CD Pipeline Setup'],
    skills: ['Selenium', 'Cypress', 'Python', 'Java', 'CI/CD']
  },
  {
    name: 'Game Developer',
    description: 'Create interactive games for various platforms.',
    salaryRange: '₹5,000,000 - ₹15,000,000',
    roadmap: [
      { step: 1, title: 'Programming', desc: 'C# or C++.', color: 'bg-orange-600' },
      { step: 2, title: 'Game Engines', desc: 'Unity or Unreal Engine.', color: 'bg-orange-600' },
      { step: 3, title: 'Game Physics & Math', desc: 'Vectors, collisions.', color: 'bg-orange-600' },
      { step: 4, title: '3D Graphics', desc: 'Shaders, rendering basics.', color: 'bg-orange-600' }
    ],
    resources: [
      { title: 'Unity Learn', type: 'Platform', url: '#' }
    ],
    projects: ['2D Platformer Game', '3D FPS Prototype', 'Multiplayer Game Sync'],
    skills: ['C#', 'Unity', 'C++', 'Unreal Engine', 'Mathematics']
  },
  {
    name: 'Embedded Engineer',
    description: 'Design hardware and write software for embedded systems.',
    salaryRange: '₹6,000,000 - ₹16,000,000',
    roadmap: [
      { step: 1, title: 'C/C++ Programming', desc: 'Memory management, pointers.', color: 'bg-gray-600' },
      { step: 2, title: 'Microcontrollers', desc: 'Arduino, STM32, ESP32.', color: 'bg-gray-600' },
      { step: 3, title: 'Electronics Basics', desc: 'Circuit design, sensors.', color: 'bg-gray-600' },
      { step: 4, title: 'RTOS', desc: 'Real-time operating systems.', color: 'bg-gray-600' }
    ],
    resources: [
      { title: 'Embedded Systems Programming', type: 'Course', url: '#' }
    ],
    projects: ['IoT Weather Station', 'Custom Keyboard Controller', 'Line Follower Robot'],
    skills: ['C', 'C++', 'Microcontrollers', 'Electronics', 'RTOS']
  },
  {
    name: 'Blockchain Developer',
    description: 'Build decentralized applications and smart contracts.',
    salaryRange: '₹8,000,000 - ₹24,000,000',
    roadmap: [
      { step: 1, title: 'Cryptography & Web3', desc: 'Hashing, consensus.', color: 'bg-yellow-600' },
      { step: 2, title: 'Smart Contracts', desc: 'Solidity, Ethereum.', color: 'bg-yellow-600' },
      { step: 3, title: 'Frontend Integration', desc: 'Web3.js, Ethers.js.', color: 'bg-yellow-600' },
      { step: 4, title: 'Advanced Frameworks', desc: 'Hardhat, Truffle.', color: 'bg-yellow-600' }
    ],
    resources: [
      { title: 'CryptoZombies', type: 'Interactive Course', url: '#' }
    ],
    projects: ['ERC20 Token', 'NFT Marketplace', 'DeFi Staking App'],
    skills: ['Solidity', 'Blockchain', 'Ethereum', 'Web3.js', 'Cryptography']
  },
  {
    name: 'Site Reliability Engineer',
    description: 'Ensure software systems are highly reliable and scalable.',
    salaryRange: '₹10,000,000 - ₹25,000,000',
    roadmap: [
      { step: 1, title: 'Software Engineering', desc: 'Programming, architecture.', color: 'bg-blue-600' },
      { step: 2, title: 'System Administration', desc: 'Linux internals.', color: 'bg-blue-600' },
      { step: 3, title: 'Observability', desc: 'Prometheus, Grafana.', color: 'bg-blue-600' },
      { step: 4, title: 'Incident Management', desc: 'On-call, post-mortems.', color: 'bg-blue-600' }
    ],
    resources: [
      { title: 'Google SRE Book', type: 'Book', url: '#' }
    ],
    projects: ['Monitoring Dashboard', 'Chaos Engineering Experiment', 'Automated Incident Response'],
    skills: ['Linux', 'Python', 'Monitoring', 'Kubernetes', 'Troubleshooting']
  },
  {
    name: 'Solutions Architect',
    description: 'Design technical solutions to solve business problems.',
    salaryRange: '₹12,000,000 - ₹28,000,000',
    roadmap: [
      { step: 1, title: 'Broad Tech Knowledge', desc: 'Cloud, databases, networking.', color: 'bg-emerald-700' },
      { step: 2, title: 'System Design', desc: 'Scalability, reliability.', color: 'bg-emerald-700' },
      { step: 3, title: 'Business Acumen', desc: 'Understand business value.', color: 'bg-emerald-700' },
      { step: 4, title: 'Communication', desc: 'Presenting to stakeholders.', color: 'bg-emerald-700' }
    ],
    resources: [
      { title: 'Designing Data-Intensive Applications', type: 'Book', url: '#' }
    ],
    projects: ['Architecture Migration Plan', 'System Design Specification', 'Cost Optimization Strategy'],
    skills: ['System Design', 'Cloud Architecture', 'Communication', 'Business Analysis', 'Leadership']
  },
  {
    name: 'Technical Consultant',
    description: 'Advise clients on how to use technology to achieve their business goals.',
    salaryRange: '₹8,000,000 - ₹20,000,000',
    roadmap: [
      { step: 1, title: 'Domain Expertise', desc: 'ERP, CRM, or Custom Software.', color: 'bg-indigo-700' },
      { step: 2, title: 'Problem Solving', desc: 'Analytical thinking.', color: 'bg-indigo-700' },
      { step: 3, title: 'Client Communication', desc: 'Workshops, presentations.', color: 'bg-indigo-700' },
      { step: 4, title: 'Project Management', desc: 'Agile, delivery.', color: 'bg-indigo-700' }
    ],
    resources: [
      { title: 'Consulting Frameworks', type: 'Guide', url: '#' }
    ],
    projects: ['Client Tech Assessment', 'Implementation Strategy', 'Proof of Concept'],
    skills: ['Consulting', 'Communication', 'Problem Solving', 'Project Management', 'Tech Strategy']
  }
]

async function main() {
  console.log('Seeding careers...')

  // Insert distinct skills
  const allSkills = new Set<string>()
  careers.forEach(c => c.skills.forEach(s => allSkills.add(s)))

  for (const skillName of allSkills) {
    await prisma.skill.upsert({
      where: { name: skillName },
      update: {},
      create: { name: skillName }
    })
  }

  // Insert careers and relationships
  let seededCount = 0;
  for (const c of careers) {
    const career = await prisma.career.upsert({
      where: { name: c.name },
      update: {
        description: c.description,
        salaryRange: c.salaryRange,
        roadmap: c.roadmap,
        resources: c.resources,
        projects: c.projects
      },
      create: {
        name: c.name,
        description: c.description,
        salaryRange: c.salaryRange,
        roadmap: c.roadmap,
        resources: c.resources,
        projects: c.projects
      }
    })

    // Update skills
    for (const s of c.skills) {
      const skill = await prisma.skill.findUnique({ where: { name: s } })
      if (skill) {
        await prisma.careerSkill.upsert({
          where: {
            careerId_skillId: {
              careerId: career.id,
              skillId: skill.id
            }
          },
          update: {},
          create: {
            careerId: career.id,
            skillId: skill.id
          }
        })
      }
    }
    seededCount++;
  }

  console.log(`Successfully seeded ${seededCount} careers.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
