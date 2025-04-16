# PoemBlog
A microblogging platform for poets and poetry enthusiasts
## Tech Stack
- Frontend: HTML/CSS, Handlebars, vanilla JS
- Backend: Express.js, SQLite, Passport.js
- Authentication: Google OAuth 2.0
## Theme & Vision
- Inspired by nature and handwritten poetry
- Soft colors, paper textures, and floral icons create a calm space for creative expression
## Authentication
- Secured login via Google OAuth for seamless authentication
- Enforced unique username creation with real-time database validation
- Only authenticated users can create posts, like others' posts, and delete their own posts.
## Home Page
The home page dynamically updates based on login status and adapts its layout for desktop and mobile.
### Logged Out
![image](https://github.com/user-attachments/assets/021e202a-7286-4395-848a-abab8f71b18a)
### Logged In
#### Desktop View
![image](https://github.com/user-attachments/assets/72aaabc3-c2b0-4518-8075-105787933219)
#### Mobile View
![image](https://github.com/user-attachments/assets/5a98916e-4db6-4e37-9e2a-755b6815a710)
## Post Interaction
PoemBlog supports core post-related functionalities, including creation, editing, deletion, liking, and sorting.
### Creating Posts
Users can create a new post by entering a title and writing the body of their poem. An integrated emoji menu provides access to 200 emojis, complete with a search bar and hover labels for easier selection.
![image](https://github.com/user-attachments/assets/b5733b4b-0139-4c59-87da-9aac3170fe7a)
![image](https://github.com/user-attachments/assets/b8cdc69f-519f-483a-8c59-4d0dd3b13b7a)
### Managing Posts
Users can edit the title and content of their own posts at any time. The time stamp of the post is updated to reflect the latest edit. Both editing and deletion capabilities are restricted to the original author, ensuring proper content ownership.
![image](https://github.com/user-attachments/assets/b47752ef-6f56-4579-9d85-47cddc9f3be6)
![image](https://github.com/user-attachments/assets/72af1310-67d9-4934-89e5-e733303197ed)
![image](https://github.com/user-attachments/assets/76552c5d-a5e8-4b0a-9a12-ce334fd20ef7)
### Liking Posts
Users can like posts made by others but cannot like their own posts.
### Sorting Posts
A drop-down menu allows users to sort posts by recency or number of likes.

![image](https://github.com/user-attachments/assets/387aca40-d523-41e5-8846-7c9988264cdb)
## Profile Page
The profile page displays only the user's own posts and provides options to manage them. Users can also permanently delete their account, which removes all the user's records and posts from the database.
![image](https://github.com/user-attachments/assets/41976e18-901f-45c5-a86e-88621244d69c)
