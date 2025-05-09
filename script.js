document.addEventListener("DOMContentLoaded", () => {
    const clientNameInput = document.getElementById("clientName");
    const address1Input = document.getElementById("address1");
    const address2Input = document.getElementById("address2");
    const appraisalDateInput = document.getElementById("appraisalDate");
    const appraisedValueInput = document.getElementById("appraisedValue");
    const appraiserNameInput = document.getElementById("appraiserName");
    const articlesContainer = document.getElementById("articlesContainer");
    const addArticleBtn = document.getElementById("addArticleBtn");
    const printBtn = document.getElementById("printBtn");
    const downloadBtn = document.getElementById("downloadBtn");

    const formElements = {
        clientName: clientNameInput,
        address1: address1Input,
        address2: address2Input,
        appraisalDate: appraisalDateInput,
        appraisedValue: appraisedValueInput,
        appraiserName: appraiserNameInput,
    };

    // Load data from local storage
    function loadFormData() {
        for (const key in formElements) {
            if (formElements[key]) {
                const savedValue = localStorage.getItem(key);
                if (savedValue) {
                    formElements[key].value = savedValue;
                }
            }
        }
        const savedArticles = JSON.parse(localStorage.getItem("articles"));
        if (savedArticles) {
            savedArticles.forEach(articleData => addArticle(articleData, false));
        }
    }

    // Save data to local storage
    function saveFormData() {
        for (const key in formElements) {
            if (formElements[key]) {
                localStorage.setItem(key, formElements[key].value);
            }
        }
        const articles = [];
        articlesContainer.querySelectorAll(".article").forEach(articleDiv => {
            const articleText = articleDiv.querySelector("textarea").value;
            articles.push({ description: articleText });
        });
        localStorage.setItem("articles", JSON.stringify(articles));
    }

    // Add event listeners to save data on input change
    for (const key in formElements) {
        if (formElements[key]) {
            formElements[key].addEventListener("input", saveFormData);
        }
    }

    // Function to add a new article section
    function addArticle(articleData = { description: "" }, shouldSave = true) {
        const articleId = `article-${Date.now()}`;
        const articleDiv = document.createElement("div");
        articleDiv.classList.add("article");
        articleDiv.id = articleId;

        const descriptionGroup = document.createElement("div");
        descriptionGroup.classList.add("form-group");

        const descriptionLabel = document.createElement("label");
        descriptionLabel.setAttribute("for", `description-${articleId}`);
        descriptionLabel.textContent = "Article Description:";

        const descriptionTextarea = document.createElement("textarea");
        descriptionTextarea.id = `description-${articleId}`;
        descriptionTextarea.name = `description-${articleId}`;
        descriptionTextarea.value = articleData.description;
        descriptionTextarea.addEventListener("input", saveFormData); // Save on edit

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.classList.add("removeArticleBtn");
        removeBtn.textContent = "Remove Article";
        removeBtn.addEventListener("click", () => {
            articleDiv.remove();
            saveFormData(); // Update local storage after removal
        });

        descriptionGroup.appendChild(descriptionLabel);
        descriptionGroup.appendChild(descriptionTextarea);
        articleDiv.appendChild(descriptionGroup);
        articleDiv.appendChild(removeBtn);
        articlesContainer.appendChild(articleDiv);

        if (shouldSave) {
            saveFormData();
        }
    }

    addArticleBtn.addEventListener("click", () => addArticle());

    // Print functionality
    printBtn.addEventListener("click", () => {
        window.print();
    });

    // Get appraisal data for saving
    function getAppraisalData() {
        // Collect form data
        const formData = {};
        for (const key in formElements) {
            if (formElements[key]) {
                formData[key] = formElements[key].value;
            }
        }

        // Collect articles data
        const articles = [];
        articlesContainer.querySelectorAll(".article").forEach(articleDiv => {
            const articleText = articleDiv.querySelector("textarea").value;
            articles.push({ description: articleText });
        });

        // Return complete appraisal data
        return {
            ...formData,
            articles: articles,
            generatedAt: new Date().toISOString()
        };
    }

    // Save appraisal to server
    async function saveAppraisalToServer(appraisalData) {
        try {
            const response = await fetch('/api/appraisals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appraisalData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save appraisal');
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving appraisal:', error);
            throw error;
        }
    }

    // Download functionality
    downloadBtn.addEventListener("click", async () => {
        const clientName = clientNameInput.value.trim().replace(/[^a-zA-Z0-9]/g, "_") || "CLIENTNAME";
        const currentDate = new Date().toISOString().slice(0, 10);
        const fileName = `appraisal_${clientName}_${currentDate}.html`;

        // Create a clone of the printable content
        const printableContent = document.querySelector(".container").cloneNode(true);

        // Remove buttons from the cloned content
        printableContent.querySelectorAll(".action-buttons, #addArticleBtn, .removeArticleBtn").forEach(el => el.remove());

        // Inline styles for inputs for better download appearance
        printableContent.querySelectorAll("input[type=\"text\"], input[type=\"date\"], textarea").forEach(input => {
            input.style.border = "none";
            input.setAttribute("readonly", true); // Make them readonly in the downloaded file
        });

        const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Appraisal</title><link rel="stylesheet" href="style.css"><style>body{margin:20px;} .container{border:1px solid #000 !important; box-shadow:none !important;} input, textarea { background-color: transparent !important; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; } </style></head><body>${printableContent.outerHTML}</body></html>`;

        // Client-side download
        const blob = new Blob([htmlContent], { type: "text/html" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        // Server-side save
        try {
            const appraisalData = getAppraisalData();
            const serverResponse = await saveAppraisalToServer(appraisalData);
            console.log('Appraisal saved to server:', serverResponse);
            alert(`Appraisal downloaded and saved to server. ID: ${serverResponse.id}`);
        } catch (error) {
            console.error('Failed to save appraisal to server:', error);
            alert(`Appraisal downloaded, but could not be saved to server: ${error.message || 'Server connection failed'}`);
        }
    });

    // Initial load
    loadFormData();
    // Add a default article if none exist
    if (articlesContainer.children.length === 0) {
        addArticle({ description: "Insert Description Here:" }, true);
    }
});

