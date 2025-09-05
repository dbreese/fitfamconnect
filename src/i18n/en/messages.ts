export const messages = {
    appName: 'Fit Fam Connect',
    motto: 'Less Stress, More Recess!',
    disclaimer: {
        title: 'Important Reminder about AI',
        desc: "Our AI tools are like having a super-helpful teaching assistant, always ready to lend a hand! They're fantastic for generating drafts and ideas, but remember, you're the lead teacher! Please give all AI-generated content a quick review to ensure it's accurate, complete, and perfectly tailored to your students and classroom. Think of it as adding your special teacher's touch!"
    },
    results: 'Results',
    buttons: {
        signin: 'Sign In',
        getStarted: 'Get Started',
        fileUpload: 'Upload',
        logout: 'Logout',
        ok: 'OK'
    },
    options: {
        gradeTitle: 'Grade Level'
    },
    menu: {
        aitools: 'AI Tools',
        system: 'System'
    },
    recents: {
        dialogTitle: 'Recent Items'
    },
    help: {
        title: 'Help',
        subTitle: ''
    },
    textLeveler: {
        title: 'Text Leveler',
        subtitle: 'Enter text and let AI convert it to a particular reading level.',
        desc: "Struggling to make that complex text just right? Toss it into our Text Leveler, and watch it morph into perfectly grade-appropriate material. It's like having a reading level wizard at your fingertips!",
        help: [
            'Convert text to a particular grade level.',
            'First, select a grade level you want to target and enter text below.'
        ],
        textHint: 'Enter the text to level.',
        submit: 'Level'
    },

    grammarChecker: {
        title: 'Grammar Checker',
        subtitle: 'Let AI do the work to correct, or grade, some text.',
        desc: "Say goodbye to grammar headaches! Our Grammar Checker not only spots errors but also gives you the 'why' behind them. It's like having a friendly grammar expert right beside you, helping your students master the art of writing.",
        help: [
            'Correct grammar for a particular grade level or provide grammar corrections and explanations.',
            'First, select a grade level you want to target and enter your text.'
        ],
        helpModes: 'Modes',
        textHint: 'Enter the text to check or grade.',
        submit: 'Check'
    },
    letterWriter: {
        title: 'Letter Writer',
        subtitle:
            'Select target audience information and let AI create grammar-correct and punctiation-perfect letters.',
        desc: "Need to send a quick note to parents or students? Just jot down a few key points, pick your tone, and let our Letter Writer craft the perfect message. It's like having a personal scribe, ready to help you connect!",
        help: [
            'Create a letter that includes all of the bullet points and information you put below.',
            'The more information you put, the more detailed and concise the letter will be.',
            'Dont worry about grammar or spelling!'
        ],
        helpAudience: 'Who is this for?',
        helpTemperature: 'What is the tone of the response?',
        to: 'To',
        from: 'From',
        subject: 'Subject',
        textHint: 'Enter bullet points or short phrases to include in the letter.',
        submit: 'Create'
    },
    newsLetter: {
        title: 'News Letter',
        subtitle: 'Enter short bits of info and let AI do the work to generate your newsletter.',
        desc: "Creating engaging newsletters just got a whole lot easier! Simply add your points to each section, and our Newsletter Creator will weave them into a captivating update for parents. It's like having your own newsletter publishing team!",
        help: [
            'Add information below to create the text for your newsletter.',
            'No need to put too much detail! Just add short snippets that describe the gist content you want.',
            "Based on what you give me, I'll magically generate the rest for you, correcting grammar, adding punctuation, etc!"
        ],
        textHint: 'Enter your newsletter gist.',
        submit: 'Create Newsletter',
        includeSection: 'Include Section?',
        sectionsTitle: 'Section Title',
        sectionsHint: 'Short descriptions (ie, bullet points) of what you want to convey.',
        defaultTitles: ['Announcements', 'Objectives', 'Note from Your Teacher', 'Misc.']
    },
    quizTypes: {
        multi: 'Multiple Choice',
        multiDesc: 'Student gets multiple choices and must select the correct answer(s).',
        fillin: 'Fill In The Blank',
        fillinDesc: 'The answer must be filled in.',
        essay: 'Essay',
        essayDesc: 'Words or sentences can be filled in.'
    },
    quizes: {
        title: 'Quiz Creator',
        subtitle: 'Create a multiple choice quiz for the material below.',
        desc: "Time to test those skills! Our Quiz Creator lets you whip up multiple-choice, fill-in-the-blank, or essay quizzes in a flash. Just give it a topic, and watch it generate questions that'll challenge and engage your students. It's like having a quiz-making genie!",

        help: [
            'Enter details about the quiz you want to create.',
            'Include as many, or as few, details as you want.',
            'Be sure to clearly specify the topic you want to create the quiz about.'
        ],
        textHint: 'What do you want to create a quiz about?',
        helpTypes: 'What type of quiz do you want to create?',
        helpTemperature: 'What is the tone of the quiz?',
        number: 'Number of questions',
        submit: 'Create'
    },
    rubric: {
        title: 'Rubric Creator',
        subtitle: 'Let\s create a rubric! Just enter the information below.',
        desc: "Create clear and fair rubrics in seconds! Tell our Rubric Creator what you're grading, and it'll generate a detailed rubric with all the criteria you need. It's like having a grading assistant, ensuring consistency and fairness.",
        help: [
            'Enter details about the rubric you want to create.',
            'Include as many, or as few, details as you want.',
            'Be sure to clearly specify the topic you want to create the rubric about.'
        ],
        textHint: 'Important grading details for the rubric.',
        submit: 'Create Rubric',
        helpTemperature: 'What is the tone of the rubric?',
        rubricTitle: 'Assignment Title',
        overview: 'Assignment Overview',
        pointScale: 'Point Scale'
    },
    grades: {
        kindergarten: 'Kindergarten',
        first: 'First Grade',
        second: 'Second Grade',
        third: 'Third Grade',
        fourth: 'Fourth Grade',
        fifth: 'Fifth Grade',
        sixth: 'Sixth Grade',
        seventh: 'Seventh Grade',
        eight: 'Eighth Grade',
        ninth: 'Ninth Grade',
        tenth: 'Tenth Grade',
        eleventh: 'Eleventh Grade',
        twelfth: 'Twelfth Grade'
    },
    grammarModes: {
        correctMode: 'Correct',
        correctDescription: 'Just rewrite the text at the selected grade level.',
        gradeMode: 'Grade',
        gradeDescription: 'Give feedback about issues found.'
    },
    letterModes: {
        kidMode: 'For Kids',
        kidModeDescription: 'Write the letter to the student.',
        parentMode: 'For Parents',
        parentModeDescription: "Write the letter to the student's parents."
    },
    temperatures: {
        neutral: 'Neutral',
        neutralDescription: "Be factual, don't use strong emotions.",
        light: 'Lighthearted',
        lightDescription: 'Make it playful, humorous, or cheerful. Use emojis!',
        urgent: 'Serious',
        urgentDescription: 'Express more seriousness or more of a stress tone.'
    },
    editor: {
        undo: 'Undo',
        redo: 'Redo',
        bold: 'Bold',
        italic: 'Italic',
        strike: 'Strikethrough',
        paragraph: 'Paragraph',
        h1: 'Heading 1',
        h2: 'Heading 2',
        h3: 'Heading 3',
        h4: 'Heading 4',
        bulletList: 'Bulleted List',
        orderedList: 'Numbered List',
        copy: 'Copy',
        save: 'Save',
        clear: 'Clear Formatting',
        imageUrl: 'Add Image from URL',
        uploadImage: 'Upload Image',
        color: 'Color'
    },
    utils: {
        clipboardSuccess: 'Copied to clipboard!'
    },
    error: {
        fileTooLarge: 'Sorry, max file size is 2mb.'
    },
    profile: {
        title: 'User Profile',
        preferences: 'Saved Preferences',
        preferencesHelp: ['The values below will be used by all tools throughout the site.'],
        submit: 'Update',
        temperature: 'Tone of content',
        mode: 'Is content targeting kids/students, or parents?',
        from: 'Your signature for letters, newsletters, etc.',
        newsletterSections: 'Sections for your newsletter.',
        showHelp: 'Expand help sections on tools.',
        desc: "Tired of setting the same preferences over and over? You're in the right place! This is your 'set it and forget it' section. Tell us your grade level, tone, and anything else you need, and we'll handle the rest. Get your settings dialed in and enjoy a smooth, personalized Fit Fam Connect experience every time!"
    },
    landing: {
        tabs: {
            home: 'Home',
            features: 'Features',
            highlights: 'Highlights',
            about: 'About'
        }
    },
    homepage: {
        intro: 'Where AI does the homework for teachers! 🚀',
        subIntro: 'Ditch the paperwork, level up your lessons, and get back to the fun part of teaching.'
    },
    features: {
        title: 'Classroom Magic',
        subTitle: 'Smart. Simple. Powerful.',
        points: [
            {
                title: 'Intuitive Interface',
                subTitle: 'Simple clicks. Fast-n-easy.',
                icon: 'pi-users',
                color: 'bg-red-200'
            },
            {
                title: 'Text Leveling',
                subTitle: 'Re-write text for any grade level.',
                icon: 'pi-pencil',
                color: 'bg-blue-200'
            },
            {
                title: 'Grammar Grader',
                subTitle: 'Correct or grade text.',
                icon: 'pi-check-circle',
                color: 'bg-green-200'
            },
            {
                title: 'Newsletters',
                subTitle: 'Effortless newsletter generation.',
                icon: 'pi-envelope',
                color: 'bg-yellow-200'
            },
            {
                title: 'Letter Writer',
                subTitle: 'Easily engage with parents.',
                icon: 'pi-file-edit',
                color: 'bg-purple-200'
            },
            {
                title: 'Quizzes and Tests',
                subTitle: 'Quickly create tests.',
                icon: 'pi-list-check',
                color: 'bg-pink-200'
            },
            {
                title: 'Rubrics',
                subTitle: '1-2-3 Easy! Let us do the work.',
                icon: 'pi-th-large',
                color: 'bg-indigo-200'
            },
            {
                title: 'Mobile Friendly',
                subTitle: 'Use anywhere, anytime.',
                icon: 'pi-mobile',
                color: 'bg-teal-200'
            },
            {
                title: 'Well Documented',
                subTitle: 'Help and docs at your fingertips.',
                icon: 'pi-list',
                color: 'bg-orange-200'
            },
            {
                title: 'Dark Mode',
                subTitle: 'Dark mode for your beautiful eyes.',
                icon: 'pi-moon',
                color: 'bg-cyan-200'
            },
            {
                title: 'Privacy',
                subTitle: 'Your data. Your info.',
                icon: 'pi-eye',
                color: 'bg-lime-200'
            },
            {
                title: 'Accessibility',
                subTitle: 'Everyone, everywhere.',
                icon: 'pi-user-plus',
                color: 'bg-rose-200'
            }
        ]
    },
    highlights: {
        title: 'Your Portable Powerhouse',
        subTitle: 'at your fingertips.. anywhere... anytime',
        highlight1Title: 'Meet your new AI teaching wingman!',
        highlight1Text:
            'Meet your new AI teaching wingman! Fit Fam Connect is designed to be your constant companion, working seamlessly across your phone and desktop. Get ready to experience the power of AI, right at your fingertips, no matter where your teaching adventures take you!',
        highlight2Title: 'Toolbox of Teaching Awesomeness',
        highlight2Text:
            "Unlock your teacher's secret weapon stash! We're packing Fit Fam Connect with tools that are designed by teachers, for teachers. And we're not stopping there – we're adding more every day! We know what you need to succeed, because we're in the trenches with you!"
    },
    pricing: {
        title: 'Simple Pricing',
        subTitle: 'Easily cancel anytime'
    },
    dashboard: {
        title: 'Welcome to Fit Fam Connect!',
        subTitle: 'Your gateway to all the AI-powered tools designed to make your teaching life easier.',
        intro: "You're all set to explore! These tools are designed to streamline your workflow. Here's a quick look at what each one offers:",
        haveFun:
            "Now it's your turn to play! Dive in, explore, and have a blast creating with Fit Fam Connect. Remember, teaching should be fun! And while you're at it, we'd love to hear from you. Got a brilliant idea? Found a tool that's your new best friend? Or maybe you have a suggestion on how we can make things even better? Don't be shy – hit us up with your feedback! Your insights help us make Fit Fam Connect the ultimate teacher's sidekick!"
    },
    feedback: {
        menuTitle: 'Feedback',
        title: 'Feedback Fun Zone!',
        subTitle: 'Ready to make a difference? Your feedback is the key to unlocking even more teaching magic!',
        submit: 'Send Feedback',
        textHint: 'What do you think about Fit Fam Connect?',
        successTitle: 'Woohoo! Feedback Received!',
        successMsg:
            'Your brilliant ideas are now on their way to making Fit Fam Connect even better. Thanks for being awesome!',
        errorTitle: 'Oops! Something Went Wrong...',
        errorMsg:
            "Looks like your feedback got misplaced, like a homework assignment that didn't make it to the right folder! Please try sending it again."
    },
    footer: {
        company: 'Company',
        resources: 'Resources',
        legal: 'Legal',
        getstarted: 'Get Started',
        learn: 'Learn',
        privacy: 'Privacy Policy',
        termsofservice: 'Terms of Service'
    },
    about: {
        title: 'About Us',
        subTitle: 'A Teacher & Techie Tale',
        sections: [
            "Ever wish you had a magic wand to zap away the mountains of paperwork and planning? That's exactly what we asked ourselves! Fit Fam Connect was born from a wild idea hatched between an elementary school teacher with a quarter-century of classroom adventures and an IT wizard with three decades of tech sorcery. Picture this: a seasoned educator, knee-deep in lesson plans and grading, teaming up with a tech guru to build tools that actually make a difference.",
            "Our mission? To give teachers back their time! We're passionate about making life easier, so you can ditch the stress and embrace more playtime and family time. We believe in using the power of technology to tackle everyday classroom chaos, from differentiating instruction to meeting the needs of every student. And let's be real, we're here to help you conquer the insane demands teachers face today, without feeling like you're walking on eggshells.",
            "We're not just building tools; we're building a community. We understand the challenges you face because we've been there (or are still there!). We're committed to creating a platform that’s as fun and engaging as it is helpful. So, join us on this adventure, and let’s make teaching a little less stressful and a whole lot more rewarding!"
        ]
    },
    comingsoon: {
        title: 'Coming Soon!',
        subTitle: "Sneak Peek: We're Cooking Up Something Awesome!",
        sections: [
            "Hold onto your hats, teachers! We're currently in our secret lab, brewing up some seriously amazing new features. Think of it as a classroom upgrade on steroids – but way more fun! We're adding the finishing touches, and trust us, the wait will be worth it. Keep your eyes peeled, because something spectacular is about to drop!"
        ]
    }
};
