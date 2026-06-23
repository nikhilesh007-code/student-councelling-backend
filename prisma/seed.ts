import { prisma } from '../src/database';

const careersData = [
    {
        name: "Developer",
        description: "Builds and maintains software applications.",
        skills: ["JavaScript", "TypeScript", "React", "Node.js", "Git"]
    },
    {
        name: "Software Engineer",
        description: "Designs, develops, and tests software systems.",
        skills: ["Java", "C++", "Python", "Data Structures", "System Design"]
    },
    {
        name: "Data Scientist",
        description: "Analyzes and interprets complex data sets to help organizations make decisions.",
        skills: ["Python", "SQL", "Machine Learning", "Statistics", "Data Visualization"]
    },
    {
        name: "Frontend Developer",
        description: "Specializes in building the user interface of web applications.",
        skills: ["HTML", "CSS", "JavaScript", "React", "Vue"]
    },
    {
        name: "Backend Developer",
        description: "Focuses on server-side logic, databases, and APIs.",
        skills: ["Node.js", "Express", "Python", "PostgreSQL", "MongoDB", "REST APIs"]
    },
    {
        name: "Product Manager",
        description: "Leads the strategy and development of a product.",
        skills: ["Agile", "Product Strategy", "Communication", "Data Analysis", "Leadership"]
    },
    {
        name: "Cyber Security Analyst",
        description: "Protects IT infrastructure from cyber threats and attacks.",
        skills: ["Networking", "Linux", "Ethical Hacking", "Cryptography", "Security Frameworks"]
    },
    {
        name: "Cloud Architect",
        description: "Designs and manages cloud computing infrastructure.",
        skills: ["AWS", "Azure", "Docker", "Kubernetes", "Linux"]
    },
    {
        name: "DevOps Engineer",
        description: "Bridges development and operations to improve software deployment.",
        skills: ["CI/CD", "Docker", "Kubernetes", "Linux", "Terraform", "Git"]
    },
    {
        name: "Machine Learning Engineer",
        description: "Designs and builds machine learning models and systems.",
        skills: ["Python", "TensorFlow", "PyTorch", "Deep Learning", "Mathematics"]
    }
];

async function main() {
    console.log(`Start seeding ...`);
    for (const data of careersData) {
        // Create career if not exists
        const career = await prisma.career.upsert({
            where: { name: data.name },
            update: {},
            create: {
                name: data.name,
                description: data.description,
            },
        });
        
        console.log(`Created/Ensured career: ${career.name}`);

        for (const skillName of data.skills) {
            // Create skill if not exists
            const skill = await prisma.skill.upsert({
                where: { name: skillName },
                update: {},
                create: { name: skillName }
            });

            // Link skill to career
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
            });
        }
    }
    console.log(`Seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
