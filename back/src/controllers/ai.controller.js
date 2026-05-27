const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini API (Uses GEMINI_API_KEY from environment variables)
const apiKey = process.env.GEMINI_API_KEY || "VOTRE_CLE_API_GEMINI";
const genAI = new GoogleGenerativeAI(apiKey);

// 1. Assistant Intelligent (Chatbot)
exports.chat = async (req, res, next) => {
  try {
    const { message, history } = req.body;
    
    if (!message) {
      return res.status(400).json({ succes: false, message: "Le message est requis" });
    }

    // Define the system instructions based on auth
    const isVisitor = !req.headers.authorization;
    const systemInstruction = isVisitor
      ? "Vous êtes l'assistant IA du laboratoire de recherche LR16CNSTN02. Vous discutez avec un visiteur public. Répondez de manière très brève. Vous ne devez répondre qu'aux questions concernant le laboratoire, le nucléaire, les rayonnements, et les informations publiques. Refusez de répondre à tout autre sujet de manière polie."
      : "Vous êtes l'assistant IA du laboratoire de recherche LR16CNSTN02. Vous discutez avec un chercheur/membre du laboratoire. Répondez de manière professionnelle. Vous devez vous concentrer uniquement sur les projets de recherche, les articles scientifiques, et l'administration du laboratoire. Refusez les questions hors contexte.";

    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest", 
      systemInstruction: systemInstruction 
    });
    
    // Convert generic history to Gemini format if provided
    const chatHistory = history ? history.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    })) : [];

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message);
    const response = await result.response;
    
    res.json({
      succes: true,
      donnees: {
        reply: response.text()
      }
    });
  } catch (error) {
    console.error("AI CHAT ERROR:", error);
    next(error);
  }
};

// 2. Résumé Automatique d'Article
exports.summarizeArticle = async (req, res, next) => {
  try {
    const { articleText } = req.body;
    
    if (!articleText) {
      return res.status(400).json({ succes: false, message: "Le texte de l'article est requis" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `Résumez l'article scientifique suivant en français de manière professionnelle et donnez 3 suggestions de mots-clés ou d'amélioration à la fin.\n\nArticle:\n${articleText}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    res.json({
      succes: true,
      donnees: {
        summary: response.text()
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Recherche Sémantique (Simulation d'Embeddings + Fetch)
exports.semanticSearch = async (req, res, next) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ succes: false, message: "La requête est requise" });
    }

    // In a real DB scenario, we would use 'text-embedding-004' to embed the query 
    // and do a cosine similarity search on the database. 
    // For demonstration, we will ask Gemini to generate relevant dummy results based on the query.
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `Générez 3 faux résultats d'articles scientifiques en français (Titre, Auteur, Snippet, et un Score de pertinence entre 85% et 99%) qui correspondent sémantiquement à cette recherche : "${query}". Formattez la réponse en JSON strict sans markdown, avec la structure: [{ "title": "...", "author": "...", "snippet": "...", "score": 95 }].`;
    
    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    let articles = [];
    try {
      articles = JSON.parse(text);
    } catch(e) {
      // Fallback
      articles = [
        { title: "Résultat simulé 1", author: "Dr. Ahmed", snippet: "Article sur " + query, score: 98 },
        { title: "Résultat simulé 2", author: "Dr. Sarah", snippet: "Analyse détaillée de " + query, score: 92 }
      ];
    }

    res.json({
      succes: true,
      donnees: {
        results: articles
      }
    });
  } catch (error) {
    next(error);
  }
};
