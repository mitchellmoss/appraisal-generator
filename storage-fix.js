// This is a small script to ensure form data is loaded from localStorage
// even if there are errors in other parts of the script

document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing form storage...");
    
    // Only run if localStorage is available
    if (typeof(Storage) === "undefined") {
        console.warn("LocalStorage not available in this browser");
        return;
    }
    
    // Form elements
    const formElements = {
        clientName: document.getElementById("clientName"),
        address1: document.getElementById("address1"),
        address2: document.getElementById("address2"),
        appraisalDate: document.getElementById("appraisalDate"),
        appraisedValue: document.getElementById("appraisedValue"),
        appraiserName: document.getElementById("appraiserName")
    };
    
    // Load data from local storage
    function loadFormData() {
        for (const key in formElements) {
            if (formElements[key]) {
                const savedValue = localStorage.getItem(key);
                if (savedValue) {
                    formElements[key].value = savedValue;
                    console.log(`Loaded ${key}: ${savedValue}`);
                }
            }
        }
        
        // Load articles
        try {
            const savedArticles = JSON.parse(localStorage.getItem("articles"));
            const articlesContainer = document.getElementById("articlesContainer");
            
            if (savedArticles && savedArticles.length > 0 && articlesContainer) {
                // Clear existing articles first
                articlesContainer.innerHTML = "";
                
                // Add each saved article
                savedArticles.forEach(articleData => {
                    addArticle(articleData);
                });
                
                console.log(`Loaded ${savedArticles.length} articles from storage`);
            }
        } catch (e) {
            console.error("Error loading saved articles:", e);
        }
    }
    
    // Save data to local storage
    function saveFormData() {
        for (const key in formElements) {
            if (formElements[key]) {
                localStorage.setItem(key, formElements[key].value);
            }
        }
        
        // Save articles
        const articlesContainer = document.getElementById("articlesContainer");
        if (articlesContainer) {
            const articles = [];
            articlesContainer.querySelectorAll(".article").forEach(articleDiv => {
                const articleText = articleDiv.querySelector("textarea")?.value || "";
                articles.push({ description: articleText });
            });
            localStorage.setItem("articles", JSON.stringify(articles));
        }
    }
    
    // Add a new article element
    function addArticle(articleData = { description: "" }) {
        const articlesContainer = document.getElementById("articlesContainer");
        if (!articlesContainer) return;
        
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
        descriptionTextarea.addEventListener("input", saveFormData);
        
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.classList.add("removeArticleBtn");
        removeBtn.textContent = "Remove Article";
        removeBtn.addEventListener("click", () => {
            articleDiv.remove();
            saveFormData();
        });
        
        descriptionGroup.appendChild(descriptionLabel);
        descriptionGroup.appendChild(descriptionTextarea);
        articleDiv.appendChild(descriptionGroup);
        articleDiv.appendChild(removeBtn);
        articlesContainer.appendChild(articleDiv);
    }
    
    // Add input event listeners to save data when changed
    for (const key in formElements) {
        if (formElements[key]) {
            formElements[key].addEventListener("input", saveFormData);
        }
    }
    
    // Handle the add article button
    const addArticleBtn = document.getElementById("addArticleBtn");
    if (addArticleBtn) {
        addArticleBtn.addEventListener("click", () => {
            addArticle();
            saveFormData();
        });
    }
    
    // Load saved data immediately
    loadFormData();
    
    // If no articles exist, add a default one
    const articlesContainer = document.getElementById("articlesContainer");
    if (articlesContainer && articlesContainer.children.length === 0) {
        addArticle({ description: "Insert Description Here:" });
        saveFormData();
    }
    
    console.log("Form storage initialized");
});