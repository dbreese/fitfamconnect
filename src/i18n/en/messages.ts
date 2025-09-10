export const messages = {
    appName: 'Fit Fam Connect',
    motto: 'Where fitness and community meet.',
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
        management: 'Management',
        reports: 'Reports',
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
        intro: 'Bringing fitness and community together.',
        subIntro:
            'Fit Fam Connect is the all-in-one solution for fitness clubs and \
            their members. Our website and mobile app provide powerful, yet affordable, tools to simplify every aspect of club management. From managing memberships and billing to scheduling classes and connecting with coaches, Fit Fam Connect helps you streamline your operations and build a stronger fitness community.'
    },
    features: {
        title: 'Features',
        subTitle: 'Smart. Simple. Powerful.',
        points: [
            {
                title: 'Intuitive Interface',
                subTitle: 'Simple clicks. Fast-n-easy.',
                icon: 'pi-desktop',
                color: 'bg-red-200'
            },
            {
                title: 'Inexpensive',
                subTitle: 'Your money goes further.',
                icon: 'pi-credit-card',
                color: 'bg-blue-200'
            },
            {
                title: 'Membership Management',
                subTitle: 'Know your members.',
                icon: 'pi-users',
                color: 'bg-green-200'
            },
            {
                title: 'Class Scheduling',
                subTitle: 'Easily schedule classes.',
                icon: 'pi-calendar',
                color: 'bg-yellow-200'
            },
            {
                title: 'Coaches and Instructors',
                subTitle: 'Manage your team.',
                icon: 'pi-users',
                color: 'bg-purple-200'
            },
            {
                title: 'Billing',
                subTitle: 'See who owes what.',
                icon: 'pi-receipt',
                color: 'bg-pink-200'
            },
            {
                title: 'Reports',
                subTitle: 'Detailed info, at your fingertips.',
                icon: 'pi-print',
                color: 'bg-indigo-200'
            }
        ],
        overflow: [
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
        successTitle: 'Woohoo! Action successful!',
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
        subTitle: '',
        sections: [
            'We saw an opportunity to help small local gyms thrive. For too long, they were at a disadvantage, lacking the tools and resources of larger chains. They were forced to choose between complex, expensive software or outdated, manual processes. This meant less time for what truly matters: building community, coaching members, and creating a fantastic fitness environment.',
            "We believe that local gyms are the heart of their communities. They're where friendships are forged, goals are crushed, and lives are changed. Our team was motivated to build a solution that was different—one that was powerful yet simple, and most importantly, affordable. We wanted to level the playing field, giving these dedicated gym owners the tools they need to succeed without breaking the bank.",
            "That's why we created Fit Fam Connect. We're on a mission to empower local gyms to be more fun, fit, and fantastic by providing them with the software they deserve. We handle the complexity so they can focus on what they do best: changing lives, one workout at a time."
        ]
    },
    comingsoon: {
        title: 'Coming Soon!',
        subTitle: "Sneak Peek: We're Cooking Up Something Awesome!",
        sections: [
            "Get ready to level up! We've been hard at work, sweating it out behind the scenes to bring you some epic new features. We're talking about updates that will make managing your gym easier and more fun than ever. Think of it as our own personal training session to make Fit Fam Connect the strongest, most powerful tool in your fitness arsenal. We're pumped to show you what's coming, and we know you'll be excited too!"
        ]
    },
    gym: {
        title: 'Gym Management',
        menuTitle: 'Gym',
        subtitle: 'Manage your fitness facility information',
        noGymTitle: 'No Gym Found',
        noGymMessage: "You don't have a gym associated with your account yet.",
        contactSupport: 'Please contact support to set up your gym information.',
        gymCodeTitle: 'Gym Code',
        gymCodeDescription: 'Share this code with members so they can join your gym',
        basicInfo: 'Basic Information',
        billingAddress: 'Billing Address',
        contactInfo: 'Contact Information',
        gymName: 'Gym Name',
        description: 'Description',
        descriptionPlaceholder: 'Brief description of your gym...',
        streetAddress: 'Street Address',
        city: 'City',
        state: 'State',
        selectState: 'Select State',
        zipCode: 'Zip Code',
        country: 'Country',
        contactEmail: 'Contact Email',
        phoneNumber: 'Phone Number',
        updateButton: 'Update Gym Information',
        success: {
            updated: 'Gym information updated successfully'
        },
        error: {
            loadFailed: 'Failed to load gym information',
            updateFailed: 'Failed to update gym information'
        },
        validation: {
            nameRequired: 'Gym name is required',
            streetRequired: 'Street address is required',
            cityRequired: 'City is required',
            stateRequired: 'State is required',
            zipRequired: 'Zip code is required',
            emailRequired: 'Contact email is required',
            invalidEmail: 'Please enter a valid email address',
            validationError: 'Validation Error'
        }
    },
    classes: {
        title: 'Class Management',
        menuTitle: 'Classes',
        subtitle: 'Manage fitness classes for your gym',
        newClass: 'New Class',
        editClass: 'Edit Class',
        deleteConfirmation: 'Delete Confirmation',
        deleteMessage: 'Are you sure you want to delete "{name}"?',
        basicInfo: 'Basic Information',
        classDetails: 'Class Details',
        className: 'Class Name',
        category: 'Category',
        categoryPlaceholder: 'e.g. Cardio, Strength, Yoga',
        description: 'Description',
        descriptionPlaceholder: 'Brief description of the class...',
        duration: 'Duration (minutes)',
        maxMembers: 'Maximum Members',
        maxMembersPlaceholder: 'Leave empty for unlimited',
        equipment: 'Required Equipment',
        equipmentHelp: 'Press Enter after each equipment item',
        actions: 'Actions',
        general: 'General',
        unlimited: 'Unlimited',
        none: 'None',
        minutes: 'min',
        hours: 'h',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        success: {
            created: 'Class created successfully',
            updated: 'Class updated successfully',
            deleted: 'Class deleted successfully'
        },
        error: {
            loadFailed: 'Failed to load classes',
            createFailed: 'Failed to create class',
            updateFailed: 'Failed to update class',
            deleteFailed: 'Failed to delete class'
        },
        validation: {
            nameRequired: 'Class name is required',
            durationRequired: 'Duration must be greater than 0 minutes',
            maxMembersInvalid: 'Maximum members must be greater than 0',
            validationError: 'Validation Error'
        }
    },
    plans: {
        title: 'Plan Management',
        menuTitle: 'Plans',
        subtitle: 'Manage billing plans for your gym',
        newPlan: 'New Plan',
        editPlan: 'Edit Plan',
        deleteConfirmation: 'Delete Confirmation',
        deleteMessage: 'Are you sure you want to delete "{name}"?',
        basicInfo: 'Basic Information',
        pricing: 'Pricing',
        schedule: 'Schedule',
        planName: 'Plan Name',
        description: 'Description',
        descriptionPlaceholder: 'Brief description of the plan...',
        priceLabel: 'Price',
        priceHelp: 'Enter the price in dollars (e.g., 99.99)',
        currency: 'Currency',
        recurringPeriod: 'Billing Period',
        startDate: 'Start Date',
        endDate: 'End Date',
        endDateOptional: 'End Date (Optional)',
        endDateHelp: 'Leave empty for plans that never expire',
        type: 'Type',
        price: 'Price',
        dateRange: 'Date Range',
        actions: 'Actions',
        recurring: 'Recurring',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        success: {
            created: 'Plan created successfully',
            updated: 'Plan updated successfully',
            deleted: 'Plan deleted successfully'
        },
        error: {
            loadFailed: 'Failed to load plans',
            createFailed: 'Failed to create plan',
            updateFailed: 'Failed to update plan',
            deleteFailed: 'Failed to delete plan'
        },
        validation: {
            nameRequired: 'Plan name is required',
            priceRequired: 'Price must be 0 or greater',
            startDateRequired: 'Start date is required',
            endAfterStart: 'End date must be after start date',
            periodRequired: 'Billing period is required for recurring plans',
            validationError: 'Validation Error'
        }
    },
    locations: {
        title: 'Location Management',
        menuTitle: 'Locations',
        subtitle: 'Manage locations and sub-locations for your gym',
        newLocation: 'New Location',
        editLocation: 'Edit Location',
        deleteConfirmation: 'Delete Confirmation',
        deleteMessage: 'Are you sure you want to delete "{name}"?',
        basicInfo: 'Basic Information',
        operatingHours: 'Operating Hours',
        subLocations: 'Sub-Locations',
        locationName: 'Location Name',
        description: 'Description',
        descriptionPlaceholder: 'Brief description of the location...',
        maxMembers: 'Maximum Members',
        maxMembersPlaceholder: 'Leave empty for unlimited',
        hours: 'Hours',
        actions: 'Actions',
        unlimited: 'Unlimited',
        none: 'None',
        noHours: 'No hours set',
        closed: 'Closed',
        daysOpen: 'days open',
        active: 'active',
        openTime: 'Open Time',
        closeTime: 'Close Time',
        addSubLocation: 'Add Sub-Location',
        subLocation: 'Sub-Location',
        subLocationName: 'Sub-Location Name',
        subLocationDescription: 'Sub-Location Description',
        maxCapacity: 'Maximum Capacity',
        equipment: 'Equipment',
        equipmentHelp: 'Press Enter after each equipment item',
        isActive: 'Active',
        noSubLocations: 'No sub-locations added yet',
        addSubLocationHint: 'Click "Add Sub-Location" to create areas within this location',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        success: {
            created: 'Location created successfully',
            updated: 'Location updated successfully',
            deleted: 'Location deleted successfully'
        },
        error: {
            loadFailed: 'Failed to load locations',
            createFailed: 'Failed to create location',
            updateFailed: 'Failed to update location',
            deleteFailed: 'Failed to delete location'
        },
        validation: {
            nameRequired: 'Location name is required',
            maxMembersInvalid: 'Maximum members must be greater than 0',
            hoursRequired: 'Open and close times are required for open days',
            invalidHours: 'Close time must be after open time',
            subLocationNameRequired: 'Sub-location name is required',
            duplicateSubLocationName: 'Sub-location names must be unique',
            subLocationCapacityInvalid: 'Sub-location capacity must be greater than 0',
            validationError: 'Validation Error'
        }
    },
    memberships: {
        title: 'Membership Management',
        menuTitle: 'Members',
        subtitle: 'Manage member status, plans, and notes',
        newMember: 'New Member',
        editMembership: 'Edit Membership',
        memberName: 'Member Name',
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email',
        phone: 'Phone',
        contact: 'Contact',
        address: 'Address',
        street: 'Street',
        city: 'City',
        state: 'State',
        zipCode: 'ZIP Code',
        statusField: 'Status',
        plans: 'Plans',
        joinDate: 'Join Date',
        notes: 'Notes',
        actions: 'Actions',
        manage: 'Manage',
        memberInfo: 'Member Information',
        memberType: 'Member Type',
        unknownMember: 'Unknown Member',
        unknown: 'Unknown',
        noPlans: 'No plans assigned',
        noNotes: 'No notes',
        selectPlans: 'Select plans for this member',
        notesPlaceholder: 'Add notes about this member...',
        plansHelp: 'Select one or more plans for this member',
        notesHelp: 'Add internal notes about this member (not visible to member)',
        memberInfoNote: 'Member contact information can only be updated by the member themselves',
        searchPlaceholder: 'Search members...',
        membersFound: 'members found',
        cancel: 'Cancel',
        save: 'Save',
        create: 'Create',
        success: {
            created: 'Member created successfully',
            updated: 'Membership updated successfully'
        },
        error: {
            loadFailed: 'Failed to load memberships',
            createFailed: 'Failed to create member',
            updateFailed: 'Failed to update membership'
        },
        validation: {
            statusRequired: 'Status is required',
            emailRequired: 'Email is required',
            firstNameRequired: 'First name is required',
            lastNameRequired: 'Last name is required',
            validationError: 'Validation Error'
        },
        statuses: {
            pending: 'Pending',
            approved: 'Approved',
            denied: 'Denied',
            inactive: 'Inactive'
        }
    },
    charges: {
        addCharge: 'Add Charge',
        chargeHistory: 'Charge History',
        chargingMember: 'Charging Member',
        amount: 'Amount',
        amountPlaceholder: '0.00',
        amountHelp: 'Enter amount in dollars (e.g., 25.00)',
        date: 'Date',
        note: 'Note',
        notePlaceholder: 'Enter description (e.g., "Shirt", "Beverage purchase")',
        noteHelp: 'Optional description of what this charge is for',
        isBilled: 'Mark as Billed',
        isBilledHelp: 'Check this if the charge has already been billed to the member',
        billingStatus: 'Billing Status',
        billedDate: 'Billed Date',
        billed: 'Billed',
        unbilled: 'Unbilled',
        noNote: 'No note',
        close: 'Close',
        cancel: 'Cancel',
        create: 'Create Charge',
        edit: 'Edit',
        delete: 'Delete',
        editCharge: 'Edit Charge',
        update: 'Update Charge',
        actions: 'Actions',
        confirmDelete: 'Are you sure you want to delete this charge?',
        validation: {
            validationError: 'Validation Error',
            amountRequired: 'Amount is required and must be greater than 0',
            dateRequired: 'Date is required'
        },
        success: {
            created: 'Charge created successfully',
            updated: 'Charge updated successfully',
            deleted: 'Charge deleted successfully'
        },
        error: {
            createFailed: 'Failed to create charge',
            updateFailed: 'Failed to update charge',
            deleteFailed: 'Failed to delete charge',
            loadFailed: 'Failed to load charges'
        }
    },
    billing: {
        title: 'Billing Management',
        menuTitle: 'Billing',
        subtitle: 'Manage billing runs and view billing history',
        billingRun: 'Billing Run',
        history: 'History',
        selectPeriod: 'Select Billing Period',
        startDate: 'Start Date',
        endDate: 'End Date',
        generatePreview: 'Generate Preview',
        previewResults: 'Preview Results',
        billingPeriod: 'Billing Period',
        member: 'Member',
        type: 'Type',
        description: 'Description',
        amount: 'Amount',
        date: 'Date',
        totalAmount: 'Total Amount',
        totalCharges: 'Total Charges',
        subtotal: 'Subtotal',
        recurringPlans: 'Recurring Plans',
        additionalCharges: 'Additional Charges',
        commitBilling: 'Commit Billing',
        confirmCommit: 'Confirm Billing Commit',
        commitWarning: 'Warning: This action cannot be undone',
        commitWarningDetail: 'This will create charge records and mark existing charges as billed.',
        cancel: 'Cancel',
        billingHistory: 'Billing History',
        billingDate: 'Billing Date',
        createdAt: 'Created At',
        validation: {
            periodRequired: 'Both start and end dates are required',
            endDateAfterStart: 'End date must be after start date'
        },
        success: {
            previewGenerated: 'Billing preview generated successfully',
            committed:
                'Billing committed successfully. Created {charges} new charges and marked {existing} existing charges as billed.'
        },
        error: {
            previewFailed: 'Failed to generate billing preview',
            commitFailed: 'Failed to commit billing run'
        }
    },
    schedules: {
        title: 'Schedule Management',
        menuTitle: 'Schedules',
        subtitle: 'Manage class schedules and recurring events',
        weeklyView: 'Weekly View',
        listView: 'List View',
        newSchedule: 'New Schedule',
        editSchedule: 'Edit Schedule',
        hideEmptySlots: 'Hide Empty Slots',
        showAllSlots: 'Show All Slots',
        deleteConfirmation: 'Delete Confirmation',
        deleteMessage: 'Are you sure you want to delete the schedule for "{name}"?',
        class: 'Class',
        location: 'Location',
        date: 'Date',
        time: 'Time',
        duration: 'Duration',
        instructor: 'Instructor',
        noInstructor: 'No instructor assigned',
        actions: 'Actions',
        startTime: 'Start Time',
        endTime: 'End Time',
        endTimeHelp: 'Automatically calculated from class duration. You can override if needed.',
        startDate: 'Start Date',
        timeOfDay: 'Time of Day',
        maxAttendees: 'Max Attendees',
        maxAttendeesHelp: 'Override class maximum if needed',
        notes: 'Notes',
        notesPlaceholder: 'Add notes about this schedule...',
        recurringPattern: 'Recurring Pattern',
        frequency: 'Frequency',
        interval: 'Interval',
        daysOfWeek: 'Days of Week',
        endDate: 'End Date',
        endDateHelp: 'Leave empty for no end date',
        type: 'Type',
        dates: 'Dates',
        pattern: 'Pattern',
        recurring: 'Recurring',
        noEndDate: 'No end date',
        unlimited: 'Unlimited',
        every: 'Every',
        week: 'week',
        filter: 'Filter',
        schedulesFound: 'schedules found',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        success: {
            created: 'Schedule created successfully',
            updated: 'Schedule updated successfully',
            deleted: 'Schedule deleted successfully'
        },
        error: {
            loadFailed: 'Failed to load schedules',
            createFailed: 'Failed to create schedule',
            updateFailed: 'Failed to update schedule',
            deleteFailed: 'Failed to delete schedule'
        },
        validation: {
            classRequired: 'Class is required',
            locationRequired: 'Location is required',
            startTimeRequired: 'Start time is required',
            startDateRequired: 'Start date is required for recurring schedules',
            timeOfDayRequired: 'Time of day is required for recurring schedules',
            daysRequired: 'At least one day must be selected for recurring schedules',
            validationError: 'Validation Error'
        }
    }
};
