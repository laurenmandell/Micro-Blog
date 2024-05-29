const express = require("express");
const dotenv = require("dotenv");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const expressHandlebars = require("express-handlebars");
const session = require("express-session");
const canvas = require("canvas");
const { createCanvas } = require("canvas");

// Load environment variables from .env file
dotenv.config();

// Use environment vairables for OAuth client ID and secret
const oaughClientID = process.env.CLIENT_ID;
const oathClientSecret = process.env.CLIENT_SECRET;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = process.env.PORT || 3000;
const dbFilePath =
    process.env.DB_FILE_PATH || path.join(__dirname, "microblog.db");
let db;

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
    "handlebars",
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
    }),
);

app.set("view engine", "handlebars");
app.set("views", "./views");

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: "oneringtorulethemall", // Secret key to sign the session ID cookie
        resave: false, // Don't save session if unmodified
        saveUninitialized: false, // Don't create session until something stored
        cookie: { secure: false }, // True if using https. Set to false for development without https
    }),
);

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files.
//
app.use((req, res, next) => {
    res.locals.appName = "PoemBlog";
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = "Post";
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || "";
    next();
});

app.use(express.static("public")); // Serve static files
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json()); // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Database Initialization
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const initializeDB = async () => {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbFilePath, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log("Connected to the SQLite database.");
                resolve(db);
            }
        });
    });
};

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function registerRoutes() {
    // Home route: render home view with posts and user
    // We pass the posts and user variables into the home
    // template
    //
    app.get("/", async (req, res) => {
        try {
            const posts = await getPosts();
            const user = await findUserByUserId(req.session.userId);
            res.render("home", {
                posts,
                user,
                loggedIn: req.session.loggedIn,
                likeError: req.query.likeError,
            });
        } catch (error) {
            console.error("Error fetching posts:", error);
            res.status(500).send("Error fetching posts");
        }
    });

    // Register GET route is used for error response from registration
    //
    app.get("/register", (req, res) => {
        res.render("loginRegister", { regError: req.query.error });
    });

    // Login route GET route is used for error response from login
    //
    app.get("/login", (req, res) => {
        res.render("loginRegister", { loginError: req.query.error });
    });

    // Error route: render error page
    //
    app.get("/error", (req, res) => {
        res.render("error");
    });

    // Additional routes that you must implement

    app.get("/post/:id", async (req, res) => {
        // Render post detail page
        try {
            const post = await getPostById(req.params.id);
            if (post) {
                res.render("post", { post });
            } else {
                res.redirect("/error");
            }
        } catch (error) {
            console.error("Error fetching post:", error);
            res.status(500).send("Error fetching post");
        }
    });

    app.post("/posts", async (req, res) => {
        // Add a new post and redirect to home
        const { title, content } = req.body;
        const user = await findUserByUserId(req.session.userId);

        if (user) {
            const timestamp = new Date().toISOString();
            try {
                await db.run(
                    "INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)",
                    [title, content, user.username, timestamp, 0],
                );
                res.redirect("/");
            } catch (error) {
                console.error("Error creating post:", error);
                res.status(500).send("Error creating post");
            }
        } else {
            res.redirect("/login");
        }
    });

    app.post("/like/:id", async (req, res) => {
        try {
            const post = await getPostById(req.params.id);
            const user = await findUserByUserId(req.session.userId);
            if (post && user && post.username !== user.username) {
                await db.run("UPDATE posts SET likes = likes + 1 WHERE id = ?", [
                    req.params.id,
                ]);
                res.redirect("back"); // Redirect back to the referring page
            } else {
                const referer = req.headers.referer;
                if (referer) {
                    res.redirect(
                        `${referer}?likeError=You cannot like your own post or like while not logged in.`,
                    );
                } else {
                    res.redirect(
                        "/?likeError=You cannot like your own post or like while not logged in.",
                    );
                }
            }
        } catch (error) {
            console.error("Error liking post:", error);
            res.status(500).send("Error liking post");
        }
    });

    app.get("/profile", isAuthenticated, async (req, res) => {
        // Render profile page
        try {
            const user = await findUserByUserId(req.session.userId);
            console.log(user);
            if (user) {
                const userPosts = await getUserPosts(user.username);
                res.render("profile", { user, posts: userPosts });
            } else {
                res.redirect("/login");
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            res.status(500).send("Error fetching user profile");
        }
    });
    app.get("/avatar/:username", (req, res) => {
        // Serve the avatar image for the user
        handleAvatar(req, res);
    });
    app.post("/register", (req, res) => {
        // Register a new user
        registerUser(req, res);
    });
    app.post("/login", (req, res) => {
        // Login a user
        loginUser(req, res);
    });
    app.get("/logout", (req, res) => {
        // Logout the user
        logoutUser(req, res);
    });
    app.post("/delete/:id", isAuthenticated, async (req, res) => {
        // Delete a post if the current user is the owner
        try {
            const post = await getPostById(req.params.id);
            const user = await findUserByUserId(req.session.userId);
            if (post && user && post.username === user.username) {
                await db.run("DELETE FROM posts WHERE id = ?", [req.params.id]);
                const referer = req.headers.referer;
                if (referer && referer.includes("/profile")) {
                    res.redirect("/profile");
                } else {
                    res.redirect("/");
                }
            } else {
                res.redirect("/error");
            }
        } catch (error) {
            console.error("Error deleting post:", error);
            res.status(500).send("Error deleting post");
        }
    });
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/*
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
*/

const startServer = async () => {
    try {
        await initializeDB();
        registerRoutes();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Failed to initialize database:", err);
        process.exit(1);
    }
};

startServer();
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.redirect("/login");
    }
}

// Function to register a user
async function registerUser(req, res) {
    const { username } = req.body;
    try {
        const existingUser = await findUserByUsername(username);
        if (!existingUser) {
            const memberSince = new Date().toISOString();
            const hashedGoogleId =
                "hashedGoogleId" + Math.floor(Math.random() * 1000) + 1;
            await db.run(
                "INSERT INTO users (username, avatar_url, hashedGoogleId, memberSince) VALUES (?, ?, ?, ?)",
                [username, "", hashedGoogleId, memberSince],
            );
            const newUser = await findUserByUsername(username);
            req.session.userId = newUser.id;
            req.session.loggedIn = true;
            res.redirect("/");
        } else {
            res.redirect("/register?error=Username+already+exists");
        }
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send("Error registering user");
    }
}

// Function to login a user
async function loginUser(req, res) {
    // Login a user and redirect appropriately
    const { username } = req.body;
    try {
        const user = await findUserByUsername(username);
        if (user) {
            req.session.userId = user.id;
            req.session.loggedIn = true;
            res.redirect("/");
        } else {
            res.redirect("/login?error=Invalid+username");
        }
    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(500).send("Error logging in user");
    }
}

// Function to logout a user
function logoutUser(req, res) {
    // Destroy session and redirect appropriately
    req.session.destroy((err) => {
        if (err) {
            console.error("Failed to destroy session:", err);
            return res.status(500).send("Failed to logout");
        }
        res.clearCookie("connect.sid", {
            path: "/",
        });
        res.redirect("/");
    });
}

// Function to handle avatar generation and serving
function handleAvatar(req, res) {
    // Generate and serve the user's avatar image
    const username = req.params.username;
    const letter = username.charAt(0).toUpperCase();
    const imgBuffer = generateAvatar(letter);
    res.setHeader("Content-Type", "image/png");
    res.send(imgBuffer);
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
    const colors = ["#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF33A6"];
    const backgroundColor = colors[letter.charCodeAt(0) % colors.length];
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    // Draw background
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    // Draw letter
    context.font = `${width / 2}px Arial`;
    context.fillStyle = "#FFFFFF";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(letter, width / 2, height / 2);

    return canvas.toBuffer("image/png");
}

// Function to find a user by username
async function findUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Function to find a user by UserId
async function findUserByUserId(userId) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

const getPosts = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM posts ORDER BY timestamp DESC", (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const getPostById = (id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM posts WHERE id = ?", [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

const getUserPosts = (username) => {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT * FROM posts WHERE username = ? ORDER BY timestamp DESC",
            [username],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            },
        );
    });
};
