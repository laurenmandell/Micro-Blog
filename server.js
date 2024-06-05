const express = require("express");
const dotenv = require("dotenv");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const expressHandlebars = require("express-handlebars");
const session = require("express-session");
const canvas = require("canvas");
const { createCanvas } = require("canvas");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const crypto = require("crypto");

// Load environment variables from .env file
dotenv.config();

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
      isUndefined: function (value) {
        return typeof value === "undefined";
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

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: `http://localhost:${PORT}/auth/google/callback`,
    },
    async (token, tokenSecret, profile, done) => {
      try {
        const hashedGoogleId = hashGoogleId(profile.id);
        let user = await findUserBy("hashedGoogleId", hashedGoogleId);
        let needsToSetUsername = await findUserBy("username", hashedGoogleId);
        if (!user) {
          const userId = await createUser(hashedGoogleId);
          user = await findUserBy("id", userId);
          user.isNewUser = true;
        } else if (needsToSetUsername) {
          user.isNewUser = true;
        } else {
          user.isNewUser = false;
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, {
    hashedGoogleId: user.hashedGoogleId,
    isNewUser: user.isNewUser,
  });
});

passport.deserializeUser((obj, done) => {
  findUserBy("hashedGoogleId", obj.hashedGoogleId)
    .then((user) => {
      if (user) {
        user.isNewUser = obj.isNewUser; // Attach isNewUser property
        done(null, user);
      } else {
        done(new Error("User not found"));
      }
    })
    .catch((err) => done(err));
});

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
      const sortCriteria = req.query.sort || "recency-desc";
      const posts = await getPosts(sortCriteria);
      const user = await findUserBy("id", req.session.userId);
      res.render("home", {
        posts,
        user,
        sort: sortCriteria,
        loggedIn: req.session.loggedIn,
        likeError: req.query.likeError,
      });
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.redirect("/error");
    }
  });

  // Initiates the login process using the Google OAuth provider
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile"] }),
  );

  // Handles the response from Google after the user has logged in and authorized your application
  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      req.session.userId = req.user.id;
      req.session.loggedIn = true;
      if (req.session.passport.user.isNewUser) {
        // Redirect new users to the username registration page
        res.redirect("/registerUsername");
      } else {
        // Redirect existing users to the home page
        res.redirect("/");
      }
    },
  );

  app.get("/registerUsername", isAuthenticated, (req, res) => {
    res.render("registerUsername", {
      user: req.session.passport.user.hashedGoogleId,
      regError: req.query.error,
    });
  });

  app.post("/registerUsername", isAuthenticated, async (req, res) => {
    const { username } = req.body;
    const hashedGoogleId = req.session.passport.user.hashedGoogleId;
    try {
      const existingUser = await findUserBy("username", username);
      if (existingUser) {
        res.redirect("/registerUsername?error=Username+already+exists");
      } else {
        await setUsernameForUser(hashedGoogleId, username);
        res.redirect("/");
      }
    } catch (error) {
      console.error("Error registering user:", error);
      res.redirect("/error");
    }
  });

  app.get("/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/googleLogout");
    });
  });

  app.get("/googleLogout", (req, res) => {
    res.render("googleLogout");
  });

  // Login route GET route
  //
  app.get("/login", (req, res) => {
    res.render("loginRegister");
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
      res.redirect("/error");
    }
  });

  app.post("/posts", async (req, res) => {
    // Add a new post and redirect to home
    const { title, content } = req.body;
    const user = await findUserBy("id", req.session.userId);

    if (user) {
      const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      try {
        await db.run(
          "INSERT INTO posts (title, content, username, timestamp, likes, isEdited) VALUES (?, ?, ?, ?, ?, ?)",
          [title, content, user.username, timestamp, 0, 0],
        );
        res.redirect("/");
      } catch (error) {
        console.error("Error creating post:", error);
        res.redirect("/error");
      }
    } else {
      res.redirect("/login");
    }
  });

  app.put("/edit/:id", isAuthenticated, async (req, res) => {
    try {
      const { title, content } = req.body;
      const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const post = await getPostById(req.params.id);
      const user = await findUserBy("id", req.session.userId);
      if (post && user && post.username === user.username) {
        await db.run(
          "UPDATE posts SET title = ?, content = ?, timestamp = ?, isEdited = ? WHERE id = ?",
          [title, content, timestamp, 1, req.params.id],
          function (err) {
            if (err) {
              console.error("Error updating post:", err);
              res.redirect("/error");
            } else {
              res.status(200).json({ message: "Post edited successfully" });
            }
          },
        );
      } else {
        res.redirect("/error");
      }
    } catch (error) {
      console.error("Error editing post:", error);
      res.redirect("/error");
    }
  });

  app.post("/like/:id", async (req, res) => {
    try {
      const post = await getPostById(req.params.id);
      const user = await findUserBy("id", req.session.userId);
      if (post && user && post.username !== user.username) {
        await db.run("UPDATE posts SET likes = likes + 1 WHERE id = ?", [
          req.params.id,
        ]);
        res.status(200).json({ message: "Post liked successfully" });
      } else {
        res.status(403).json({
          message: "You cannot like posts while not logged in.",
        });
      }
    } catch (error) {
      console.error("Error liking post:", error);
      res.redirect("/error");
    }
  });

  app.get("/profile", isAuthenticated, async (req, res) => {
    // Render profile page
    try {
      const user = await findUserBy("id", req.session.userId);
      if (user) {
        const sortCriteria = req.query.sort || "recency-desc";
        const userPosts = await getUserPosts(user.username, sortCriteria);
        res.render("profile", { user, posts: userPosts, sort: sortCriteria });
      } else {
        res.redirect("/login");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.redirect("/error");
    }
  });

  app.get("/avatar/:username", (req, res) => {
    // Serve the avatar image for the user
    handleAvatar(req, res);
  });
  app.post("/delete/:id", isAuthenticated, async (req, res) => {
    // Delete a post if the current user is the owner
    try {
      const post = await getPostById(req.params.id);
      const user = await findUserBy("id", req.session.userId);
      if (post && user && post.username === user.username) {
        await db.run("DELETE FROM posts WHERE id = ?", [req.params.id]);
        res.status(200).json({ message: "Post deleted successfully" });
      } else {
        res.redirect("/error");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      res.redirect("/error");
    }
  });

  app.delete("/deleteAccount", isAuthenticated, async (req, res) => {
    try {
      const user = await findUserBy("id", req.session.userId);

      // Delete all user's posts
      await db.run("DELETE FROM posts WHERE username = ?", [user.username]);

      // Delete the user's account
      await db.run("DELETE FROM users WHERE username = ?", [user.username]);

      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ message: "Error destroying session" });
        }
        res.status(200).json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.redirect("/error");
    }
  });

  // Emoji API route
  app.get("/api/emojis", async (req, res) => {
    try {
      const response = await fetch(
        `https://emoji-api.com/emojis?access_key=${process.env.EMOJI_KEY}`,
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching emojis:", error);
      res.redirect("/error");
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

// Function to hash googleId
function hashGoogleId(googleId) {
  return crypto.createHash("sha256").update(googleId).digest("hex");
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect("/login");
  }
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
  const colors = [
    "#B59D3A",
    "#BF5F50",
    "#4CA3A3",
    "#B886BA",
    "#D16A47",
    "#A7A37E",
    "#6D7993",
  ];
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

// Function to find a user by a certain field
async function findUserBy(field, value) {
  const query = `SELECT * FROM users WHERE ${field} = ?`;
  return new Promise((resolve, reject) => {
    db.get(query, [value], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Function to create a new user
async function createUser(hashedGoogleId) {
  const memberSince = new Date().toISOString().slice(0, 16).replace("T", " ");
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO users (username, hashedGoogleId, memberSince) VALUES (?, ?, ?)",
      [hashedGoogleId, hashedGoogleId, memberSince],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      },
    );
  });
}

// Function to set the username for a user
async function setUsernameForUser(hashedGoogleId, username) {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE users SET username = ? WHERE hashedGoogleId = ?",
      [username, hashedGoogleId],
      function (err) {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}

const getOrderByClause = (sortCriteria) => {
  let orderByClause;

  switch (sortCriteria) {
    case "recency-desc":
      orderByClause = "ORDER BY timestamp DESC";
      break;
    case "recency-asc":
      orderByClause = "ORDER BY timestamp ASC";
      break;
    case "likes-desc":
      orderByClause = "ORDER BY likes DESC";
      break;
    case "likes-asc":
      orderByClause = "ORDER BY likes ASC";
      break;
    default:
      orderByClause = "ORDER BY timestamp DESC";
      break;
  }
  return orderByClause;
};

const getPosts = (sortCriteria) => {
  const orderByClause = getOrderByClause(sortCriteria);
  const query = `SELECT * FROM posts ${orderByClause}`;
  return new Promise((resolve, reject) => {
    db.all(query, (err, rows) => {
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

const getUserPosts = (username, sortCriteria) => {
  const orderByClause = getOrderByClause(sortCriteria);
  const query = `SELECT * FROM posts WHERE username = ? ${orderByClause}`;
  return new Promise((resolve, reject) => {
    db.all(query, [username], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};
