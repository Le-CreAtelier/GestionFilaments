document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('sendButton');
    const userInput = document.getElementById('userInput');
    const chatContainer = document.getElementById('chat-container');
    let conversationHistory = []; // Pour stocker l'historique de la conversation

    // URL de votre serveur LM Studio
    const LM_STUDIO_API_URL = 'http://localhost:1234/v1/chat/completions';

    // Fonction pour ajouter un message à la vue du chat
    function addMessageToChat(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.classList.add(sender === 'Vous' ? 'user-message' : 'assistant-message');
        
        const senderP = document.createElement('p');
        senderP.style.fontWeight = 'bold'; // Met le nom de l'expéditeur en gras
        senderP.style.marginBottom = '5px'; // Ajoute un petit espace après le nom
        senderP.textContent = `${sender}:`;
        messageElement.appendChild(senderP);

        if (sender === 'Assistant' && typeof marked === 'function') {
            // Utiliser marked.js pour le message de l'assistant
            // Créer un div temporaire pour parser le HTML et l'ajouter proprement
            const tempDiv = document.createElement('div');
            console.log('Raw AI message for marked.parse:', JSON.stringify(message)); // Log pour débogage
            tempDiv.innerHTML = marked.parse(message.trim(), { gfm: true, breaks: true }); // .trim() et options gfm/breaks
            // Ajouter chaque enfant du div temporaire à messageElement
            // pour éviter d'imbriquer des blocs dans des inlines si marked.js génère des <p>, <ul> etc.
            while (tempDiv.firstChild) {
                messageElement.appendChild(tempDiv.firstChild);
            }
        } else {
            // Pour les messages utilisateur ou si marked.js n'est pas chargé
            const messageContent = document.createElement('div'); // Utiliser un div pour le contenu
            messageContent.textContent = message;
            messageElement.appendChild(messageContent);
        }

        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight; // Auto-scroll
    }

    // Fonction principale pour interroger l'IA
    async function queryLocalAI() {
        const userQuestion = userInput.value;
        if (!userQuestion) return;

        addMessageToChat(userQuestion, "Vous");
        conversationHistory.push({ role: 'user', content: userQuestion });
        userInput.value = '';
        addMessageToChat("<i>L'IA réfléchit...</i>", "Assistant");

        // 1. Collecter les données brutes
        const filamentsData = JSON.parse(localStorage.getItem('filamentsDB') || '[]');
        const spoolsData = JSON.parse(localStorage.getItem('spoolTypes') || '[]');

        // --- NOUVELLE PARTIE : Créer un résumé du contexte ---
        const totalSpools = filamentsData.length;
        const lowStockThreshold = parseInt(localStorage.getItem('lowStockThresholdSetting') || 100);
        const lowStockCount = filamentsData.filter(f => f.remainingWeight <= lowStockThreshold).length;
        const uniqueMaterials = [...new Set(filamentsData.map(f => f.material))];
        const stockValue = filamentsData.reduce((sum, f) => sum + (parseFloat(f.purchasePrice) || 0), 0).toFixed(2);

        const contextSummary = `
        Voici un résumé de l'état actuel du stock de l'utilisateur :
        - Nombre total de bobines : ${totalSpools}
        - Valeur totale du stock : ${stockValue} €
        - Nombre de bobines en stock bas (< ${lowStockThreshold}g) : ${lowStockCount}
        - Matières présentes en stock : ${uniqueMaterials.join(', ')}
        `;

        // --- AJOUT : Logique de filtrage du contexte (conservée et adaptée si besoin) ---
        let contextFilaments = filamentsData;
        const questionLower = userQuestion.toLowerCase();

        const allMaterials = [...new Set(filamentsData.map(f => f.material?.toLowerCase()))].filter(Boolean);
        const allBrands = [...new Set(filamentsData.map(f => f.brand?.toLowerCase()))].filter(Boolean);

        const foundMaterials = allMaterials.filter(m => questionLower.includes(m));
        const foundBrands = allBrands.filter(b => questionLower.includes(b));

        if (foundMaterials.length > 0 || foundBrands.length > 0) {
            contextFilaments = filamentsData.filter(f => {
                const materialMatch = f.material && foundMaterials.includes(f.material.toLowerCase());
                const brandMatch = f.brand && foundBrands.includes(f.brand.toLowerCase());
                return materialMatch || brandMatch;
            });
        }
        // --- FIN DE L'AJOUT ---

        // --- NOUVELLE PARTIE : Analyse de l'utilisation des filaments ---
        function analyzeFilamentUsage() {
            const usageData = {};
            filamentsData.forEach(filament => {
                const initialWeight = parseFloat(filament.initialWeight) || 0;
                const remainingWeight = parseFloat(filament.remainingWeight) || 0;
                const usedWeight = initialWeight - remainingWeight;
                if (usedWeight > 0) {
                    const material = filament.material || 'Inconnu';
                    usageData[material] = (usageData[material] || 0) + usedWeight;
                }
            });
            // Convertir en grammes et formater
            for (const material in usageData) {
                usageData[material] = `${usageData[material].toFixed(0)}g utilisés`;
            }
            return usageData;
        }

        // 2. Préparer le prompt pour l'IA
        const systemPrompt = `Tu es un assistant expert en gestion de filaments d'impression 3D. Analyse le contexte et les données pour fournir des réponses précises et utiles. Sois proactif.`;

        let userPromptWithData = `Ma question est : "${userQuestion}"`;

        // Envoyer le résumé ET les données brutes si nécessaire
        // Le modèle peut utiliser le résumé pour une compréhension rapide et les données brutes pour les détails.
        const stockKeywords = ['filament', 'stock', 'bobine', 'poids', 'matériau', 'marque', 'couleur', 'imprimante 3d']; // Mots-clés étendus
        const questionContainsStockKeyword = stockKeywords.some(k => userQuestion.toLowerCase().includes(k));

        // Détecter les questions sur l'utilisation
        const usageKeywords = ['utilisé', 'consommé', 'usage', 'utilisation'];
        const questionIsAboutUsage = usageKeywords.some(k => userQuestion.toLowerCase().includes(k));

        if (questionIsAboutUsage) {
            const usageAnalysis = analyzeFilamentUsage();
            const usageAnalysisString = Object.entries(usageAnalysis).map(([key, value]) => `${key}: ${value}`).join(', ');
            userPromptWithData = `
            En te basant sur cette analyse d'utilisation : { ${usageAnalysisString} }, réponds à la question de l'utilisateur : '${userQuestion}' et donne-lui un conseil à ce sujet.
            ${contextSummary} // On peut toujours fournir le résumé général
            `;
            // Optionnel: ajouter les données brutes si l'IA pourrait en avoir besoin pour des détails supplémentaires
            // userPromptWithData += `
            // Voici les données détaillées si tu en as besoin :
            // - Filaments: ${JSON.stringify(contextFilaments)}`;

        } else if (questionContainsStockKeyword) {
            userPromptWithData = `
            ${contextSummary}

            Voici les données détaillées si tu en as besoin :
            - Filaments: ${JSON.stringify(contextFilaments)} // Utiliser contextFilaments filtrés
            // Vous pouvez décider d'envoyer spoolsData aussi, ou de l'inclure dans le résumé si pertinent
            // - Types de bobines: ${JSON.stringify(spoolsData)}

            Ma question est : "${userQuestion}"`;
        } else {
            // Pour les questions générales, on n'envoie pas le contexte du stock
            userPromptWithData = `Ma question est : "${userQuestion}"`;
        }

        try {
            // 3. Envoyer la requête à l'API de LM Studio
            const response = await fetch(LM_STUDIO_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: "local-model", // Pas très important car LM Studio utilise le modèle chargé
                    messages: [
                        { role: 'system', content: systemPrompt },
                        // On prend les messages précédents de conversationHistory (sans le dernier message utilisateur qui vient d'être ajouté)
                        ...conversationHistory.slice(0, -1),
                        { role: 'user', content: userPromptWithData } // Envoyer la question actuelle avec les données
                    ],
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                throw new Error(`Erreur réseau ou de l'API: ${response.statusText}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            conversationHistory.push({ role: 'assistant', content: aiResponse });

            // Supprimer le message "L'IA réfléchit..."
            const assistantMessages = chatContainer.getElementsByClassName('assistant-message');
            if (assistantMessages.length > 0) {
                const lastMessage = assistantMessages[assistantMessages.length - 1];
                if (lastMessage.textContent.includes("L'IA réfléchit...")) {
                    chatContainer.removeChild(lastMessage);
                }
            }
            // Ajouter la nouvelle réponse de l'IA
            addMessageToChat(aiResponse, "Assistant");

        } catch (error) {
            console.error("Erreur lors de la communication avec l'IA locale:", error);
            chatContainer.lastChild.innerHTML = `<strong>Assistant:</strong> Désolé, une erreur est survenue. Assurez-vous que le serveur LM Studio est bien démarré.`;
        }
    }

    sendButton.addEventListener('click', queryLocalAI);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            queryLocalAI();
        }
    });

    const initialAssistantMessage = "Bonjour ! Comment puis-je vous aider avec votre stock de filaments aujourd'hui ?";
    addMessageToChat(initialAssistantMessage, "Assistant");
    conversationHistory.push({ role: 'assistant', content: initialAssistantMessage });
});