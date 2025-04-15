# PoemBlog
PoemBlog is a serene, nature-inspired microblogging platform designed for poets and poetry enthusiasts. It provides a peaceful space to share original poems, explore the work of others, and connect with a supportive creative community.
## Features
### Authentication & OAuth
- OAuth login with Google using Passport.js
- Secure login/register flow
- Unique username validation
- Logout confirmation screen
- Automatically redirect users to complete profile setup if needed
### Post Management
- Create, like, edit, and delete posts
- Live like count updates (no page refresh)
- Emoji picker with search and hover labels
- Responsive design for desktop and mobile
### User Profiles
- View personal posts
- Delete own posts
- See profile info: avatar, username, member since
- Delete entire account with confirmation prompt
### Persistent Data with SQLite
- User and post data stored in SQLite
- All actions reflect persistent state
- Secure credential management with environment variables
### Sorting Functionality
- Sort posts by:
  - Recency: New to Old / Old to New
  - Likes: High to Low / Low to High
### Themed UI
- Nature-inspired aesthetics (green/earthy tones)
- Custom avatars based on username initials
- Paper-textured background
- Flower-inspired logo and favicon
## Technologies Used
- Backend: Express.js, SQLite, Passport.js, dotenv
- Frontend: Handlebars, vanilla JS, CSS
- Authentication: OAuth 2.0 (Google)
## Screenshots
### Authentication & Profile
### Home Page
### Emoji Picker & Sorting
