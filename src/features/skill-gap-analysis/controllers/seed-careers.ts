import { prisma } from "../../../database";

async function seed() {
	const skills = [
		"Python",
		"Java",
		"C",
		"C++",
		"JavaScript",
		"TypeScript",
		"React",
		"Next.js",
		"Node.js",
		"Express.js",
		"MongoDB",
		"PostgreSQL",
		"MySQL",
		"SQLite",
		"HTML",
		"CSS",
		"Tailwind CSS",
		"Git",
		"GitHub",
		"Docker",
		"Kubernetes",
		"AWS",
		"Azure",
		"GCP",
		"Linux",
		"Bash",
		"Data Structures",
		"Algorithms",
		"OOP",
		"DBMS",
		"Operating Systems",
		"Computer Networks",
		"Machine Learning",
		"Deep Learning",
		"TensorFlow",
		"PyTorch",
		"NLP",
		"Computer Vision",
		"Data Analysis",
		"Pandas",
		"NumPy",
		"Scikit-Learn",
		"Power BI",
		"Tableau",
		"Excel",
		"Cyber Security",
		"Network Security",
		"Ethical Hacking",
		"Penetration Testing",
		"Cryptography",
		"OWASP",
		"Wireshark",
		"REST API",
		"GraphQL",
		"Microservices",
		"System Design",
		"Android",
		"Kotlin",
		"Flutter",
		"React Native",
		"Unity",
		"Unreal Engine",
		"Blockchain",
		"Solidity",
		"Smart Contracts",
		"IoT",
		"Embedded C",
		"Arduino",
		"Raspberry Pi",
		"Testing",
		"JUnit",
		"Selenium",
		"CI/CD",
		"Terraform",
	];

	for (const skill of skills) {
		await prisma.skill.upsert({
			where: { name: skill },
			update: {},
			create: { name: skill },
		});
	}

	const careers = [
		{
			name: "AI Engineer",
			skills: [
				"Python",
				"Machine Learning",
				"Deep Learning",
				"TensorFlow",
				"PyTorch",
				"Statistics",
			],
		},

		{
			name: "Machine Learning Engineer",
			skills: [
				"Python",
				"Machine Learning",
				"Deep Learning",
				"TensorFlow",
				"PyTorch",
				"Scikit-Learn",
			],
		},

		{
			name: "Data Scientist",
			skills: ["Python", "Pandas", "NumPy", "Machine Learning", "SQL", "Data Analysis", "Power BI"],
		},

		{
			name: "Data Analyst",
			skills: ["SQL", "Excel", "Power BI", "Tableau", "Data Analysis"],
		},

		{
			name: "Full Stack Developer",
			skills: [
				"HTML",
				"CSS",
				"JavaScript",
				"TypeScript",
				"React",
				"Node.js",
				"Express.js",
				"MongoDB",
				"Git",
			],
		},

		{
			name: "Frontend Developer",
			skills: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Tailwind CSS"],
		},

		{
			name: "Backend Developer",
			skills: ["Node.js", "Express.js", "PostgreSQL", "REST API", "System Design"],
		},

		{
			name: "DevOps Engineer",
			skills: ["Linux", "Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Git"],
		},

		{
			name: "Cloud Engineer",
			skills: ["AWS", "Azure", "GCP", "Linux", "Docker", "Kubernetes"],
		},

		{
			name: "Cyber Security Engineer",
			skills: [
				"Linux",
				"Network Security",
				"Ethical Hacking",
				"Cryptography",
				"OWASP",
				"Wireshark",
			],
		},

		{
			name: "Ethical Hacker",
			skills: ["Ethical Hacking", "Penetration Testing", "Linux", "OWASP", "Wireshark"],
		},

		{
			name: "Software Engineer",
			skills: ["Java", "Python", "Data Structures", "Algorithms", "OOP", "DBMS"],
		},

		{
			name: "Android Developer",
			skills: ["Java", "Kotlin", "Android", "REST API"],
		},

		{
			name: "Flutter Developer",
			skills: ["Flutter", "Dart", "REST API"],
		},

		{
			name: "Game Developer",
			skills: ["C++", "Unity", "Unreal Engine", "OOP"],
		},

		{
			name: "Blockchain Developer",
			skills: ["Blockchain", "Solidity", "Smart Contracts", "JavaScript"],
		},

		{
			name: "IoT Engineer",
			skills: ["IoT", "Arduino", "Raspberry Pi", "Embedded C"],
		},

		{
			name: "Embedded Systems Engineer",
			skills: ["C", "Embedded C", "Arduino", "Raspberry Pi"],
		},

		{
			name: "QA Engineer",
			skills: ["Testing", "JUnit", "Selenium", "REST API"],
		},

		{
			name: "Database Administrator",
			skills: ["MySQL", "PostgreSQL", "SQL", "DBMS"],
		},
	];

	for (const careerData of careers) {
		const career = await prisma.career.upsert({
			where: { name: careerData.name },
			update: {},
			create: {
				name: careerData.name,
			},
		});

		for (const skillName of careerData.skills) {
			const skill = await prisma.skill.findUnique({
				where: { name: skillName },
			});

			if (!skill) continue;

			await prisma.careerSkill.upsert({
				where: {
					careerId_skillId: {
						careerId: career.id,
						skillId: skill.id,
					},
				},
				update: {},
				create: {
					careerId: career.id,
					skillId: skill.id,
				},
			});
		}
	}

}

seed()
	.catch(console.error)
	.finally(async () => {
		await prisma.$disconnect();
	});
