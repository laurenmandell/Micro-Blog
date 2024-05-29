// populatedb.js

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

// Placeholder for the database file name
const dbFileName = 'microblog.db';
// const dbFilePath = process.env.DB_FILE_PATH || path.join(__dirname, 'microblog.db');

async function initializeDB() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashedGoogleId TEXT NOT NULL UNIQUE,
            avatar_url TEXT,
            memberSince DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes INTEGER NOT NULL
        );
    `);

    // Sample data - Replace these arrays with your own data
    const users = [
        {
            id: 1,
            username: 'PoetLover',
            avatar_url: undefined, // You can specify an avatar URL if available
            hashedGoogleId: 'hashedGoogleId1',
            memberSince: '2024-01-01 08:00'
        },
        {
            id: 2,
            username: 'VerseSeeker',
            avatar_url: undefined, // You can specify an avatar URL if available
            hashedGoogleId: 'hashedGoogleId2',
            memberSince: '2024-01-02 09:00'
        },
        {
            id: 3,
            username: 'HistoryScribe',
            avatar_url: undefined, // You can specify an avatar URL if available
            hashedGoogleId: 'hashedGoogleId3',
            memberSince: '2024-01-03 10:30'
        },
        {
            id: 4,
            username: 'NightMuse',
            avatar_url: undefined, // You can specify an avatar URL if available
            hashedGoogleId: 'hashedGoogleId4',
            memberSince: '2024-01-04 11:45'
        },
        {
            id: 5,
            username: 'CelestialBard',
            avatar_url: undefined, // You can specify an avatar URL if available
            hashedGoogleId: 'hashedGoogleId5',
            memberSince: '2024-01-05 13:20'
        }
    ];

    const posts = [
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

    // Insert sample data into the database
    await Promise.all(users.map(user => {
        return db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince]
        );
    }));

    await Promise.all(posts.map(post => {
        return db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
            [post.title, post.content, post.username, post.timestamp, post.likes]
        );
    }));

    console.log('Database populated with initial data.');
    await db.close();
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});
