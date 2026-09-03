import { db, isLiveFirebaseConfigured } from "../firebase/config";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc
} from "firebase/firestore";

import { FIRST_YEAR_STUDENTS } from "../data/students1stYear";

// Initial Seed Data for Instant Local Development & Testing
// BPUT (Biju Patnaik University of Technology) Branches
const DEFAULT_DEPARTMENTS = [
  "CSE", "Data Science", "ECE", "EEE", "Electrical", "Mechanical", "Civil", "IT",
  "Agriculture", "Biotechnology", "Chemical", "Mining", "Automobile", "EIE"
];
const DEFAULT_YEARS = ["1st", "2nd", "3rd", "4th"];
const DEFAULT_SECTIONS = [
  "A", "B", "C", "D",
  "A+B Combine", "A+C Combine", "A+D Combine",
  "B+C Combine", "B+D Combine", "C+D Combine",
  "A+B+C Combine", "All Sections Combine"
];
const DEFAULT_SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

// ──────────────────────────────────────────────────────────────
// BPUT B.Tech Semester-wise Subject Catalog (Curriculum 2024)
// ──────────────────────────────────────────────────────────────
const BPUT_CURRICULUM = {
  // ─── COMMON 1st YEAR (All Branches & Sections A, B, C, D) ───
  common: {
    "1": [
      // Theory Subjects
      { name: "Mathematics-I (Math-1)", code: "MA101" },
      { name: "Physics (PHY)", code: "PH101" },
      { name: "Chemistry (CHEM)", code: "CH101" },
      { name: "Basic Electrical Engineering (BEE)", code: "EE101" },
      { name: "Basic Electronics (BE)", code: "EC101" },
      { name: "Basic Mechanical Engineering (BME)", code: "ME101" },
      { name: "Basic Civil Engineering (BCE)", code: "CE101" },
      { name: "Programming in C & Data Structures (PC&DS)", code: "CS101" },
      { name: "Universal Human Values (UHV)", code: "HS103" },
      { name: "Engineering Mechanics (EM)", code: "ME102" },
      { name: "English for Technical Writing (EFTW)", code: "HS101" },

      // Labs, Practicals & Workshops
      { name: "Programming Lab (PC&DS Lab Group-I / II)", code: "CS191" },
      { name: "Physics Lab (PHY Lab Group-I / II)", code: "PH191" },
      { name: "Chemistry Lab (CHEM Lab Group-I / II)", code: "CH191" },
      { name: "Basic Electrical Lab (BEE Lab Group-I / II)", code: "EE191" },
      { name: "Basic Electronics Lab (BE Lab Group-I / II)", code: "EC191" },
      { name: "Civil Engineering Lab (CE Lab Group-I / II)", code: "CE191" },
      { name: "Workshop Practice (Workshop Group-I / II)", code: "ME191" },
      { name: "Engineering Graphics & Design (EG&D Lab Group-I / II)", code: "ME192" },

      // Co-Curricular & Student Activities
      { name: "Yoga / NSS", code: "ACT101" },
      { name: "Club Activity", code: "ACT102" },
      { name: "Library (LIB)", code: "LIB101" },
    ],
    "2": [
      { name: "Mathematics-II", code: "MA102" },
      { name: "Chemistry", code: "CH102" },
      { name: "Basic Electronics Engineering", code: "EC102" },
      { name: "Engineering Mechanics", code: "ME102" },
      { name: "Environmental Science", code: "HS102" },
      { name: "Workshop Practice", code: "ME103" },
      { name: "English Communication Lab", code: "HS191" },
    ],
  },

  // ─── CSE (Computer Science & Engineering) ───
  CSE: {
    "3": [
      { name: "Data Structures", code: "CS201" },
      { name: "Digital Electronics", code: "CS202" },
      { name: "Discrete Mathematics", code: "CS203" },
      { name: "Object Oriented Programming", code: "CS204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Design & Analysis of Algorithms", code: "CS205" },
      { name: "Computer Organization & Architecture", code: "CS206" },
      { name: "Database Management System", code: "CS207" },
      { name: "Formal Language & Automata Theory", code: "CS208" },
      { name: "Probability & Statistics", code: "MA202" },
    ],
    "5": [
      { name: "Operating Systems", code: "CS301" },
      { name: "Computer Networks", code: "CS302" },
      { name: "Software Engineering", code: "CS303" },
      { name: "Microprocessor & Interfacing", code: "CS304" },
      { name: "Object Oriented Analysis & Design", code: "CS305" },
    ],
    "6": [
      { name: "Compiler Design", code: "CS306" },
      { name: "Artificial Intelligence", code: "CS307" },
      { name: "Computer Graphics", code: "CS308" },
      { name: "Information Security", code: "CS309" },
      { name: "Web Technology", code: "CS310" },
    ],
    "7": [
      { name: "Machine Learning", code: "CS401" },
      { name: "Cloud Computing", code: "CS402" },
      { name: "Data Mining & Warehousing", code: "CS403" },
      { name: "Internet of Things", code: "CS404" },
      { name: "Project-I", code: "CS491" },
    ],
    "8": [
      { name: "Deep Learning", code: "CS405" },
      { name: "Blockchain Technology", code: "CS406" },
      { name: "Project-II", code: "CS492" },
      { name: "Seminar & Technical Writing", code: "CS493" },
    ],
  },

  // ─── Data Science (CSE - Data Science) ───
  "Data Science": {
    "3": [
      { name: "Data Structures & Algorithms", code: "DS201" },
      { name: "Python for Data Science", code: "DS202" },
      { name: "Discrete Mathematics", code: "DS203" },
      { name: "Object Oriented Programming (Java/C++)", code: "DS204" },
      { name: "Linear Algebra & Statistics", code: "MA201" },
    ],
    "4": [
      { name: "Database Management & SQL", code: "DS205" },
      { name: "Foundations of Data Science", code: "DS206" },
      { name: "Computer Organization & Architecture", code: "DS207" },
      { name: "Operating Systems", code: "DS208" },
      { name: "Probability & Statistical Inference", code: "MA202" },
    ],
    "5": [
      { name: "Machine Learning Techniques", code: "DS301" },
      { name: "Big Data Technologies (Hadoop/Spark)", code: "DS302" },
      { name: "Data Mining & Warehousing", code: "DS303" },
      { name: "Computer Networks", code: "DS304" },
      { name: "Data Visualization & Analytics", code: "DS305" },
    ],
    "6": [
      { name: "Deep Learning & Neural Networks", code: "DS306" },
      { name: "Natural Language Processing", code: "DS307" },
      { name: "Cloud Computing for Data Science", code: "DS308" },
      { name: "Artificial Intelligence", code: "DS309" },
      { name: "Business Intelligence & Predictive Modeling", code: "DS310" },
    ],
    "7": [
      { name: "Time Series Analysis & Forecasting", code: "DS401" },
      { name: "Computer Vision", code: "DS402" },
      { name: "Data Ethics, Governance & Privacy", code: "DS403" },
      { name: "Project-I", code: "DS491" },
    ],
    "8": [
      { name: "Generative AI & LLMs", code: "DS404" },
      { name: "Reinforcement Learning", code: "DS405" },
      { name: "Project-II", code: "DS492" },
      { name: "Seminar & Technical Writing", code: "DS493" },
    ],
  },

  // ─── ECE (Electronics & Communication Engineering) ───
  ECE: {
    "3": [
      { name: "Signals & Systems", code: "EC201" },
      { name: "Analog Electronic Circuits", code: "EC202" },
      { name: "Network Theory", code: "EC203" },
      { name: "Digital System Design", code: "EC204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Electromagnetic Theory", code: "EC205" },
      { name: "Control Systems", code: "EC206" },
      { name: "Linear Integrated Circuits", code: "EC207" },
      { name: "Transmission Lines & Waveguides", code: "EC208" },
      { name: "Probability & Random Processes", code: "MA203" },
    ],
    "5": [
      { name: "Communication Systems", code: "EC301" },
      { name: "Digital Signal Processing", code: "EC302" },
      { name: "Microprocessors & Microcontrollers", code: "EC303" },
      { name: "VLSI Design", code: "EC304" },
      { name: "Antenna & Wave Propagation", code: "EC305" },
    ],
    "6": [
      { name: "Digital Communication", code: "EC306" },
      { name: "Embedded Systems", code: "EC307" },
      { name: "Optical Communication", code: "EC308" },
      { name: "Wireless Communication", code: "EC309" },
      { name: "Radar Engineering", code: "EC310" },
    ],
    "7": [
      { name: "Satellite Communication", code: "EC401" },
      { name: "Mobile Communication", code: "EC402" },
      { name: "Image Processing", code: "EC403" },
      { name: "Project-I", code: "EC491" },
    ],
    "8": [
      { name: "Biomedical Instrumentation", code: "EC404" },
      { name: "Project-II", code: "EC492" },
      { name: "Seminar & Technical Writing", code: "EC493" },
    ],
  },

  // ─── EEE (Electrical & Electronics Engineering) ───
  EEE: {
    "3": [
      { name: "Electrical Circuit Analysis", code: "EE201" },
      { name: "Analog Electronics", code: "EE202" },
      { name: "Electrical Machines-I", code: "EE203" },
      { name: "Digital Electronics", code: "EE204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Electrical Machines-II", code: "EE205" },
      { name: "Power Systems-I", code: "EE206" },
      { name: "Control Systems", code: "EE207" },
      { name: "Measurements & Instrumentation", code: "EE208" },
      { name: "Signals & Systems", code: "EE209" },
    ],
    "5": [
      { name: "Power Systems-II", code: "EE301" },
      { name: "Power Electronics", code: "EE302" },
      { name: "Microprocessor & Microcontroller", code: "EE303" },
      { name: "Switchgear & Protection", code: "EE304" },
      { name: "Electromagnetic Field Theory", code: "EE305" },
    ],
    "6": [
      { name: "Electrical Drives", code: "EE306" },
      { name: "Power System Analysis", code: "EE307" },
      { name: "Digital Signal Processing", code: "EE308" },
      { name: "High Voltage Engineering", code: "EE309" },
      { name: "Renewable Energy Systems", code: "EE310" },
    ],
    "7": [
      { name: "Smart Grid Technology", code: "EE401" },
      { name: "Electric Vehicle Technology", code: "EE402" },
      { name: "Project-I", code: "EE491" },
    ],
    "8": [
      { name: "Power Quality", code: "EE403" },
      { name: "Project-II", code: "EE492" },
      { name: "Seminar & Technical Writing", code: "EE493" },
    ],
  },

  // ─── Electrical Engineering ───
  Electrical: {
    "3": [
      { name: "Electrical Circuit Analysis", code: "EL201" },
      { name: "Analog Electronics", code: "EL202" },
      { name: "Electrical Machines-I", code: "EL203" },
      { name: "Electrical Measurement", code: "EL204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Electrical Machines-II", code: "EL205" },
      { name: "Power Systems-I", code: "EL206" },
      { name: "Control Systems", code: "EL207" },
      { name: "Signals & Systems", code: "EL208" },
      { name: "Numerical Methods", code: "MA204" },
    ],
    "5": [
      { name: "Power Systems-II", code: "EL301" },
      { name: "Power Electronics", code: "EL302" },
      { name: "Switchgear & Protection", code: "EL303" },
      { name: "Microprocessor Applications", code: "EL304" },
    ],
    "6": [
      { name: "Electrical Drives", code: "EL305" },
      { name: "Power System Analysis", code: "EL306" },
      { name: "High Voltage Engineering", code: "EL307" },
      { name: "Utilization of Electrical Energy", code: "EL308" },
    ],
    "7": [
      { name: "Renewable Energy", code: "EL401" },
      { name: "Industrial Automation", code: "EL402" },
      { name: "Project-I", code: "EL491" },
    ],
    "8": [
      { name: "Project-II", code: "EL492" },
      { name: "Seminar & Technical Writing", code: "EL493" },
    ],
  },

  // ─── Mechanical Engineering ───
  Mechanical: {
    "3": [
      { name: "Thermodynamics", code: "ME201" },
      { name: "Strength of Materials", code: "ME202" },
      { name: "Manufacturing Processes-I", code: "ME203" },
      { name: "Material Science & Metallurgy", code: "ME204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Fluid Mechanics", code: "ME205" },
      { name: "Kinematics of Machines", code: "ME206" },
      { name: "Manufacturing Processes-II", code: "ME207" },
      { name: "Applied Thermodynamics", code: "ME208" },
      { name: "Numerical Methods", code: "MA204" },
    ],
    "5": [
      { name: "Heat Transfer", code: "ME301" },
      { name: "Dynamics of Machinery", code: "ME302" },
      { name: "Machine Design-I", code: "ME303" },
      { name: "Industrial Engineering", code: "ME304" },
      { name: "Turbo Machinery", code: "ME305" },
    ],
    "6": [
      { name: "Machine Design-II", code: "ME306" },
      { name: "IC Engines & Gas Turbines", code: "ME307" },
      { name: "CAD/CAM", code: "ME308" },
      { name: "Refrigeration & Air Conditioning", code: "ME309" },
      { name: "Finite Element Analysis", code: "ME310" },
    ],
    "7": [
      { name: "Automobile Engineering", code: "ME401" },
      { name: "Robotics", code: "ME402" },
      { name: "Power Plant Engineering", code: "ME403" },
      { name: "Project-I", code: "ME491" },
    ],
    "8": [
      { name: "Mechatronics", code: "ME404" },
      { name: "Project-II", code: "ME492" },
      { name: "Seminar & Technical Writing", code: "ME493" },
    ],
  },

  // ─── Civil Engineering ───
  Civil: {
    "3": [
      { name: "Strength of Materials", code: "CE201" },
      { name: "Surveying", code: "CE202" },
      { name: "Building Materials & Construction", code: "CE203" },
      { name: "Fluid Mechanics", code: "CE204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Structural Analysis-I", code: "CE205" },
      { name: "Geotechnical Engineering-I", code: "CE206" },
      { name: "Hydraulics & Hydraulic Machines", code: "CE207" },
      { name: "Concrete Technology", code: "CE208" },
      { name: "Numerical Methods", code: "MA204" },
    ],
    "5": [
      { name: "Structural Analysis-II", code: "CE301" },
      { name: "Geotechnical Engineering-II", code: "CE302" },
      { name: "Transportation Engineering-I", code: "CE303" },
      { name: "Water Resources Engineering", code: "CE304" },
      { name: "RCC Design-I", code: "CE305" },
    ],
    "6": [
      { name: "RCC Design-II", code: "CE306" },
      { name: "Steel Structures", code: "CE307" },
      { name: "Transportation Engineering-II", code: "CE308" },
      { name: "Environmental Engineering", code: "CE309" },
      { name: "Estimation & Costing", code: "CE310" },
    ],
    "7": [
      { name: "Foundation Engineering", code: "CE401" },
      { name: "Construction Management", code: "CE402" },
      { name: "Earthquake Engineering", code: "CE403" },
      { name: "Project-I", code: "CE491" },
    ],
    "8": [
      { name: "Bridge Engineering", code: "CE404" },
      { name: "Project-II", code: "CE492" },
      { name: "Seminar & Technical Writing", code: "CE493" },
    ],
  },

  // ─── IT (Information Technology) ───
  IT: {
    "3": [
      { name: "Data Structures", code: "IT201" },
      { name: "Digital Logic Design", code: "IT202" },
      { name: "Discrete Mathematics", code: "IT203" },
      { name: "Object Oriented Programming", code: "IT204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Design & Analysis of Algorithms", code: "IT205" },
      { name: "Computer Organization", code: "IT206" },
      { name: "Database Management System", code: "IT207" },
      { name: "Automata Theory", code: "IT208" },
      { name: "Probability & Statistics", code: "MA202" },
    ],
    "5": [
      { name: "Operating Systems", code: "IT301" },
      { name: "Computer Networks", code: "IT302" },
      { name: "Software Engineering", code: "IT303" },
      { name: "Web Technology", code: "IT304" },
      { name: "Information Security", code: "IT305" },
    ],
    "6": [
      { name: "Cloud Computing", code: "IT306" },
      { name: "Artificial Intelligence", code: "IT307" },
      { name: "Cyber Security", code: "IT308" },
      { name: "Mobile Application Development", code: "IT309" },
      { name: "Data Science", code: "IT310" },
    ],
    "7": [
      { name: "Machine Learning", code: "IT401" },
      { name: "Big Data Analytics", code: "IT402" },
      { name: "DevOps & Automation", code: "IT403" },
      { name: "Project-I", code: "IT491" },
    ],
    "8": [
      { name: "Blockchain Technology", code: "IT404" },
      { name: "Project-II", code: "IT492" },
      { name: "Seminar & Technical Writing", code: "IT493" },
    ],
  },

  // ─── Agriculture (Agricultural Engineering & Technology) ───
  Agriculture: {
    "3": [
      { name: "Soil Science & Agronomy", code: "AG201" },
      { name: "Fluid Mechanics & Open Channel Flow", code: "AG202" },
      { name: "Thermodynamics in Agriculture", code: "AG203" },
      { name: "Farm Power & Tractor Technology", code: "AG204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Soil Mechanics & Foundation", code: "AG205" },
      { name: "Farm Machinery & Equipment", code: "AG206" },
      { name: "Surveying & Leveling", code: "AG207" },
      { name: "Crop Processing Engineering", code: "AG208" },
      { name: "Environmental Engineering in Agriculture", code: "AG209" },
    ],
    "5": [
      { name: "Soil & Water Conservation Engineering", code: "AG301" },
      { name: "Irrigation & Drainage Engineering", code: "AG302" },
      { name: "Post Harvest Technology", code: "AG303" },
      { name: "Agricultural Structures & Environmental Control", code: "AG304" },
      { name: "Heat & Mass Transfer in Food Processing", code: "AG305" },
    ],
    "6": [
      { name: "Groundwater & Wells Technology", code: "AG306" },
      { name: "Farm Machinery Design", code: "AG307" },
      { name: "Dairy & Food Engineering", code: "AG308" },
      { name: "Remote Sensing & GIS in Agriculture", code: "AG309" },
      { name: "Renewable Energy in Agriculture", code: "AG310" },
    ],
    "7": [
      { name: "Precision Agriculture & Drone Technology", code: "AG401" },
      { name: "Watershed Planning & Management", code: "AG402" },
      { name: "Food Packaging & Storage Technology", code: "AG403" },
      { name: "Project-I", code: "AG491" },
    ],
    "8": [
      { name: "Greenhouse Technology & Protected Cultivation", code: "AG404" },
      { name: "Agribusiness Management & Entrepreneurship", code: "AG405" },
      { name: "Project-II", code: "AG492" },
      { name: "Seminar & Technical Writing", code: "AG493" },
    ],
  },

  // ─── Biotechnology ───
  Biotechnology: {
    "3": [
      { name: "Biochemistry", code: "BT201" },
      { name: "Cell Biology", code: "BT202" },
      { name: "Microbiology", code: "BT203" },
      { name: "Genetics", code: "BT204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Molecular Biology", code: "BT205" },
      { name: "Immunology", code: "BT206" },
      { name: "Bioprocess Engineering", code: "BT207" },
      { name: "Bioinformatics", code: "BT208" },
    ],
    "5": [
      { name: "Genetic Engineering", code: "BT301" },
      { name: "Enzyme Technology", code: "BT302" },
      { name: "Downstream Processing", code: "BT303" },
      { name: "Plant Biotechnology", code: "BT304" },
    ],
    "6": [
      { name: "Animal Biotechnology", code: "BT305" },
      { name: "Environmental Biotechnology", code: "BT306" },
      { name: "Pharmaceutical Biotechnology", code: "BT307" },
      { name: "Biostatistics", code: "BT308" },
    ],
    "7": [
      { name: "Genomics & Proteomics", code: "BT401" },
      { name: "Nanobiotechnology", code: "BT402" },
      { name: "Project-I", code: "BT491" },
    ],
    "8": [
      { name: "Project-II", code: "BT492" },
      { name: "Seminar & Technical Writing", code: "BT493" },
    ],
  },

  // ─── Chemical Engineering ───
  Chemical: {
    "3": [
      { name: "Chemical Process Calculations", code: "CH201" },
      { name: "Fluid Mechanics", code: "CH202" },
      { name: "Chemical Engineering Thermodynamics-I", code: "CH203" },
      { name: "Mechanical Operations", code: "CH204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Chemical Engineering Thermodynamics-II", code: "CH205" },
      { name: "Heat Transfer", code: "CH206" },
      { name: "Mass Transfer-I", code: "CH207" },
      { name: "Chemical Reaction Engineering-I", code: "CH208" },
    ],
    "5": [
      { name: "Mass Transfer-II", code: "CH301" },
      { name: "Chemical Reaction Engineering-II", code: "CH302" },
      { name: "Process Dynamics & Control", code: "CH303" },
      { name: "Petroleum Refinery Engineering", code: "CH304" },
    ],
    "6": [
      { name: "Process Equipment Design", code: "CH305" },
      { name: "Transport Phenomena", code: "CH306" },
      { name: "Polymer Technology", code: "CH307" },
      { name: "Environmental Engineering", code: "CH308" },
    ],
    "7": [
      { name: "Process Plant Design", code: "CH401" },
      { name: "Biochemical Engineering", code: "CH402" },
      { name: "Project-I", code: "CH491" },
    ],
    "8": [
      { name: "Project-II", code: "CH492" },
      { name: "Seminar & Technical Writing", code: "CH493" },
    ],
  },

  // ─── Mining Engineering ───
  Mining: {
    "3": [
      { name: "Introduction to Mining", code: "MN201" },
      { name: "Mine Surveying", code: "MN202" },
      { name: "Engineering Geology", code: "MN203" },
      { name: "Rock Mechanics", code: "MN204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Underground Mining Methods", code: "MN205" },
      { name: "Surface Mining Methods", code: "MN206" },
      { name: "Mine Ventilation", code: "MN207" },
      { name: "Mineral Processing", code: "MN208" },
    ],
    "5": [
      { name: "Mine Safety & Legislation", code: "MN301" },
      { name: "Drilling & Blasting", code: "MN302" },
      { name: "Mine Environment & Ventilation", code: "MN303" },
      { name: "Mine Machinery", code: "MN304" },
    ],
    "6": [
      { name: "Mine Planning & Design", code: "MN305" },
      { name: "Mineral Economics", code: "MN306" },
      { name: "Mine Surveying-II", code: "MN307" },
      { name: "Coal Mining", code: "MN308" },
    ],
    "7": [
      { name: "Opencast Mining", code: "MN401" },
      { name: "Mine Management", code: "MN402" },
      { name: "Project-I", code: "MN491" },
    ],
    "8": [
      { name: "Project-II", code: "MN492" },
      { name: "Seminar & Technical Writing", code: "MN493" },
    ],
  },

  // ─── Automobile Engineering ───
  Automobile: {
    "3": [
      { name: "Thermodynamics", code: "AU201" },
      { name: "Strength of Materials", code: "AU202" },
      { name: "Manufacturing Processes", code: "AU203" },
      { name: "Material Science", code: "AU204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Fluid Mechanics", code: "AU205" },
      { name: "Kinematics of Machines", code: "AU206" },
      { name: "Automotive Chassis", code: "AU207" },
      { name: "Automotive Engines", code: "AU208" },
    ],
    "5": [
      { name: "Vehicle Body Engineering", code: "AU301" },
      { name: "Automotive Transmission", code: "AU302" },
      { name: "Automotive Electrical Systems", code: "AU303" },
      { name: "Vehicle Dynamics", code: "AU304" },
    ],
    "6": [
      { name: "Automotive Electronics", code: "AU305" },
      { name: "Emission Control & Alternate Fuels", code: "AU306" },
      { name: "CAD/CAM", code: "AU307" },
      { name: "Automotive Safety", code: "AU308" },
    ],
    "7": [
      { name: "Electric & Hybrid Vehicles", code: "AU401" },
      { name: "Automotive Design", code: "AU402" },
      { name: "Project-I", code: "AU491" },
    ],
    "8": [
      { name: "Project-II", code: "AU492" },
      { name: "Seminar & Technical Writing", code: "AU493" },
    ],
  },

  // ─── EIE (Electronics & Instrumentation Engineering) ───
  EIE: {
    "3": [
      { name: "Electrical Circuit Analysis", code: "EI201" },
      { name: "Analog Electronics", code: "EI202" },
      { name: "Transducers & Sensors", code: "EI203" },
      { name: "Digital Electronics", code: "EI204" },
      { name: "Mathematics-III", code: "MA201" },
    ],
    "4": [
      { name: "Signals & Systems", code: "EI205" },
      { name: "Control Systems", code: "EI206" },
      { name: "Electronic Measurements", code: "EI207" },
      { name: "Industrial Instrumentation", code: "EI208" },
    ],
    "5": [
      { name: "Process Control", code: "EI301" },
      { name: "Biomedical Instrumentation", code: "EI302" },
      { name: "Microprocessor & Microcontroller", code: "EI303" },
      { name: "Analytical Instrumentation", code: "EI304" },
    ],
    "6": [
      { name: "Virtual Instrumentation", code: "EI305" },
      { name: "PLC & SCADA", code: "EI306" },
      { name: "Digital Signal Processing", code: "EI307" },
      { name: "Optical Instrumentation", code: "EI308" },
    ],
    "7": [
      { name: "Industrial Automation", code: "EI401" },
      { name: "Embedded Systems", code: "EI402" },
      { name: "Project-I", code: "EI491" },
    ],
    "8": [
      { name: "Project-II", code: "EI492" },
      { name: "Seminar & Technical Writing", code: "EI493" },
    ],
  },
};

// Build DEFAULT_SUBJECTS from BPUT curriculum (CSE Sem 3 subjects as seed for existing demo data)
const DEFAULT_SUBJECTS = [
  { id: "sub_dbms", name: "Database Management System", code: "CS207", branch: "CSE", semester: "4" },
  { id: "sub_dsa", name: "Data Structures", code: "CS201", branch: "CSE", semester: "3" },
  { id: "sub_maths3", name: "Mathematics-III", code: "MA201", branch: "CSE", semester: "3" },
  { id: "sub_digital", name: "Digital Electronics", code: "CS202", branch: "CSE", semester: "3" },
  { id: "sub_oop", name: "Object Oriented Programming", code: "CS204", branch: "CSE", semester: "3" },
  { id: "sub_discrete", name: "Discrete Mathematics", code: "CS203", branch: "CSE", semester: "3" },
  { id: "sub_signals", name: "Signals & Systems", code: "EC201", branch: "ECE", semester: "3" },
];

const DEFAULT_USERS = [
  {
    uid: "admin_01",
    email: "admin@bec.ac.in",
    name: "System Administrator",
    role: "admin",
    status: "approved",
    createdAt: new Date().toISOString()
  },
  {
    uid: "teacher_01",
    email: "teacher@bec.ac.in",
    name: "Dr. Rajesh Sharma",
    role: "teacher",
    department: "CSE",
    status: "approved",
    createdAt: new Date().toISOString()
  }
];

// ─── DATA SERVICE API (Firebase Firestore Only) ───────────────────────────────

export const DataService = {
  // --- USERS ---
  async getUsers() {
    let remoteUsers = [];
    let deletedUids = new Set();

    if (isLiveFirebaseConfigured && db) {
      try {
        const delSnap = await getDocs(collection(db, "deleted_users"));
        delSnap.docs.forEach(d => {
          deletedUids.add(d.id);
          const data = d.data() || {};
          if (data.uid) deletedUids.add(data.uid);
          if (data.email) deletedUids.add(data.email.toLowerCase());
        });
      } catch (e) {
        console.warn("Could not fetch deleted_users collection:", e.message);
      }

      try {
        const snap = await getDocs(collection(db, "users"));
        remoteUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      } catch (e) {
        console.warn("Firestore SDK getUsers failed, trying REST:", e.message);
        try {
          const url = `https://firestore.googleapis.com/v1/projects/bec-at-system/databases/(default)/documents/users`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.documents) {
              remoteUsers = data.documents.map(d => {
                const fields = d.fields || {};
                const result = { uid: d.name.split("/").pop() };
                for (const [key, val] of Object.entries(fields)) {
                  result[key] = val.stringValue ?? val.booleanValue ?? val.integerValue ?? val.doubleValue ?? null;
                }
                return result;
              });
            }
          }
        } catch (restErr) {
          console.warn("Firestore REST fallback also failed:", restErr.message);
        }
      }
    }

    // Merge baseline seeds + 183 1st Year Students + remote updates
    const userMap = new Map();
    [...DEFAULT_USERS, ...FIRST_YEAR_STUDENTS].forEach(u => {
      userMap.set(u.uid, u);
      if (u.email) userMap.set(u.email.toLowerCase(), u);
    });

    remoteUsers.forEach(u => {
      const existing = userMap.get(u.uid) || (u.email ? userMap.get(u.email.toLowerCase()) : null) || {};
      const merged = { ...existing, ...u };
      // Ensure password follows dob if dob was updated or if password is missing
      if (merged.dob && (!merged.password || merged.password.startsWith("2026-") || merged.password.startsWith("2025-") || merged.password.startsWith("2024-"))) {
        merged.password = merged.dob;
      }
      userMap.set(u.uid, merged);
      if (u.email) userMap.set(u.email.toLowerCase(), merged);
    });

    const uniqueUsers = Array.from(new Set(Array.from(userMap.values())))
      .filter(u => !deletedUids.has(u.uid) && !(u.email && deletedUids.has(u.email.toLowerCase())) && !u.isDeleted);

    return uniqueUsers;
  },

  async getUserById(uid) {
    if (isLiveFirebaseConfigured && db) {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) return { uid: snap.id, ...snap.data() };
      } catch (e) {
        console.warn("Firestore getUserById failed, falling back to local merge:", e.message);
      }
    }
    const all = await this.getUsers();
    return all.find(u => u.uid === uid) || null;
  },

  async updateUserRegistrationNumber(uid, regNo) {
    const cleanReg = String(regNo || "").trim().toUpperCase();
    if (isLiveFirebaseConfigured && db) {
      await setDoc(doc(db, "users", uid), { regNo: cleanReg, updatedAt: new Date().toISOString() }, { merge: true });
    }
    return true;
  },

  async createUser(userData) {
    if (!userData.uid) {
      userData.uid = `user_${Date.now()}`;
    }

    const cleanUser = {
      ...userData,
      uid: String(userData.uid).trim(),
      name: String(userData.name || "").trim(),
      email: String(userData.email || "").trim().toLowerCase(),
      rollNo: String(userData.rollNo || userData.tempId || "").trim().toUpperCase(),
      tempId: String(userData.tempId || userData.rollNo || "").trim().toUpperCase(),
      regNo: String(userData.regNo || "").trim().toUpperCase(),
      branch: userData.branch || "CSE",
      rawBranch: userData.rawBranch || userData.branch || "Computer Science Engineering",
      year: userData.year || "1st",
      section: userData.section || "A",
      semester: userData.semester || "1",
      dob: String(userData.dob || userData.password || "").trim(),
      password: String(userData.password || userData.dob || "demo123").trim(),
      role: userData.role || "student",
      status: userData.status || "approved",
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isLiveFirebaseConfigured && db) {
      await setDoc(doc(db, "users", cleanUser.uid), cleanUser, { merge: true });
      try {
        await deleteDoc(doc(db, "deleted_users", cleanUser.uid));
      } catch (e) {}
      return cleanUser;
    }
    throw new Error("Firebase is not configured. Cannot create user.");
  },

  async updateUserStatus(uid, status) {
    if (isLiveFirebaseConfigured && db) {
      await setDoc(doc(db, "users", uid), { status, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    }
    throw new Error("Firebase is not configured. Cannot update user status.");
  },

  async updateUserProfile(uid, data) {
    if (isLiveFirebaseConfigured && db) {
      try {
        const existing = await this.getUserById(uid);
        const payloadData = { ...data };
        // If dob is updated and password not explicitly provided, synchronize password to match dob
        if (payloadData.dob && !payloadData.password) {
          payloadData.password = payloadData.dob;
        }
        const fullPayload = { ...(existing || {}), ...payloadData, updatedAt: new Date().toISOString() };
        await setDoc(doc(db, "users", uid), fullPayload, { merge: true });
        return true;
      } catch (e) {
        console.warn("Firestore updateUserProfile failed, fallback direct merge:", e.message);
        const fallbackData = { ...data };
        if (fallbackData.dob && !fallbackData.password) {
          fallbackData.password = fallbackData.dob;
        }
        await setDoc(doc(db, "users", uid), { ...fallbackData, updatedAt: new Date().toISOString() }, { merge: true });
        return true;
      }
    }
    throw new Error("Firebase is not configured. Cannot update user profile.");
  },

  async deleteUser(uid) {
    if (isLiveFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, "users", uid));
      } catch (e) {}
      try {
        await setDoc(doc(db, "deleted_users", uid), {
          uid,
          deletedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Could not record to deleted_users blacklist:", e.message);
      }
      return true;
    }
    throw new Error("Firebase is not configured. Cannot delete user.");
  },

  // --- SUBJECTS ---
  async getSubjects() {
    if (isLiveFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, "subjects"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    throw new Error("Firebase is not configured. Cannot load subjects.");
  },

  async createSubject(subjectData) {
    if (isLiveFirebaseConfigured && db) {
      const newId = `sub_${Date.now()}`;
      const newSub = { id: newId, ...subjectData };
      await setDoc(doc(db, "subjects", newId), newSub);
      return newSub;
    }
    throw new Error("Firebase is not configured. Cannot create subject.");
  },

  async deleteSubject(subjectId) {
    if (isLiveFirebaseConfigured && db) {
      await deleteDoc(doc(db, "subjects", subjectId));
      return true;
    }
    throw new Error("Firebase is not configured. Cannot delete subject.");
  },

  // --- SESSIONS ---
  async getSessions() {
    if (isLiveFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, "sessions"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    throw new Error("Firebase is not configured. Cannot load sessions.");
  },

  async createSession(sessionData) {
    if (isLiveFirebaseConfigured && db) {
      const sessionId = `sess_${Date.now()}`;
      const newSession = {
        id: sessionId,
        ...sessionData,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "sessions", sessionId), newSession);
      return newSession;
    }
    throw new Error("Firebase is not configured. Cannot create session.");
  },

  async updateSessionToken(sessionId, token) {
    if (isLiveFirebaseConfigured && db) {
      await updateDoc(doc(db, "sessions", sessionId), { token, tokenGeneratedAt: Date.now() });
      return true;
    }
    throw new Error("Firebase is not configured. Cannot update session token.");
  },

  async endSession(sessionId) {
    if (isLiveFirebaseConfigured && db) {
      await updateDoc(doc(db, "sessions", sessionId), { isActive: false });
      return true;
    }
    throw new Error("Firebase is not configured. Cannot end session.");
  },

  async deleteSession(sessionId) {
    if (isLiveFirebaseConfigured && db) {
      await deleteDoc(doc(db, "sessions", sessionId));
      try {
        const snap = await getDocs(collection(db, "attendance"));
        const related = snap.docs.filter(d => d.data().sessionId === sessionId);
        for (const r of related) {
          await deleteDoc(doc(db, "attendance", r.id));
        }
      } catch (e) {
        console.warn("Could not clean up attendance records for session:", e);
      }
      return true;
    }
    throw new Error("Firebase is not configured. Cannot delete session.");
  },

  // --- ATTENDANCE ---
  async getAttendance() {
    if (isLiveFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, "attendance"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    throw new Error("Firebase is not configured. Cannot load attendance.");
  },

  async markAttendance({ student, session, token, livePhoto, isManual = false, markedBy = null }) {
    if (!isLiveFirebaseConfigured || !db) {
      throw new Error("Firebase is not configured. Cannot mark attendance.");
    }

    const normalizeStr = (v) => String(v || "").trim().toLowerCase().replace(/[\s-_+]/g, "");

    const studentBranch = normalizeStr(student?.branch);
    const sessionBranch = normalizeStr(session?.branch);
    const studentYear = normalizeStr(student?.year);
    const sessionYear = normalizeStr(session?.year);
    const studentSection = normalizeStr(student?.section);
    const sessionSection = normalizeStr(session?.section);

    // Determine all allowed sections
    let allowedSections = [];
    if (Array.isArray(session?.combinedSections) && session.combinedSections.length > 0) {
      allowedSections = session.combinedSections.map(normalizeStr);
    } else if (sessionSection.includes("all")) {
      allowedSections = ["a", "b", "c", "d"];
    } else if (sessionSection.includes("combine") || sessionSection.includes("+")) {
      ["a", "b", "c", "d"].forEach(letter => {
        if (sessionSection.includes(letter)) allowedSections.push(letter);
      });
    }

    const isCombinedSession = 
      allowedSections.length > 1 || 
      sessionSection.includes("combine") || 
      session?.isCombined;

    // Year check
    if (studentYear && sessionYear && studentYear !== sessionYear) {
      throw new Error(
        `This class is for ${session.year} Year students! (Your roster is registered as ${student.year || "Unknown"} Year)`
      );
    }

    // Section & Branch verification
    if (isCombinedSession) {
      if (allowedSections.length === 0) allowedSections = ["a", "b"];
      if (!allowedSections.includes(studentSection) && studentSection) {
        throw new Error(
          `This combined session is for Sections ${allowedSections.map(s => s.toUpperCase()).join(" & ")}! (Your roster is registered as Section ${student.section?.toUpperCase() || "Unknown"})`
        );
      }
    } else {
      if (studentSection && sessionSection && studentSection !== sessionSection) {
        throw new Error(
          `This class is for Section ${session.section}! (Your roster is registered as Section ${student.section || "Unknown"})`
        );
      }
      if (studentBranch && sessionBranch && studentBranch !== sessionBranch && session.year !== "1st") {
        throw new Error(
          `This class is for ${session.branch}! (Your roster is registered as ${student.branch || "Unknown"})`
        );
      }
    }

    if (!session.isActive && !isManual) throw new Error("This class session has ended.");
    if (!isManual && session.token !== token) throw new Error("QR Expired or Invalid token!");

    const attendanceRecords = await this.getAttendance();
    const docId = `${session.id}_${student.uid}`;

    if (attendanceRecords.some(a => a.sessionId === session.id && a.studentId === student.uid)) {
      throw new Error("Attendance Already Marked for this class!");
    }

    const newRecord = {
      id: docId,
      sessionId: session.id,
      studentId: student.uid,
      studentName: student.name,
      rollNo: student.rollNo || student.tempId || "",
      tempId: student.tempId || student.rollNo || "",
      regNo: student.regNo || "",
      branch: student.branch,
      year: student.year,
      section: student.section,
      semester: session.semester,
      subjectId: session.subjectId,
      subjectName: session.subjectName,
      markedAt: new Date().toISOString(),
      status: "present",
      livePhoto: livePhoto || null,
      photoVerified: !!livePhoto,
      isManual: !!isManual,
      markedByFaculty: isManual ? (markedBy || session.teacherName || "Faculty") : null
    };

    await setDoc(doc(db, "attendance", docId), newRecord);
    return newRecord;
  },

  // --- TEACHER MANUAL ATTENDANCE (Fallback & Corrections) ---
  async teacherManualMarkAttendance({ session, student, teacherName, reason = "Manual Attendance (QR Fallback)" }) {
    if (!isLiveFirebaseConfigured || !db) {
      throw new Error("Firebase is not configured. Cannot record attendance.");
    }

    return this.markAttendance({
      student,
      session,
      token: session?.token || "manual_faculty",
      livePhoto: null,
      isManual: true,
      markedBy: teacherName || session?.teacherName || "Faculty"
    });
  },

  async teacherManualRemoveAttendance({ sessionId, studentId, rollNo }) {
    if (!isLiveFirebaseConfigured || !db) {
      throw new Error("Firebase is not configured. Cannot remove attendance.");
    }

    const docId = `${sessionId}_${studentId}`;
    try {
      await deleteDoc(doc(db, "attendance", docId));
    } catch (e) {}

    try {
      const snap = await getDocs(collection(db, "attendance"));
      const matches = snap.docs.filter(d => {
        const data = d.data();
        return data.sessionId === sessionId && (data.studentId === studentId || (rollNo && data.rollNo === rollNo));
      });
      for (const m of matches) {
        await deleteDoc(doc(db, "attendance", m.id));
      }
    } catch (e) {
      console.warn("Error deleting attendance records:", e);
    }
    return true;
  },

  async teacherManualResetSessionAttendance({ sessionId }) {
    if (!isLiveFirebaseConfigured || !db) {
      throw new Error("Firebase is not configured. Cannot reset attendance.");
    }

    const snap = await getDocs(collection(db, "attendance"));
    const matches = snap.docs.filter(d => d.data().sessionId === sessionId);
    for (const m of matches) {
      await deleteDoc(doc(db, "attendance", m.id));
    }
    return true;
  },

  // --- ATTENDANCE STATS CALCULATION ---
  async getStudentSubjectStats(student) {
    const allSessions = await this.getSessions();
    const allAttendance = await this.getAttendance();
    const allSubjects = await this.getSubjects();

    const normalizeStr = (v) => String(v || "").trim().toLowerCase().replace(/[\s-_+]/g, "");

    const bputList = this.getBputSubjectsForBranch(student?.branch, student?.semester) || [];
    const subjectsMap = new Map();

    bputList.forEach(b => {
      const key = b.code || b.name;
      subjectsMap.set(key, { id: b.code || b.name, name: b.name, code: b.code });
    });

    const studSec = normalizeStr(student?.section);
    const studYear = normalizeStr(student?.year);
    const studBranch = normalizeStr(student?.branch);

    const classSessions = allSessions.filter(sess => {
      const sessSec = normalizeStr(sess.section);
      const isComb = sessSec.includes("ab") || sessSec.includes("combine") || sess.isCombined ||
        (Array.isArray(sess.combinedSections) && sess.combinedSections.some(s => normalizeStr(s) === studSec));

      const secMatch = isComb || sessSec === studSec;
      const yearMatch = normalizeStr(sess.year) === studYear;
      const branchMatch = (sess.year === "1st" && isComb) || normalizeStr(sess.branch) === studBranch;

      return yearMatch && secMatch && branchMatch;
    });

    classSessions.forEach(sess => {
      const key = sess.subjectId || sess.subjectName;
      if (!subjectsMap.has(key)) {
        subjectsMap.set(key, { id: sess.subjectId || key, name: sess.subjectName || key, code: sess.subjectId || "" });
      }
    });

    const customBranchSubs = allSubjects.filter(
      s => s.branch === student?.branch && (!s.semester || s.semester === student?.semester)
    );
    customBranchSubs.forEach(s => {
      const key = s.code || s.id || s.name;
      if (!subjectsMap.has(key)) {
        subjectsMap.set(key, { id: s.id, name: s.name, code: s.code || "" });
      }
    });

    const stats = Array.from(subjectsMap.values()).map(sub => {
      const totalClasses = classSessions.filter(
        sess => sess.subjectId === sub.id || sess.subjectName === sub.name || sess.subjectId === sub.code
      ).length;

      const attendedClasses = allAttendance.filter(
        att =>
          (att.studentId === student?.uid || (att.rollNo && att.rollNo === student?.rollNo) || (att.tempId && att.tempId === student?.tempId)) &&
          (att.subjectId === sub.id || att.subjectName === sub.name || att.subjectId === sub.code)
      ).length;

      const percentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 100;

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        code: sub.code,
        totalClasses,
        attendedClasses,
        percentage,
        isWarning: totalClasses > 0 && percentage < 75
      };
    });

    return stats;
  },

  // --- ADMIN BULK ATTENDANCE ---
  async adminBulkMarkAttendance({ branch, year, section, semester, subjectId, subjectName, studentIds, adminName }) {
    if (!isLiveFirebaseConfigured || !db) throw new Error("Firebase is not configured.");

    const allUsers = await this.getUsers();
    const attendanceRecords = await this.getAttendance();

    const sessionId = `admin_sess_${Date.now()}`;
    const newSession = {
      id: sessionId, branch, year, section, semester, subjectId, subjectName,
      teacherId: "admin", teacherName: adminName || "System Administrator",
      token: "admin_direct", tokenGeneratedAt: Date.now(),
      isActive: false, createdAt: new Date().toISOString(), markedByAdmin: true
    };
    await setDoc(doc(db, "sessions", sessionId), newSession);

    const newRecords = [];
    for (const studentId of studentIds) {
      const student = allUsers.find(u => u.uid === studentId);
      if (!student) continue;
      const docId = `${sessionId}_${studentId}`;
      if (attendanceRecords.some(a => a.sessionId === sessionId && a.studentId === studentId)) continue;

      const record = {
        id: docId, sessionId, studentId,
        studentName: student.name, rollNo: student.rollNo,
        branch: student.branch, year: student.year, section: student.section,
        semester, subjectId, subjectName,
        markedAt: new Date().toISOString(), status: "present", markedByAdmin: true
      };
      await setDoc(doc(db, "attendance", docId), record);
      newRecords.push(record);
    }
    return { session: newSession, records: newRecords, count: newRecords.length };
  },

  // --- ADMIN MEDICAL / BOOST ATTENDANCE ---
  async adminBoostAttendanceToTarget({ studentId, targetPercentage = 75, reason = "Medical Grounds / Approved Exemption", adminName = "System Administrator" }) {
    if (!isLiveFirebaseConfigured || !db) throw new Error("Firebase is not configured.");

    const student = await this.getUserById(studentId);
    if (!student) throw new Error("Student not found!");

    const allSessions = await this.getSessions();
    const allAttendance = await this.getAttendance();
    const allSubjects = await this.getSubjects();

    const branchSubjects = allSubjects.filter(
      s => s.branch === student.branch && (s.semester === student.semester || !s.semester)
    );

    const updatedRecords = [...allAttendance];
    const newAddedRecords = [];
    const subjectsBoosted = [];

    for (const sub of branchSubjects) {
      const subjectSessions = allSessions.filter(
        sess =>
          sess.branch === student.branch && sess.year === student.year &&
          sess.section === student.section && sess.subjectId === sub.id
      );

      const totalClasses = subjectSessions.length;
      if (totalClasses === 0) continue;

      const attendedSessionIds = new Set(
        updatedRecords
          .filter(att => att.studentId === student.uid && att.subjectId === sub.id)
          .map(att => att.sessionId)
      );

      const currentCount = attendedSessionIds.size;
      const targetCount = Math.min(totalClasses, Math.ceil(totalClasses * (targetPercentage / 100)));

      if (currentCount < targetCount) {
        const needed = targetCount - currentCount;
        let addedForThisSub = 0;
        const missedSessions = subjectSessions.filter(s => !attendedSessionIds.has(s.id));

        for (let i = 0; i < needed && i < missedSessions.length; i++) {
          const sess = missedSessions[i];
          const docId = `${sess.id}_${student.uid}`;
          const record = {
            id: docId, sessionId: sess.id, studentId: student.uid,
            studentName: student.name, rollNo: student.rollNo,
            branch: student.branch, year: student.year, section: student.section,
            semester: student.semester || sub.semester, subjectId: sub.id, subjectName: sub.name,
            markedAt: new Date().toISOString(), status: "present",
            markedByAdmin: true, reason, medicalExemption: true
          };
          await setDoc(doc(db, "attendance", docId), record);
          updatedRecords.push(record);
          newAddedRecords.push(record);
          addedForThisSub++;
        }

        while (addedForThisSub < needed) {
          const vSessId = `med_sess_${sub.id}_${Date.now()}_${addedForThisSub}`;
          const vSess = {
            id: vSessId, branch: student.branch, year: student.year, section: student.section,
            semester: student.semester || sub.semester, subjectId: sub.id, subjectName: sub.name,
            teacherId: "admin", teacherName: adminName, token: "medical_direct",
            tokenGeneratedAt: Date.now(), isActive: false, createdAt: new Date().toISOString(),
            markedByAdmin: true, isCompensatory: true
          };
          await setDoc(doc(db, "sessions", vSessId), vSess);

          const docId = `${vSessId}_${student.uid}`;
          const record = {
            id: docId, sessionId: vSessId, studentId: student.uid,
            studentName: student.name, rollNo: student.rollNo,
            branch: student.branch, year: student.year, section: student.section,
            semester: student.semester || sub.semester, subjectId: sub.id, subjectName: sub.name,
            markedAt: new Date().toISOString(), status: "present",
            markedByAdmin: true, reason, medicalExemption: true
          };
          await setDoc(doc(db, "attendance", docId), record);
          updatedRecords.push(record);
          newAddedRecords.push(record);
          addedForThisSub++;
        }

        subjectsBoosted.push({
          subjectName: sub.name,
          beforePct: Math.round((currentCount / totalClasses) * 100),
          afterPct: Math.round((targetCount / totalClasses) * 100),
          addedClasses: addedForThisSub
        });
      }
    }

    return {
      studentName: student.name, rollNo: student.rollNo,
      targetPercentage, totalRecordsAdded: newAddedRecords.length, subjectsBoosted
    };
  },

  // --- BPUT CURRICULUM HELPERS ---
  getBputCurriculum() { return BPUT_CURRICULUM; },

  getBputSubjectsForBranch(branch, semester) {
    const results = [];
    if (semester === "1" || semester === "2") {
      results.push(...(BPUT_CURRICULUM.common?.[semester] || []));
    }
    const branchData = BPUT_CURRICULUM[branch];
    if (branchData?.[semester]) results.push(...branchData[semester]);
    return results;
  },

  // Constant getters
  getDepartments() {
    return DEFAULT_DEPARTMENTS;
  },
  getYears() {
    return DEFAULT_YEARS;
  },
  getSections() {
    return DEFAULT_SECTIONS;
  },
  getSemesters() {
    return DEFAULT_SEMESTERS;
  }
};
