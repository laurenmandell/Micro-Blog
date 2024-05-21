const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const canvas = require('canvas');
const { createCanvas } = require('canvas');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates 
    to perform specific tasks. They enhance the functionality of templates and 
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:
    
    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase 'SAMPLE STRING'}} -> 'sample string'

    2. ifCond:
       - Compares two values for equality and returns a block of content based on 
         the comparison result.
       - Usage example: 
            {{#ifCond value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifCond}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/

// Set up Handlebars view engine with custom helpers
//
app.engine(
    'handlebars',
    expressHandlebars.engine({
        helpers: {
            toLowerCase: function (str) {
                return str.toLowerCase();
            },
            ifCond: function (v1, v2, options) {
                if (v1 === v2) {
                    return options.fn(this);
                }
                return options.inverse(this);
            },
        },
    })
);

app.set('view engine', 'handlebars');
app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'PoemBlog';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//
app.get('/', (req, res) => {
    const posts = getPosts();
    const user = getCurrentUser(req) || {};
    res.render('home', { posts, user, loggedIn: req.session.loggedIn, likeError: req.query.likeError });
});

// Register GET route is used for error response from registration
//
app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes that you must implement

app.get('/post/:id', (req, res) => {
    // Render post detail page
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (post) {
        res.render('post', { post });
    } else {
        res.redirect('/error');
    }
});
app.post('/posts', (req, res) => {
    // Add a new post and redirect to home
    const { title, content } = req.body;
    const user = getCurrentUser(req);
    if (user) {
        addPost(title, content, user);
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});
app.post('/like/:id', (req, res) => {
    // Update post likes
    updatePostLikes(req, res);
});
app.get('/profile', isAuthenticated, (req, res) => {
    // Render profile page
    renderProfile(req, res);
});
app.get('/avatar/:username', (req, res) => {
    // Serve the avatar image for the user
    handleAvatar(req, res);
});
app.post('/register', (req, res) => {
    // Register a new user
    registerUser(req, res);
});
app.post('/login', (req, res) => {
    // Login a user
    loginUser(req, res);
});
app.get('/logout', (req, res) => {
    // Logout the user
    logoutUser(req, res);
});
app.post('/delete/:id', isAuthenticated, (req, res) => {
    // Delete a post if the current user is the owner
    const postIndex = posts.findIndex(p => p.id === parseInt(req.params.id));
    const user = getCurrentUser(req);
    if (postIndex > -1 && user && posts[postIndex].username === user.username) {
        posts.splice(postIndex, 1);
        const referer = req.headers.referer;
        if (referer && referer.includes('/profile')) {
            res.redirect('/profile');
        } else {
            res.redirect('/');
        }
    } else {
        res.redirect('/error');
    }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Starting data for posts and users (generated by ChatGPT)
let posts = [
    {
        id: 1,
        title: 'Whispers of the Wind',
        content: 'In the hush of twilight\'s embrace,\nWhispers of the wind take flight.\nThrough the trees, they softly trace,\nA symphony of the night.',
        username: 'PoetLover',
        timestamp: '2024-01-01 10:00',
        likes: 0
    },
    {
        id: 2,
        title: 'Reflections of Time',
        content: 'Upon the lake of memory,\nTime casts its gentle ripples wide.\nEach moment, a fleeting reverie,\nReflects the paths we stride.',
        username: 'VerseSeeker',
        timestamp: '2024-01-02 12:00',
        likes: 0
    },
    {
        id: 3,
        title: 'Echoes of the Past',
        content: 'In ancient halls of silent stone,\nEchoes of the past remain.\nWhispering tales of the unknown,\nIn a soft, eternal refrain.',
        username: 'HistoryScribe',
        timestamp: '2024-01-03 14:30',
        likes: 0
    },
    {
        id: 4,
        title: 'Moonlit Dreams',
        content: 'Beneath the moon\'s gentle glow,\nDreams unfold in silver light.\nIn the stillness, shadows grow,\nWeaving tales into the night.',
        username: 'NightMuse',
        timestamp: '2024-01-04 09:45',
        likes: 0
    },
    {
        id: 5,
        title: 'Serenade of the Stars',
        content: 'Stars above in their celestial dance,\nSing a song of endless night.\nIn their glow, our hearts enhance,\nA serenade of pure delight.',
        username: 'CelestialBard',
        timestamp: '2024-01-05 18:20',
        likes: 0
    }
];

let users = [
    {
        id: 1,
        username: 'PoetLover',
        avatar_url: undefined, // You can specify an avatar URL if available
        memberSince: '2024-01-01 08:00'
    },
    {
        id: 2,
        username: 'VerseSeeker',
        avatar_url: undefined, // You can specify an avatar URL if available
        memberSince: '2024-01-02 09:00'
    },
    {
        id: 3,
        username: 'HistoryScribe',
        avatar_url: undefined, // You can specify an avatar URL if available
        memberSince: '2024-01-03 10:30'
    },
    {
        id: 4,
        username: 'NightMuse',
        avatar_url: undefined, // You can specify an avatar URL if available
        memberSince: '2024-01-04 11:45'
    },
    {
        id: 5,
        username: 'CelestialBard',
        avatar_url: undefined, // You can specify an avatar URL if available
        memberSince: '2024-01-05 13:20'
    }
];


// Function to find a user by username
function findUserByUsername(username) {
    // Return user object if found, otherwise return undefined
    return users.find(user => user.username === username);
}

// Function to find a user by user ID
function findUserById(userId) {
    // Return user object if found, otherwise return undefined
    return users.find(user => user.id === userId);
}

// Function to add a new user
function addUser(username) {
    // Create a new user object and add to users array
    const newUser = { id: users.length + 1, username, avatar_url: undefined, memberSince: formatDate(new Date()) };
    users.push(newUser);
    return newUser;
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to register a user
function registerUser(req, res) {
    // Register a new user and redirect appropriately
    const { username } = req.body;
    console.log("Attempting to register:", username);
    if (!findUserByUsername(username)) {
        const newUser = addUser(username);
        console.log("Added new user:", username);
        req.session.userId = newUser.id;
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.redirect('/register?error=Username+already+exists')
    }
}

// Function to login a user
function loginUser(req, res) {
    // Login a user and redirect appropriately
    const { username } = req.body;
    const user = findUserByUsername(username);
    if (user) {
        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.redirect('/login?error=Invalid+username');
    }
}

// Function to logout a user
function logoutUser(req, res) {
    // Destroy session and redirect appropriately
    req.session.destroy((err) => {
        if (err) {
            console.error('Failed to destroy session:', err);
            return res.status(500).send('Failed to logout');
        }
        res.clearCookie('connect.sid', {
            path: '/'
        });
        res.redirect('/');
    });
}

// Function to render the profile page
function renderProfile(req, res) {
    // Fetch user posts and render the profile page
    const user = getCurrentUser(req);
    if (user) {
        const userPosts = posts.filter(post => post.username === user.username);
        res.render('profile', { user, posts: userPosts });
    } else {
        res.redirect('/login');
    }
}

// Function to update post likes
function updatePostLikes(req, res) {
    // Increment post likes if conditions are met
    const postId = parseInt(req.params.id);
    const post = posts.find(p => p.id === postId);
    const user = getCurrentUser(req);
    if (post && user && post.username !== user.username) {
        post.likes += 1;
        res.redirect('back'); // Redirect back to the referring page
    } else {
        const referer = req.headers.referer;
        if (referer) {
            res.redirect(`${referer}?likeError=You cannot like your own post or like while not logged in.`);
        } else {
            res.redirect('/?likeError=You cannot like your own post or like while not logged in.');
        }
    }
}

// Function to handle avatar generation and serving
function handleAvatar(req, res) {
    // Generate and serve the user's avatar image
    const username = req.params.username;
    const letter = username.charAt(0).toUpperCase();
    const imgBuffer = generateAvatar(letter);
    res.setHeader('Content-Type', 'image/png');
    res.send(imgBuffer);
}

// Function to get the current user from session
function getCurrentUser(req) {
    // Return the user object if the session user ID matches
    return findUserById(req.session.userId);
}

// Function to get all posts, sorted by latest first
function getPosts() {
    return posts.slice().reverse();
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Function to add a new post
function addPost(title, content, user) {
    // Create a new post object and add to posts array

    const newPost = {
        id: posts.length + 1,
        title,
        content,
        username: user.username,
        timestamp: formatDate(new Date()),
        likes: 0
    };
    posts.push(newPost);
}

// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {
    // Generate an avatar image with a letter
    // Steps:
    // 1. Choose a color scheme based on the letter
    // 2. Create a canvas with the specified width and height
    // 3. Draw the background color
    // 4. Draw the letter in the center
    // 5. Return the avatar as a PNG buffer
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F033FF', '#FF33A6'];
    const backgroundColor = colors[letter.charCodeAt(0) % colors.length];
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    // Draw background
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    // Draw letter
    context.font = `${width / 2}px Arial`;
    context.fillStyle = '#FFFFFF';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(letter, width / 2, height / 2);

    return canvas.toBuffer('image/png');
}
