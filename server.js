const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
// Serve frontend files 
// Ye line Express ko batati hai ki HTML files public folder mein hain.
app.use(cors({
    origin: 'https://ibm-ai-chatbot-public.vercel.app',
    credentials: true
}));

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'chatbot-dev-secret-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: true,
        sameSite:'none',
        maxAge: 1000 * 60 * 60
    }
}));

app.use(express.static(path.join(__dirname, 'public')));
// Connect to SQLite database 


const db = new Database(path.join(__dirname, 'chatbot.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL
    );

    INSERT INTO knowledge_base (question, answer)
    SELECT 'What is IBM Cloud?',
           'IBM Cloud is a cloud computing platform that provides infrastructure, platform, and software services.'
    WHERE NOT EXISTS (
        SELECT 1 FROM knowledge_base WHERE question = 'What is IBM Cloud?'
    );

    INSERT INTO knowledge_base (question, answer)
    SELECT 'What is IaaS?',
           'Infrastructure as a Service (IaaS) provides virtual servers, storage, and networking over the internet.'
    WHERE NOT EXISTS (
        SELECT 1 FROM knowledge_base WHERE question = 'What is IaaS?'
    );

    INSERT INTO knowledge_base (question, answer)
    SELECT 'What is PaaS?',
           'Platform as a Service (PaaS) provides a platform to develop, test, and deploy applications.'
    WHERE NOT EXISTS (
        SELECT 1 FROM knowledge_base WHERE question = 'What is PaaS?'
    );

    INSERT INTO knowledge_base (question, answer)
    SELECT 'What is SaaS?',
           'Software as a Service (SaaS) allows users to access software over the internet without installing and managing it themselves.'
    WHERE NOT EXISTS (
        SELECT 1 FROM knowledge_base WHERE question = 'What is SaaS?'
    );

    INSERT INTO knowledge_base (question, answer)
    SELECT 'What is Cloud Computing?',
           'Cloud computing provides computing resources such as servers, storage, databases, and software over the internet.'
    WHERE NOT EXISTS (
        SELECT 1 FROM knowledge_base WHERE question = 'What is Cloud Computing?'
    );

    INSERT INTO knowledge_base (question, answer)
    SELECT 'What is a Hybrid Cloud?',
           'A hybrid cloud combines private cloud infrastructure with public cloud services.'
    WHERE NOT EXISTS (
        SELECT 1 FROM knowledge_base WHERE question = 'What is a Hybrid Cloud?'
    );
`);



// Create users table
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        enrollment TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);


// Create chat history table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_message TEXT NOT NULL,
        bot_reply TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);
// Jab student signup form bharega, toh 
// uska naam, enrollment number aur password database mein save hoga.
console.log('SQLite database connected successfully!');

app.post('/api/signup', (req, res) => {
    try {
        const { name, enrollment, password } = req.body;

        if (!name || !enrollment || !password) {
            return res.status(400).json({
                error: 'Name, enrollment number and password are required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long'
            });
        }

        const existingUser = db.prepare(
            'SELECT id FROM users WHERE enrollment = ?'
        ).get(enrollment.trim());

        if (existingUser) {
            return res.status(409).json({
                error: 'This enrollment number is already registered'
            });
        }

        const passwordHash = bcrypt.hashSync(password, 10);

        const result = db.prepare(`
            INSERT INTO users (name, enrollment, password_hash)
            VALUES (?, ?, ?)
        `).run(name.trim(), enrollment.trim(), passwordHash);

        return res.status(201).json({
            message: 'Account created successfully!',
            userId: result.lastInsertRowid
        });

    } catch (error) {
        console.error('Signup error:', error);

        return res.status(500).json({
            error: 'Signup failed due to a server error'
        });
    }
});


app.post('/api/login', (req, res) => {
    try {
        const { enrollment, password } = req.body;

        if (!enrollment || !password) {
            return res.status(400).json({
                error: 'Enrollment number and password are required'
            });
        }

        const user = db.prepare(`
            SELECT id, name, enrollment, password_hash
            FROM users
            WHERE enrollment = ?
        `).get(enrollment.trim());

        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({
                error: 'Invalid enrollment number or password'
            });
        }

        req.session.userId = user.id;
        req.session.userName = user.name;

        req.session.save((error) => {
            if (error) {
                console.error('Session save error:', error);
                return res.status(500).json({
                    error: 'Could not create login session'
                });
            }

            res.json({
                message: 'Login successful!',
                user: {
                    id: user.id,
                    name: user.name,
                    enrollment: user.enrollment
                }
            });
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed due to a server error'
        });
    }
});


app.get('/api/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            loggedIn: false,
            message: 'Please login first.'
        });
    }

    res.json({
        loggedIn: true,
        user: {
            id: req.session.userId,
            name: req.session.userName
        }
    });
});




// Chat API Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                error: 'Message is required'
            });
        }

        
let botReply = '';
const query = message.toLowerCase();

// Search the knowledge base first
const searchText = message.trim().toLowerCase();

let knowledge = null;

if (searchText.includes('iaas')) {
    knowledge = db.prepare(`
        SELECT answer FROM knowledge_base
        WHERE LOWER(question) LIKE '%iaas%'
        LIMIT 1
    `).get();
} else if (searchText.includes('paas')) {
    knowledge = db.prepare(`
        SELECT answer FROM knowledge_base
        WHERE LOWER(question) LIKE '%paas%'
        LIMIT 1
    `).get();
} else if (searchText.includes('saas')) {
    knowledge = db.prepare(`
        SELECT answer FROM knowledge_base
        WHERE LOWER(question) LIKE '%saas%'
        LIMIT 1
    `).get();
} else {
    knowledge = db.prepare(`
        SELECT answer FROM knowledge_base
        WHERE LOWER(question) = ?
        LIMIT 1
    `).get(searchText);
}


if (knowledge) {
    botReply = knowledge.answer;
} else if (query.includes('ibm') || query.includes('cloud')) {
    botReply = 'IBM Cloud provides cloud computing services, including IaaS, PaaS and SaaS, through public, private and hybrid cloud models.';
} else if (query.includes('hello') || query.includes('hi')) {
    botReply = 'Hello! I am your IBM Cloud AI Assistant. How can I help you today?';
} else if (query.includes('name')) {
    botReply = 'I am an intelligent cloud chatbot for your IBM Cloud project.';
} else {
    botReply = `You searched for: "${message}". I could not find an exact match in my knowledge base yet.`;
}

        // Save user message and bot reply to SQLite
        const saveChat = db.prepare(`
            INSERT INTO chat_history (user_message, bot_reply)
            VALUES (?, ?)
        `);

        saveChat.run(message.trim(), botReply);

        res.json({ reply: botReply });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start server
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

