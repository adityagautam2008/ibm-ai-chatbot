const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Chat API Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        let botReply = "";

        // Yahan aap apna IBM watsonx AI ya OpenAI/Google Gemini API integration laga sakte hain
        // Example logic for intelligent search/reply simulation:
        const query = message.toLowerCase();
        
        if (query.includes('ibm') || query.includes('cloud')) {
            botReply = "IBM Cloud is a set of cloud computing services for business offered by US-based information technology company IBM. It provides Infrastructure as a Service (IaaS), Software as a Service (SaaS) and Platform as a Service (PaaS) through public, private and hybrid cloud models.";
        } else if (query.includes('hello') || query.includes('hi')) {
            botReply = "Hello! I am your IBM Cloud AI Assistant. How can I help you search for answers today?";
        } else if (query.includes('name')) {
            botReply = "I am an intelligent cloud chatbot deployed for your IBM Cloud project.";
        } else {
            // Generic AI search simulation response
            botReply = `You searched for: "${message}". Based on my knowledge base, here is the relevant information: This is a dynamic query response generated live by your IBM Cloud application backend. You can connect this to Watsonx Discovery or Assistant for deep enterprise search!`;
        }

        // Simulate network delay for natural feel
        setTimeout(() => {
            res.json({ reply: botReply });
        }, 500);

    } catch (error) {
        console.h('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});