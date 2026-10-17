/* UniVerse — demo seed data and config. All content here is fictional sample data for a working prototype. */

const CONFIG = {
  PREMIUM_PRICE: 20, // AED / month — change this single value to update it everywhere
  CURRENCY: 'AED',
  SCHOOL: 'AURAK',
  SCHOOL_FULL: 'American University of Ras Al Khaimah',
  EMAIL_DOMAIN: '@aurak.ac.ae',
};

function premiumPriceLabel() { return `${CONFIG.CURRENCY} ${CONFIG.PREMIUM_PRICE}/month`; }

// crude heuristic placeholder for a real moderation service — flags obvious abuse, never blocks ordinary criticism
const MODERATION_BLOCKLIST = [
  'idiot', 'stupid', 'hate you', 'kill yourself', 'shut up', 'dumbass', 'retard', 'trash professor', 'scam'
];

function moderateText(text) {
  const lower = text.toLowerCase();
  const hit = MODERATION_BLOCKLIST.find(w => lower.includes(w));
  if (hit) {
    return { status: 'pending', reason: `Flagged for review — contains language close to "${hit}". A moderator will check context within 24h.` };
  }
  if (text.trim().length < 2) {
    return { status: 'pending', reason: 'Flagged for review — content too short to evaluate.' };
  }
  return { status: 'approved', reason: null };
}

const MAJORS = [
  'Computer Engineering', 'Business Administration', 'Interior Design', 'Biotechnology',
  'Mechanical Engineering', 'Mass Communication', 'International Studies', 'Architecture',
  'Civil Engineering', 'Information Technology'
];

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

const DEPARTMENTS = ['Marketing', 'Marketing and Business', 'Business and Public Policy', 'Accounting, Finance, and Economics'];

const AVATAR_PALETTE = ['#722F37', '#A85C66', '#5C4033', '#8C6A58', '#C98A9A', '#3F6B5C', '#4A5A8C'];

function initialsOf(name) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function avatarColor(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

const STUDENTS = [
  { id: 'u-amina', name: 'Amina Al Shamsi', major: 'Architecture', year: 'Junior', tier: 'premium', bio: 'Sketching RAK\'s skyline one studio crit at a time. VP of the Architecture Society.' },
  { id: 'u-farhan', name: 'Farhan Qureshi', major: 'Computer Engineering', year: 'Senior', tier: 'premium', bio: 'Builds small robots, bigger opinions about tabs vs spaces. Runs the AURAK Robotics booth every open day.' },
  { id: 'u-leila', name: 'Leila Haddad', major: 'Mass Communication', year: 'Sophomore', tier: 'free', bio: 'Podcasting about campus life from a dorm closet turned studio.' },
  { id: 'u-vikram', name: 'Vikram Nair', major: 'Business Administration', year: 'Junior', tier: 'premium', bio: 'Runs a small side hustle out of his backpack. Ask about the keychains.' },
  { id: 'u-sara', name: 'Sara Boutaleb', major: 'Biotechnology', year: 'Freshman', tier: 'free', bio: 'New to AURAK, new to RAK, still finding the shortest route to the Hub.' },
  { id: 'u-daniel', name: 'Daniel Okafor', major: 'Mechanical Engineering', year: 'Senior', tier: 'free', bio: 'Formula Student team, chassis lead. Coffee-powered.' },
  { id: 'u-mei', name: 'Mei Lin Tan', major: 'Interior Design', year: 'Sophomore', tier: 'premium', bio: 'Thrifted furniture flipper. My dorm room has three plants and one regret.' },
  { id: 'u-omar', name: 'Omar Al Mazrouei', major: 'International Studies', year: 'Junior', tier: 'free', bio: 'Model UN, debate club, and chronically late to 8am lectures.' },
];

function studentById(id) { return STUDENTS.find(s => s.id === id); }

const RATING_CATEGORIES = [
  ['overall', 'Overall Rating'],
  ['clarity', 'Teaching Clarity'],
  ['examDifficulty', 'Exam Difficulty'],
  ['helpfulness', 'Helpfulness'],
  ['approachability', 'Approachability'],
  ['workload', 'Assignment Workload'],
];

const PROFESSORS = [
  {
    id: 'p-bhatti', name: 'Tariq Bhatti', department: 'Marketing',
    courses: ['Social Media and Digital Marketing', 'Luxury Brand Management', 'Marketing Research Techniques and Applications', 'Marketing Strategy'],
    sampleReviews: [
      { stars: 5, text: 'The lectures are interesting and the examples make marketing concepts easier to understand. The assignments encourage students to think creatively.' },
      { stars: 4, text: 'The course projects are enjoyable, especially when we get to apply marketing ideas to real brands. Keeping up with the course material is important.' },
    ],
    reviews: [],
  },
  {
    id: 'p-kumar', name: 'Pranav Kumar', department: 'Marketing and Business',
    courses: ['Principles of Marketing', 'Integrated Marketing Communications', 'Supply Chain Management', 'Business Communication'],
    sampleReviews: [
      { stars: 5, text: 'The lessons are well organized, and the marketing topics are explained with useful business examples. Participating in class helps with understanding the material.' },
      { stars: 4, text: 'The assignments are practical and help students understand how businesses communicate with customers. Reviewing the lectures regularly is helpful.' },
    ],
    reviews: [],
  },
  {
    id: 'p-arman', name: 'AbdelFatah Said Arman', department: 'Business and Public Policy',
    courses: ['Public Policy', 'Business Ethics', 'Human Resource Analytics'],
    sampleReviews: [
      { stars: 5, text: 'The class discussions encourage students to think about real-world issues and understand different perspectives. The topics are useful beyond university.' },
      { stars: 4, text: 'The subjects involve critical thinking and understanding concepts rather than simply memorizing definitions. The discussions make the topics more engaging.' },
    ],
    reviews: [],
  },
  {
    id: 'p-mohammed', name: 'Hussain Mohammed', department: 'Accounting, Finance, and Economics',
    courses: ['Principles of Managerial Accounting', 'International Accounting', 'Integrated Business Essentials', 'Macroeconomic Policy', 'Managerial Accounting', 'Financial Decision Making'],
    sampleReviews: [
      { stars: 5, text: 'The accounting examples are useful for understanding how to apply formulas and calculations. Practicing the questions is important for preparing for assessments.' },
      { stars: 4, text: 'The course covers important financial concepts that can be applied to business decisions. Working through practice problems helps reinforce the material.' },
    ],
    reviews: [],
  },
];

function realReviews(prof) { return prof.reviews.filter(r => r.status === 'approved'); }

function avgRating(prof, key = 'overall') {
  const approved = realReviews(prof);
  if (!approved.length) return 0;
  return approved.reduce((s, r) => s + r.ratings[key], 0) / approved.length;
}

const EVENTS = [
  { id: 'e1', title: 'Jebel Jais Sunrise Hike', category: 'Social', date: '2026-10-24', time: '05:00', location: 'Jebel Jais Trailhead', featured: true,
    desc: 'Student Activities bus leaves the main gate at 4am sharp. Breakfast and the famous zipline view at the top are on us.', status: 'approved', submittedBy: null },
  { id: 'e2', title: 'Freshmen Welcome Mixer', category: 'Freshmen', date: '2026-10-20', time: '17:30', location: 'The Hub Courtyard', featured: true,
    desc: 'Games, free karak, and every club booth in one courtyard. The easiest way to meet your first ten friends at AURAK.', status: 'approved', submittedBy: null },
  { id: 'e3', title: 'Robotics Open Build Night', category: 'Workshop', date: '2026-10-22', time: '19:00', location: 'Engineering Lab C2', featured: false,
    desc: 'Bring a laptop, borrow a soldering iron. No experience needed, the club will pair you with a mentor.', status: 'approved', submittedBy: 'u-farhan' },
  { id: 'e4', title: 'AURAK Entrepreneurs Pitch Night', category: 'Competition', date: '2026-11-02', time: '18:00', location: 'Auditorium', featured: false,
    desc: 'Five student businesses, five minutes each, judged by RAK Chamber of Commerce reps. Winner gets a free Student Spotlight feature.', status: 'approved', submittedBy: 'u-vikram' },
  { id: 'e5', title: 'Study Jam: Finals Week', category: 'Study Group', date: '2026-12-07', time: '10:00', location: 'Library 2nd Floor', featured: false,
    desc: 'Silent co-working, snacks halfway through, and a whiteboard of everyone\'s trickiest formulas.', status: 'approved', submittedBy: null },
  { id: 'e6', title: 'Midnight Thrift Pop-Up', category: 'Social', date: '2026-10-29', time: '20:00', location: 'Student Lounge', featured: false,
    desc: 'Pending admin approval — a late addition from the Interior Design society.', status: 'pending', submittedBy: 'u-mei' },
];

const BUSINESS_CATEGORIES = ['Coffee & Cafés', 'Food & Desserts', 'Fashion & Accessories', 'Beauty & Lifestyle', 'Art & Handmade', 'Other'];

const BUSINESSES = [
  { id: 'b1', ownerId: 'u-vikram', name: 'Vikram\'s Keychains', category: 'Art & Handmade', logo: 'VK',
    desc: '3D-printed keychains of every AURAK club logo, plus custom name tags. Turnaround in 2 days.', instagram: '@vk.prints', contact: '050 123 4567',
    offer: 'Buy 2 keychains, get a AURAK logo one free.', discountCode: 'VK-FREE1', discountExpires: '2026-12-31', status: 'approved', featured: true },
  { id: 'b2', ownerId: 'u-mei', name: 'Mei\'s Thrift Corner', category: 'Fashion & Accessories', logo: 'MT',
    desc: 'Pre-loved clothing and dorm décor, restocked every Sunday from the Dana Mall thrift runs.', instagram: '@meisthrift', contact: '052 987 6543',
    offer: '15% off your first order.', discountCode: 'THRIFT15', discountExpires: '2026-11-30', status: 'approved', featured: true },
  { id: 'b3', ownerId: 'u-leila', name: 'Karak & Chill', category: 'Coffee & Cafés', logo: 'KC',
    desc: 'Dorm-brewed karak delivered to your building between classes. Cardamom or saffron, your call.', instagram: '@karakandchill', contact: '054 222 1198',
    offer: 'Free upgrade to a large cup on your 5th order.', discountCode: 'KARAK5', discountExpires: '2026-12-15', status: 'approved', featured: false },
  { id: 'b4', ownerId: 'u-amina', name: 'Amina\'s Model Studio', category: 'Art & Handmade', logo: 'AS',
    desc: 'Laser-cut architecture model pieces and final-review mounting boards, made to your studio\'s spec sheet.', instagram: '@amina.models', contact: '050 765 4321',
    offer: '10% off orders placed before week 10.', discountCode: 'MODEL10', discountExpires: '2026-12-01', status: 'approved', featured: false },
  { id: 'b5', ownerId: 'u-daniel', name: 'Torque Tutoring', category: 'Other', logo: 'TT',
    desc: '1-on-1 statics and dynamics tutoring from a Formula Student chassis lead who has survived the course.', instagram: '@torque.tutors', contact: '055 444 7788',
    offer: 'First session free.', discountCode: 'TORQUEFREE', discountExpires: '2026-12-31', status: 'approved', featured: false },
  { id: 'b6', ownerId: 'u-sara', name: 'Sara\'s Soap Lab', category: 'Beauty & Lifestyle', logo: 'SL',
    desc: 'Small-batch cold-process soap bars, biotech-nerd approved ingredient lists.', instagram: '@saras.soaplab', contact: '056 333 2211',
    offer: 'Pending review before it goes live in Student Spotlight.', discountCode: 'SOAP10', discountExpires: '2026-12-20', status: 'pending', featured: false },
];

const PERKS = [
  { id: 'perk-coffee', name: 'Campus Coffee Club', category: 'Coffee & Beverages', offer: '15% off coffee orders.', discountPercent: 15, discountCode: 'UNIVERSE15', logo: 'CC', featured: true },
  { id: 'perk-matcha', name: 'Matcha Moments', category: 'Matcha & Drinks', offer: '20% off matcha drinks.', discountPercent: 20, discountCode: 'MATCHA20', logo: 'MM', featured: false },
  { id: 'perk-sweet', name: 'Sweet Spot Desserts', category: 'Desserts', offer: '10% off desserts.', discountPercent: 10, discountCode: 'SWEET10', logo: 'SS', featured: false },
  { id: 'perk-snack', name: 'The Study Snack', category: 'Food & Snacks', offer: 'Buy one snack, get the second at 50% off.', discountPercent: 50, discountCode: 'STUDY50', logo: 'TS', featured: true },
  { id: 'perk-creative', name: 'The Creative Corner', category: 'Student-Owned Businesses', offer: '15% off personalized gifts.', discountPercent: 15, discountCode: 'CREATE15', logo: 'CC2', featured: false },
  { id: 'perk-essentials', name: 'Study Essentials', category: 'Stationery', offer: '10% off selected stationery and study supplies.', discountPercent: 10, discountCode: 'STUDY10', logo: 'SE', featured: false },
  { id: 'perk-style', name: 'Campus Style', category: 'Fashion & Accessories', offer: '20% off selected accessories.', discountPercent: 20, discountCode: 'STYLE20', logo: 'CS', featured: true },
];

const CHAT_CHANNELS = [
  { id: 'c-general', name: 'General Campus Chat', desc: 'Anything AURAK — open to all Premium members.',
    messages: [
      { authorId: 'u-omar', text: 'anyone know if the Hub is serving the lamb biryani today or just on Thursdays', time: '09:12' },
      { authorId: 'u-mei', text: 'Thursdays only 😭 today is just the usual grill', time: '09:14' },
    ] },
  { id: 'c-freshmen', name: 'Freshmen Community', desc: 'Your first stop for making friends and finding your way around.',
    messages: [
      { authorId: 'u-sara', text: 'is it normal to still get lost finding C2 building in week 6', time: '14:02' },
      { authorId: 'u-amina', text: 'everyone gets lost in C2, even seniors. the trick is the side stairs by the vending machines', time: '14:05' },
    ] },
  { id: 'c-study', name: 'Study Groups', desc: 'Form a group, trade notes, survive finals together.',
    messages: [
      { authorId: 'u-daniel', text: 'statics study jam saturday 4pm library 2nd floor, bringing snacks', time: '11:30' },
    ] },
  { id: 'c-events', name: 'Events and Activities', desc: 'Coordinate rides, RSVPs, and post-event photo dumps.',
    messages: [
      { authorId: 'u-farhan', text: 'who else is going to the Jais sunrise hike, we should grab the same bus', time: '08:45' },
    ] },
  { id: 'c-entrepreneurs', name: 'Student Entrepreneurs', desc: 'Swap supplier tips, promo ideas, and pitch-night prep.',
    messages: [
      { authorId: 'u-vikram', text: 'anyone have a filament supplier in RAK that isn\'t a 2 week wait', time: '16:20' },
    ] },
  { id: 'c-advice', name: 'Questions and Advice', desc: 'Course registration, professor picks, dorm life — ask away.',
    messages: [
      { authorId: 'u-leila', text: 'is Dr. Khoury\'s marketing class curved? deciding between sections', time: '19:08' },
    ] },
];

const POSTS = [
  { id: 'post1', authorId: 'u-amina', time: '2h ago', text: 'Final crit survived. My model is held together with hope and double-sided tape but the jury smiled, so I\'ll take it. 🏛️',
    likes: 34, dislikes: 1, status: 'approved',
    comments: [
      { id: 'cm1', authorId: 'u-mei', text: 'the hope-and-tape school of architecture, a classic', status: 'approved' },
    ] },
  { id: 'post2', authorId: 'u-farhan', time: '4h ago', text: 'Robotics club is 3 members short of entering the RAK regional competition. If you\'ve ever touched an Arduino, we want you. Build night Wednesday, C2 Lab.',
    likes: 51, dislikes: 0, status: 'approved',
    comments: [
      { id: 'cm2', authorId: 'u-sara', text: 'I\'ve touched one (1) Arduino in a youtube tutorial, does that count', status: 'approved' },
      { id: 'cm3', authorId: 'u-farhan', text: 'it absolutely counts, see you Wednesday', status: 'approved' },
    ] },
  { id: 'post3', authorId: 'u-leila', time: '6h ago', text: 'New podcast episode: I asked 10 freshmen what they wish they knew before week 1. Episode 4 is up on the usual link in my profile.',
    likes: 22, dislikes: 0, status: 'approved', comments: [] },
  { id: 'post4', authorId: 'u-vikram', time: '1d ago', text: 'PSA: the vending machine outside the business building finally takes cards again. You\'re welcome.',
    likes: 67, dislikes: 2, status: 'approved', comments: [
      { id: 'cm4', authorId: 'u-omar', text: 'this is the real campus announcement system', status: 'approved' },
    ] },
  { id: 'post5', authorId: 'u-daniel', time: '1d ago', text: 'Formula Student chassis is finally welded. Four months of CAD finally becoming an actual metal object is a weird feeling.',
    likes: 40, dislikes: 0, status: 'approved', comments: [] },
  { id: 'post6', authorId: 'u-mei', time: '2d ago', text: 'Dorm room makeover using only thrifted finds under 50 AED total, full breakdown on my Spotlight page. My roommate is thrilled, mostly.',
    likes: 29, dislikes: 1, status: 'approved', comments: [] },
  { id: 'post7', authorId: 'u-omar', time: '3d ago', text: 'Model UN is recruiting delegates for the Gulf regional conference. No experience needed, just bring opinions and formal wear.',
    likes: 18, dislikes: 0, status: 'approved', comments: [] },
];

const NOTIFICATIONS = [
  { id: 'n1', text: 'Your comment on "Robotics club is 3 members short..." was approved.', time: '10m ago', unread: true },
  { id: 'n2', text: 'Jebel Jais Sunrise Hike starts in 7 days — reserve your bus seat.', time: '1h ago', unread: true },
  { id: 'n3', text: 'Mei\'s Thrift Corner added a new discount code to UniVerse Perks.', time: '5h ago', unread: false },
  { id: 'n4', text: 'Your Midnight Thrift Pop-Up event submission is pending admin approval.', time: '1d ago', unread: false },
];
